import { createServiceRoleClient, type ReminderRow, type DeadlineWithItem } from './lib/supabase';
import { ResendEmailProvider, type EmailProvider } from './lib/email';
import { TwilioSmsProvider, type SmsProvider } from './lib/sms';
import { computeRetryDecision, DEFAULT_MAX_ATTEMPTS } from './lib/backoff';
import { sendAdminAlert } from './lib/adminAlert';
import { validateSenderConfig } from './lib/senderConfig';
import { addSuppression, isSuppressed } from './lib/suppression';
import { extractSvixHeaders, verifySvixSignature } from './lib/webhookVerify';
import { verifyTwilioSignature } from './lib/twilioWebhookVerify';
import { createUnsubscribeToken, verifyUnsubscribeToken } from './lib/unsubscribe';

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  RESEND_API_KEY: string;
  RESEND_WEBHOOK_SECRET: string;
  REMINDER_FROM_EMAIL: string;
  REPLY_TO_EMAIL: string;
  ADMIN_ALERT_EMAIL: string;
  UNSUBSCRIBE_SECRET: string;
  /** A Worker saját publikus URL-je -- ide mutat az unsubscribe-link a
   *  kiküldött emailekben. Pl. "https://worker.elmentve.hu". */
  WORKER_BASE_URL: string;
  /** A küldő aldomain, amin a REMINDER_FROM_EMAIL-nek kell lennie -- l.
   *  spec 11. rész, senderConfig.ts. Opcionális: ha üres, ez az ellenőrzés
   *  kimarad (pl. fejlesztői/teszt-környezetben). */
  SENDER_DOMAIN?: string;
  /** SMS opcionális -- ha ezek hiányoznak, az SMS-csatorna reminderjei
   *  hibával visszakerülnek retry-ra, ahogy eddig is (l. worker/README.md). */
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_FROM_NUMBER?: string;
  /** Percenkent hany emlekeztetot foglaljon le egy futas. */
  CLAIM_BATCH_SIZE?: string;
}

const CLAIM_BATCH_DEFAULT = 50;
const STUCK_PROCESSING_AFTER = '5 minutes';

export default {
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runReminderSweep(env));
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/webhooks/resend' && request.method === 'POST') {
      return handleResendWebhook(request, env);
    }

    if (url.pathname === '/webhooks/twilio' && request.method === 'POST') {
      return handleTwilioWebhook(request, env);
    }

    if (url.pathname === '/unsubscribe' && request.method === 'GET') {
      return handleUnsubscribe(url, env);
    }

    if (url.pathname === '/healthz') {
      return new Response('ok', { status: 200 });
    }

    return new Response('not found', { status: 404 });
  },
};

async function runReminderSweep(env: Env): Promise<void> {
  const supabase = createServiceRoleClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  let senderConfig;
  try {
    senderConfig = validateSenderConfig({
      fromEmail: env.REMINDER_FROM_EMAIL,
      replyToEmail: env.REPLY_TO_EMAIL,
      expectedFromDomain: env.SENDER_DOMAIN,
    });
  } catch (err) {
    // Konfigurációs hiba -- ne próbáljunk küldeni rossz feladóval, de a
    // hibát jelezzük (ha egyáltalán van kinek: ha maga az admin-cím is
    // hibás, ez csendben elnyelődhet -- ezért ADMIN_ALERT_EMAIL-t itt nem
    // ellenőrizzük szigorúan, hogy legalább a heartbeat-naplóba bekerüljön).
    const message = err instanceof Error ? err.message : String(err);
    await supabase.from('worker_heartbeats').insert({
      claimed_count: 0,
      sent_count: 0,
      failed_count: 0,
      error: `sender config invalid, sweep aborted: ${message}`,
    });
    return;
  }

  const emailProvider: EmailProvider = new ResendEmailProvider(env.RESEND_API_KEY);
  const smsProvider: SmsProvider | null =
    env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN
      ? new TwilioSmsProvider(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN)
      : null;
  const batchSize = Number(env.CLAIM_BATCH_SIZE ?? CLAIM_BATCH_DEFAULT);

  let claimed: ReminderRow[] = [];
  let sweepError: string | null = null;

  try {
    // Elobb szabaditsuk fel a beragadt (worker-osszeomlas miatt processing-ben
    // maradt) sorokat, kulonben orokre esedekes marad, de sose kerul kezelesre.
    await supabase.rpc('reclaim_stuck_processing_reminders', {
      p_stuck_after: STUCK_PROCESSING_AFTER,
    });

    const { data, error } = await supabase.rpc('claim_due_reminders', {
      p_limit: batchSize,
    });
    if (error) throw new Error(`claim_due_reminders: ${error.message}`);
    claimed = (data ?? []) as ReminderRow[];
  } catch (err) {
    sweepError = err instanceof Error ? err.message : String(err);
  }

  let sentCount = 0;
  let failedCount = 0;

  for (const reminder of claimed) {
    try {
      const sent = await processReminder(supabase, emailProvider, smsProvider, env, senderConfig, reminder);
      if (sent) sentCount += 1;
      else failedCount += 1;
    } catch (err) {
      failedCount += 1;
      const message = err instanceof Error ? err.message : String(err);
      await markReminderError(supabase, reminder, message);
    }
  }

  await supabase.from('worker_heartbeats').insert({
    claimed_count: claimed.length,
    sent_count: sentCount,
    failed_count: failedCount,
    error: sweepError,
  });

  if (sweepError) {
    await sendAdminAlert(
      emailProvider,
      env.REMINDER_FROM_EMAIL,
      env.ADMIN_ALERT_EMAIL,
      'Worker sweep hiba',
      sweepError,
    );
  }
}

async function processReminder(
  supabase: ReturnType<typeof createServiceRoleClient>,
  emailProvider: EmailProvider,
  smsProvider: SmsProvider | null,
  env: Env,
  senderConfig: { fromEmail: string; replyToEmail: string },
  reminder: ReminderRow,
): Promise<boolean> {
  if (reminder.channel === 'sms' && !smsProvider) {
    // Twilio nincs konfigurálva ezen a környezeten -- l. worker/README.md.
    // Retry-ra visszatesszük (nem suppression, hanem hiányzó konfiguráció),
    // hogy ha később bekötik a Twilio-t, a régi emlékeztetők is kimenjenek.
    return handleSendFailure(
      supabase,
      emailProvider,
      env,
      reminder,
      reminder.attempt_count + 1,
      'sms provider not configured (TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN missing)',
    );
  }

  const { data: deadline, error: deadlineErr } = await supabase
    .from('deadlines')
    .select('id, due_date, due_time, all_day, timezone, items ( title )')
    .eq('id', reminder.deadline_id)
    .single<DeadlineWithItem>();

  if (deadlineErr || !deadline) {
    await markReminderError(
      supabase,
      reminder,
      `deadline lookup failed: ${deadlineErr?.message ?? 'not found'}`,
    );
    return false;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('notification_email, email_channel_status, phone, sms_channel_status')
    .eq('id', reminder.user_id)
    .single<{
      notification_email: string | null;
      email_channel_status: string;
      phone: string | null;
      sms_channel_status: string;
    }>();

  const title = deadline.items?.title ?? 'Emlékeztető';
  const dueDescription = `${deadline.due_date}${deadline.due_time ? ` ${deadline.due_time}` : ''} (${deadline.timezone})`;

  if (reminder.channel === 'email') {
    const toEmail = profile?.notification_email;
    if (!toEmail || profile?.email_channel_status === 'unreachable') {
      await markReminderError(supabase, reminder, 'recipient unreachable or missing notification_email');
      return false;
    }

    let suppressed = false;
    try {
      suppressed = await isSuppressed(supabase, 'email', toEmail);
    } catch (err) {
      // A suppression-ellenorzes hibaja NE akassza meg a kuldest (l.
      // suppression.ts komment) -- csak logoljuk a hibat a kuldes
      // eredmenyenek reszekent, es probaljunk kuldeni.
      await supabase.from('notification_deliveries').insert({
        reminder_id: reminder.id,
        attempt_number: reminder.attempt_count + 1,
        channel: 'email',
        provider: 'resend',
        provider_message_id: null,
        status: 'failed',
        error_message: `suppression check failed (continuing anyway): ${
          err instanceof Error ? err.message : String(err)
        }`,
      });
    }

    if (suppressed) {
      return markSuppressedAndCancel(supabase, reminder, 'email', 'resend');
    }

    const unsubscribeToken = await createUnsubscribeToken(
      { userId: reminder.user_id, channel: 'email', address: toEmail },
      env.UNSUBSCRIBE_SECRET,
    );
    const unsubscribeUrl = `${env.WORKER_BASE_URL}/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;

    const result = await emailProvider.send({
      to: toEmail,
      from: senderConfig.fromEmail,
      replyTo: senderConfig.replyToEmail,
      subject: `Emlékeztető: ${title}`,
      text:
        `Emlékeztetünk: ${title} — határidő: ${dueDescription}.\n\n` +
        `Leiratkozás az emlékeztetőkről: ${unsubscribeUrl}`,
      html:
        `<p>Emlékeztetünk: <strong>${escapeHtml(title)}</strong></p>` +
        `<p>Határidő: ${escapeHtml(dueDescription)}</p>` +
        `<p style="color:#888;font-size:12px;margin-top:24px;">` +
        `<a href="${unsubscribeUrl}">Leiratkozás az email-emlékeztetőkről</a> · ` +
        `A beállításaidat az appban is módosíthatod.</p>`,
      idempotencyKey: reminder.idempotency_key,
    });

    return finalizeSendAttempt(supabase, emailProvider, env, reminder, 'email', 'resend', result);
  }

  // channel === 'sms' (smsProvider garantáltan nem null, l. fenti korai ág)
  const toPhone = profile?.phone;
  if (!toPhone || profile?.sms_channel_status === 'unreachable') {
    await markReminderError(supabase, reminder, 'recipient unreachable or missing phone');
    return false;
  }

  let smsSuppressed = false;
  try {
    smsSuppressed = await isSuppressed(supabase, 'sms', toPhone);
  } catch {
    // l. fenti email-ágban lévő indoklás -- fail-open.
  }
  if (smsSuppressed) {
    return markSuppressedAndCancel(supabase, reminder, 'sms', 'twilio');
  }

  if (!env.TWILIO_FROM_NUMBER) {
    return handleSendFailure(
      supabase,
      emailProvider,
      env,
      reminder,
      reminder.attempt_count + 1,
      'TWILIO_FROM_NUMBER not configured',
    );
  }

  const result = await smsProvider!.send({
    to: toPhone,
    from: env.TWILIO_FROM_NUMBER,
    body: `Elmentve emlékeztető: ${title} — határidő: ${dueDescription}.`,
    idempotencyKey: reminder.idempotency_key,
  });

  return finalizeSendAttempt(supabase, emailProvider, env, reminder, 'sms', 'twilio', result);
}

async function finalizeSendAttempt(
  supabase: ReturnType<typeof createServiceRoleClient>,
  emailProvider: EmailProvider,
  env: Env,
  reminder: ReminderRow,
  channel: 'email' | 'sms',
  provider: string,
  result: { ok: boolean; providerMessageId: string | null; errorMessage: string | null },
): Promise<boolean> {
  const attemptNumber = reminder.attempt_count + 1;

  await supabase.from('notification_deliveries').insert({
    reminder_id: reminder.id,
    attempt_number: attemptNumber,
    channel,
    provider,
    provider_message_id: result.providerMessageId,
    status: result.ok ? 'sent' : 'failed',
    error_message: result.errorMessage,
  });

  if (result.ok) {
    await supabase
      .from('reminders')
      .update({
        status: 'sent',
        attempt_count: attemptNumber,
        sent_at: new Date().toISOString(),
        last_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reminder.id);
    return true;
  }

  return handleSendFailure(supabase, emailProvider, env, reminder, attemptNumber, result.errorMessage);
}

async function markSuppressedAndCancel(
  supabase: ReturnType<typeof createServiceRoleClient>,
  reminder: ReminderRow,
  channel: 'email' | 'sms',
  provider: string,
): Promise<boolean> {
  await supabase.from('notification_deliveries').insert({
    reminder_id: reminder.id,
    attempt_number: reminder.attempt_count + 1,
    channel,
    provider,
    provider_message_id: null,
    status: 'suppressed',
    error_message: 'recipient is on the suppression list, send skipped',
  });
  await supabase
    .from('reminders')
    .update({
      status: 'cancelled',
      attempt_count: reminder.attempt_count + 1,
      last_error: 'suppressed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', reminder.id);
  // Szándékos, nem hiba -- nincs retry, nincs admin-riasztás.
  return false;
}

async function handleSendFailure(
  supabase: ReturnType<typeof createServiceRoleClient>,
  emailProvider: EmailProvider,
  env: Env,
  reminder: ReminderRow,
  attemptNumber: number,
  errorMessage: string | null,
): Promise<boolean> {
  const decision = computeRetryDecision(
    attemptNumber,
    reminder.max_attempts || DEFAULT_MAX_ATTEMPTS,
    new Date(),
  );

  if (decision.shouldRetry && decision.nextAttemptAt) {
    await supabase
      .from('reminders')
      .update({
        status: 'scheduled',
        attempt_count: attemptNumber,
        scheduled_at: decision.nextAttemptAt.toISOString(),
        next_attempt_at: decision.nextAttemptAt.toISOString(),
        last_error: errorMessage,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reminder.id);
    return false;
  }

  await supabase
    .from('reminders')
    .update({
      status: 'failed',
      attempt_count: attemptNumber,
      last_error: errorMessage,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reminder.id);

  await sendAdminAlert(
    emailProvider,
    env.REMINDER_FROM_EMAIL,
    env.ADMIN_ALERT_EMAIL,
    'Emlékeztető véglegesen sikertelen',
    `reminder_id=${reminder.id} deadline_id=${reminder.deadline_id} attempts=${attemptNumber} error=${errorMessage}`,
  );

  return false;
}

async function markReminderError(
  supabase: ReturnType<typeof createServiceRoleClient>,
  reminder: ReminderRow,
  message: string,
): Promise<void> {
  await supabase
    .from('reminders')
    .update({
      status: 'failed',
      last_error: message,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reminder.id);
}

// ---------------------------------------------------------------------
// Webhookok
// ---------------------------------------------------------------------

async function handleResendWebhook(request: Request, env: Env): Promise<Response> {
  if (!env.RESEND_WEBHOOK_SECRET) {
    return new Response('signature verification not configured', { status: 501 });
  }

  const headers = extractSvixHeaders(request);
  if (!headers) {
    return new Response('missing svix headers', { status: 400 });
  }

  const rawBody = await request.text();
  const verification = await verifySvixSignature(headers, rawBody, env.RESEND_WEBHOOK_SECRET);
  if (!verification.valid) {
    return new Response(`signature invalid: ${verification.reason}`, { status: 401 });
  }

  const payload = JSON.parse(rawBody) as {
    type: string;
    data: { email_id?: string; to?: string[] | string };
  };

  const supabase = createServiceRoleClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  // Idempotencia: a szolgáltató retry-elhet ugyanazzal az eseménnyel.
  const { error: insertEventErr } = await supabase
    .from('webhook_events')
    .insert({ provider: 'resend', provider_event_id: headers.id, event_type: payload.type });
  if (insertEventErr) {
    // Unique constraint ütközés = már feldolgoztuk ezt az eseményt --
    // csendben, sikeresen visszatérünk, NEM dolgozzuk fel újra.
    return new Response('ok (duplicate, already processed)', { status: 200 });
  }

  const status = mapResendEventToStatus(payload.type);
  if (status && payload.data.email_id) {
    await supabase
      .from('notification_deliveries')
      .update({ status })
      .eq('provider_message_id', payload.data.email_id);

    if (status === 'bounced' || status === 'complained') {
      const { data: delivery } = await supabase
        .from('notification_deliveries')
        .select('reminder_id')
        .eq('provider_message_id', payload.data.email_id)
        .single<{ reminder_id: string }>();

      if (delivery) {
        await supabase
          .from('reminders')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('id', delivery.reminder_id);
      }

      const recipient = Array.isArray(payload.data.to) ? payload.data.to[0] : payload.data.to;
      if (recipient) {
        await addSuppression(
          supabase,
          'email',
          recipient,
          status === 'bounced' ? 'bounced' : 'complained',
          'webhook',
          `resend event ${payload.type}, svix-id ${headers.id}`,
        );
      }
    }
  }

  return new Response('ok', { status: 200 });
}

function mapResendEventToStatus(eventType: string): string | null {
  switch (eventType) {
    case 'email.delivered':
      return 'delivered';
    case 'email.bounced':
      return 'bounced';
    case 'email.complained':
      return 'complained';
    default:
      return null;
  }
}

/** Twilio státusz-callback: `application/x-www-form-urlencoded` törzs, a
 *  saját (nem Svix) HMAC-SHA1 sémájával aláírva -- l. twilioWebhookVerify.ts. */
async function handleTwilioWebhook(request: Request, env: Env): Promise<Response> {
  if (!env.TWILIO_AUTH_TOKEN) {
    return new Response('twilio not configured', { status: 501 });
  }

  const rawBody = await request.text();
  const params = Object.fromEntries(new URLSearchParams(rawBody).entries());
  const signatureHeader = request.headers.get('X-Twilio-Signature');
  const fullUrl = new URL(request.url).toString();

  const verification = await verifyTwilioSignature(fullUrl, params, signatureHeader, env.TWILIO_AUTH_TOKEN);
  if (!verification.valid) {
    return new Response(`signature invalid: ${verification.reason}`, { status: 401 });
  }

  const messageSid = params.MessageSid;
  const messageStatus = params.MessageStatus; // queued|sent|delivered|undelivered|failed
  if (!messageSid || !messageStatus) {
    return new Response('missing MessageSid/MessageStatus', { status: 400 });
  }

  const supabase = createServiceRoleClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  const { error: insertEventErr } = await supabase
    .from('webhook_events')
    .insert({ provider: 'twilio', provider_event_id: `${messageSid}:${messageStatus}`, event_type: messageStatus });
  if (insertEventErr) {
    return new Response('ok (duplicate, already processed)', { status: 200 });
  }

  const status = mapTwilioStatusToDeliveryStatus(messageStatus);
  if (status) {
    await supabase.from('notification_deliveries').update({ status }).eq('provider_message_id', messageSid);
  }

  // Twilio a tartósan érvénytelen számot 'undelivered'/'failed' státusszal +
  // hibakóddal jelzi (pl. 21211 érvénytelen szám, 30003 elérhetetlen
  // eszköz, 30005 ismeretlen cél). Ezeknél suppression-be tesszük a számot
  // -- konzervatívan, minden undelivered/failed esetén, mert az SMS-nél
  // (ellentétben az email soft/hard bounce megkülönböztetésével) a
  // szolgáltató nem ad finomabb jelzést anélkül hogy a hibakód-listát
  // karban kellene tartanunk.
  if ((messageStatus === 'undelivered' || messageStatus === 'failed') && params.To) {
    const { data: delivery } = await supabase
      .from('notification_deliveries')
      .select('reminder_id')
      .eq('provider_message_id', messageSid)
      .single<{ reminder_id: string }>();
    if (delivery) {
      await supabase
        .from('reminders')
        .update({ status: 'bounced', updated_at: new Date().toISOString() })
        .eq('id', delivery.reminder_id);
    }
    await addSuppression(
      supabase,
      'sms',
      params.To,
      'bounced',
      'webhook',
      `twilio status ${messageStatus}, error code ${params.ErrorCode ?? 'n/a'}`,
    );
  }

  return new Response('ok', { status: 200 });
}

function mapTwilioStatusToDeliveryStatus(status: string): string | null {
  switch (status) {
    case 'delivered':
      return 'delivered';
    case 'undelivered':
    case 'failed':
      return 'bounced';
    default:
      return null;
  }
}

// ---------------------------------------------------------------------
// Leiratkozás
// ---------------------------------------------------------------------

async function handleUnsubscribe(url: URL, env: Env): Promise<Response> {
  const token = url.searchParams.get('token');
  if (!token) {
    return new Response('missing token', { status: 400 });
  }

  const verification = await verifyUnsubscribeToken(token, env.UNSUBSCRIBE_SECRET);
  if (!verification.valid) {
    return new Response(`Ez a leiratkozó link már nem érvényes (${verification.reason}).`, {
      status: 400,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const supabase = createServiceRoleClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  await addSuppression(
    supabase,
    verification.payload.channel,
    verification.payload.address,
    'unsubscribed',
    'unsubscribe_link',
    `user_id ${verification.payload.userId}`,
  );

  return new Response(
    'Sikeresen leiratkoztál az emlékeztetőkről. A beállításaidat bármikor módosíthatod az Elmentve appban.',
    { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
}

function escapeHtml(value: string): string {
  return value.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c]!);
}
