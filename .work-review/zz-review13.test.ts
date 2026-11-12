// Review scratch (Jancsi, PR #13) -- NOT part of the PR. Behaviour of index.ts with a fake Supabase client and fetch.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Call = { table: string; op: string; payload?: unknown; filters: [string, unknown][] };
const calls: Call[] = [];
let tables: Record<string, unknown> = {};
let claimRows: unknown[] = [];

function builder(table: string) {
  const call: Call = { table, op: 'select', filters: [] };
  const b: any = {
    select() { return b; },
    insert(p: unknown) { call.op = 'insert'; call.payload = p; calls.push(call); return Promise.resolve({ data: null, error: null }); },
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
    rpc: (name: string) => Promise.resolve({ data: name === 'claim_due_reminders' ? claimRows : 1, error: null }),
  }),
}));

const env = {
  SUPABASE_URL: 'http://x', SUPABASE_SERVICE_ROLE_KEY: 'k', RESEND_API_KEY: 'r', RESEND_WEBHOOK_SECRET: 'whsec_x',
  REMINDER_FROM_EMAIL: 'from@x', ADMIN_ALERT_EMAIL: 'admin@x',
};
const reminder = {
  id: 'r1', deadline_id: 'd1', user_id: 'u1', channel: 'email', scheduled_at: '2026-11-10T01:00:00Z', status: 'processing',
  idempotency_key: 'd1:email:1', attempt_count: 0, max_attempts: 5, next_attempt_at: null, last_error: null,
};

async function sweep() {
  const mod = (await import('../src/index')).default;
  let p: Promise<unknown> = Promise.resolve();
  await mod.scheduled({} as any, env as any, { waitUntil: (x: Promise<unknown>) => { p = x; } } as any);
  await p;
}
const reminderUpdates = () => calls.filter((c) => c.table === 'reminders' && c.op === 'update').map((c) => c.payload as any);

beforeEach(() => {
  calls.length = 0;
  claimRows = [reminder];
  tables = {
    deadlines: { id: 'd1', due_date: '2026-11-12', due_time: null, all_day: true, timezone: 'Europe/Budapest', items: { title: 'Biztosítás' } },
    profiles: { notification_email: 'user@x', email_channel_status: 'active', timezone: 'Europe/Budapest', quiet_hours_start: '21:00', quiet_hours_end: '08:00' },
  };
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('review #13', () => {
  it('W1 webhook: a forged svix-signature is accepted and marks the reminder bounced', async () => {
    tables.notification_deliveries = { reminder_id: 'r1' };
    const mod = (await import('../src/index')).default;
    const res = await mod.fetch(new Request('http://w/webhooks/resend', {
      method: 'POST', headers: { 'svix-signature': 'v1,forged' },
      body: JSON.stringify({ type: 'email.bounced', data: { email_id: 'em1' } }),
    }), env as any);
    expect(res.status).toBe(200);
    expect(reminderUpdates()).toContainEqual(expect.objectContaining({ status: 'bounced' }));
  });

  it('N1 network error from fetch: final failed, no retry, no admin alert, no delivery row', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('fetch failed'));
    vi.stubGlobal('fetch', fetchMock);
    await sweep();
    expect(reminderUpdates()).toEqual([expect.objectContaining({ status: 'failed', last_error: 'fetch failed' })]);
    expect(reminderUpdates().some((u) => u.status === 'scheduled')).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1); // the reminder only, no admin alert
    expect(calls.some((c) => c.table === 'notification_deliveries')).toBe(false);
  });

  it('Q1 quiet hours: at 02:00 Budapest (window 21:00-08:00) the email still goes out', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-10T01:00:00Z')); // 02:00 CET
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'em1' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await sweep();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(reminderUpdates()).toContainEqual(expect.objectContaining({ status: 'sent' }));
  });

  it('S1 sms: final failed although the comment says it goes back to retry', async () => {
    claimRows = [{ ...reminder, channel: 'sms' }];
    vi.stubGlobal('fetch', vi.fn());
    await sweep();
    expect(reminderUpdates()).toEqual([expect.objectContaining({ status: 'failed' })]);
  });

  it('R1 resend 500: retry moves scheduled_at (the generated idempotency key changes with it)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('boom', { status: 500 })));
    await sweep();
    const u = reminderUpdates()[0];
    expect(u.status).toBe('scheduled');
    expect(u.scheduled_at).not.toBe(reminder.scheduled_at);
  });
});
