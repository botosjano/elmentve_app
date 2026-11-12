// Review scratch (Jancsi, PR #15) -- NOT part of the PR. index.ts with a fake Supabase client and fetch.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Call = { table: string; op: string; payload?: unknown; filters: [string, unknown][] };
const calls: Call[] = [];
let tables: Record<string, unknown> = {};
let claimRows: unknown[] = [];
let insertErrors: Record<string, Array<{ message: string } | null>> = {};
let upsertError: { message: string } | null = null;

function builder(table: string) {
  const call: Call = { table, op: 'select', filters: [] };
  const b: any = {
    select() { return b; },
    insert(p: unknown) {
      call.op = 'insert'; call.payload = p; calls.push(call);
      const error = insertErrors[table]?.shift() ?? null;
      return Promise.resolve({ data: null, error });
    },
    upsert(p: unknown) { call.op = 'upsert'; call.payload = p; calls.push(call); return Promise.resolve({ data: null, error: upsertError }); },
    update(p: unknown) { call.op = 'update'; call.payload = p; calls.push(call); return b; },
    eq(k: string, v: unknown) { call.filters.push([k, v]); return b; },
    single() { return Promise.resolve({ data: tables[table] ?? null, error: null }); },
    then(res: any, rej: any) { return Promise.resolve({ data: null, error: null }).then(res, rej); },
  };
  return b;
}

vi.mock('../src/lib/supabase', () => ({
  createServiceRoleClient: () => ({
    from: (t: string) => builder(t),
    rpc: (name: string) => Promise.resolve({ data: name === 'claim_due_reminders' ? claimRows : name === 'is_suppressed' ? false : 1, error: null }),
  }),
}));

const SECRET_B64 = btoa('review-secret-0123456789abcdef');
const env = {
  SUPABASE_URL: 'http://x', SUPABASE_SERVICE_ROLE_KEY: 'k', RESEND_API_KEY: 'r', RESEND_WEBHOOK_SECRET: `whsec_${SECRET_B64}`,
  REMINDER_FROM_EMAIL: 'emlekezteto@ertesites.elmentve.hu', REPLY_TO_EMAIL: 'hello@elmentve.hu', ADMIN_ALERT_EMAIL: 'admin@elmentve.hu',
  UNSUBSCRIBE_SECRET: 'u-secret', WORKER_BASE_URL: 'https://w.example',
};
const reminder = {
  id: 'r1', deadline_id: 'd1', user_id: 'u1', channel: 'email', scheduled_at: '2026-11-10T01:00:00Z', status: 'processing',
  idempotency_key: 'd1:email:1', attempt_count: 0, max_attempts: 5, next_attempt_at: null, last_error: null,
};

async function signed(body: string, id = 'msg_1') {
  const ts = String(Math.floor(Date.now() / 1000));
  const keyBytes = Uint8Array.from(atob(SECRET_B64), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${id}.${ts}.${body}`)));
  return { 'svix-id': id, 'svix-timestamp': ts, 'svix-signature': `v1,${btoa(String.fromCharCode(...sig))}` };
}
async function hook(headers: Record<string, string>, body: string) {
  const mod = (await import('../src/index')).default;
  return mod.fetch(new Request('http://w/webhooks/resend', { method: 'POST', headers, body }), env as any);
}
async function sweep() {
  const mod = (await import('../src/index')).default;
  let p: Promise<unknown> = Promise.resolve();
  await mod.scheduled({} as any, env as any, { waitUntil: (x: Promise<unknown>) => { p = x; } } as any);
  await p;
}
const reminderUpdates = () => calls.filter((c) => c.table === 'reminders' && c.op === 'update').map((c) => c.payload as any);
const bounceBody = JSON.stringify({ type: 'email.bounced', data: { email_id: 'em1', to: ['user@x.hu'] } });

beforeEach(() => {
  calls.length = 0; insertErrors = {}; upsertError = null; claimRows = [reminder];
  tables = {
    deadlines: { id: 'd1', due_date: '2026-11-12', due_time: null, all_day: true, timezone: 'Europe/Budapest', items: { title: 'Biztosítás' } },
    profiles: { notification_email: 'user@x.hu', email_channel_status: 'active' },
    notification_deliveries: { reminder_id: 'r1' },
  };
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('review #15', () => {
  it('W1 forged signature is now refused (401), a valid one accepted (positive control)', async () => {
    const forged = await hook({ 'svix-id': 'msg_1', 'svix-timestamp': String(Math.floor(Date.now() / 1000)), 'svix-signature': 'v1,forged' }, bounceBody);
    expect(forged.status).toBe(401);
    const ok = await hook(await signed(bounceBody), bounceBody);
    expect(ok.status).toBe(200);
    expect(calls.some((c) => c.table === 'suppressions' && c.op === 'upsert')).toBe(true);
  });

  it('I1 processing fails after the event row: the provider retry is swallowed as duplicate, suppression never stored', async () => {
    upsertError = { message: 'connection reset' };
    insertErrors.webhook_events = [null, { message: 'duplicate key value violates unique constraint' }];
    const first = await hook(await signed(bounceBody), bounceBody).catch((e) => e);
    expect(first instanceof Error || (first as Response).status >= 500).toBe(true);
    upsertError = null;
    calls.length = 0;
    const retry = await hook(await signed(bounceBody), bounceBody);
    expect(retry.status).toBe(200);
    expect(await retry.text()).toContain('duplicate');
    expect(calls.some((c) => c.table === 'suppressions')).toBe(false);
  });

  it('I2 any webhook_events insert error (not a duplicate) answers 200 and drops the event', async () => {
    insertErrors.webhook_events = [{ message: 'canceling statement due to statement timeout' }];
    const res = await hook(await signed(bounceBody), bounceBody);
    expect(res.status).toBe(200);
    expect(calls.some((c) => c.table === 'suppressions')).toBe(false);
  });

  it('N1 network error from fetch: still final failed, no retry, no admin alert', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('fetch failed'));
    vi.stubGlobal('fetch', fetchMock);
    await sweep();
    expect(reminderUpdates()).toEqual([expect.objectContaining({ status: 'failed' })]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('Q1 quiet hours: still not checked, 02:00 Budapest email goes out', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-10T01:00:00Z'));
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'em1' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await sweep();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
