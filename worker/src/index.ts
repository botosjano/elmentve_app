import { createServiceRoleClient, type ReminderRow, type DeadlineWithItem } from './lib/supabase';
import { ResendEmailProvider, type EmailProvider } from './lib/email';
import { computeRetryDecision, DEFAULT_MAX_ATTEMPTS } from './lib/backoff';
import { sendAdminAlert } from './lib/adminAlert';

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  RESEND_API_KEY: string;
  RESEND_WEBHOOK_SECRET: string;
  REMINDER_FROM_EMAIL: string;
  ADMIN_ALERT_EMAIL: string;
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

    if (url.pathname === '/healthz') {
      return new Response('ok', { status: 200 });
    }

    return new Response('not found', { status: 404 });
  },
};

async function runReminderSweep(env: Env): Promise<void> {
  const supabase = createServiceRoleClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const emailProvider: EmailProvider = new ResendEmailProvider(env.RESEND_API_KEY);
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
      const sent = await processReminder(supabase, emailProvider, env, reminder);
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
  env: Env,
  reminder: ReminderRow,
): Promise<boolean> {
  if (reminder.channel !== 'email') {
    // SMS csatorna kesobbi karyta -- egyelore hibaval visszateszi retry-re,
    // hogy ne vesszen el, de ne is probalkozzon vegtelenul.
    await markReminderError(supabase, reminder, 'sms channel not implemented yet');
    return false;
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
    .select('notification_email, email_channel_status')
    .eq('id', reminder.user_id)
    .single<{ notification_email: string | null; email_channel_status: string }>();

  const toEmail = profile?.notification_email;
  if (!toEmail || profile?.email_channel_status === 'unreachable') {
    await markReminderError(
      supabase,
      reminder,
      'recipient unreachable or missing notification_email',
    );
    return false;
  }

  const title = deadline.items?.title ?? 'Emlékeztető';
  const result = await emailProvider.send({
    to: toEmail,
    from: env.REMINDER_FROM_EMAIL,
    subject: `Emlékeztető: ${title}`,
    text: `Emlékeztetünk: ${title} — határidő: ${deadline.due_date}${
      deadline.due_time ? ` ${deadline.due_time}` : ''
    } (${deadline.timezone}).`,
    html: `<p>Emlékeztetünk: <strong>${title}</strong></p><p>Határidő: ${deadline.due_date}${
      deadline.due_time ? ` ${deadline.due_time}` : ''
    } (${deadline.timezone})</p>`,
    idempotencyKey: reminder.idempotency_key,
  });

  const attemptNumber = reminder.attempt_count + 1;

  await supabase.from('notification_deliveries').insert({
    reminder_id: reminder.id,
    attempt_number: attemptNumber,
    channel: reminder.channel,
    provider: 'resend',
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

async function handleResendWebhook(request: Request, env: Env): Promise<Response> {
  // Resend a "svix-signature" fejlecben kuldi az alairast; a teljes
  // ellenorzeshez svix konyvtar kellene, ez itt a hely ahol azt be kell
  // kotni deploy elott (lasd worker/README.md). Alairas nelkul NEM szabad
  // elesben elfogadni a webhookot.
  const signature = request.headers.get('svix-signature');
  if (!signature || !env.RESEND_WEBHOOK_SECRET) {
    return new Response('signature verification not configured', { status: 501 });
  }

  const payload = (await request.json()) as {
    type: string;
    data: { email_id?: string };
  };

  const supabase = createServiceRoleClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const status = mapResendEventToStatus(payload.type);
  if (status && payload.data.email_id) {
    await supabase
      .from('notification_deliveries')
      .update({ status })
      .eq('provider_message_id', payload.data.email_id);

    if (status === 'bounced') {
      const { data: delivery } = await supabase
        .from('notification_deliveries')
        .select('reminder_id')
        .eq('provider_message_id', payload.data.email_id)
        .single<{ reminder_id: string }>();
      if (delivery) {
        await supabase
          .from('reminders')
          .update({ status: 'bounced', updated_at: new Date().toISOString() })
          .eq('id', delivery.reminder_id);
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
