import { describe, expect, it, vi } from 'vitest';
import { addSuppression, isSuppressed, normalizeAddress } from '../src/lib/suppression';

describe('normalizeAddress', () => {
  it('lowercases and trims email addresses', () => {
    expect(normalizeAddress('email', '  Foo@Bar.COM  ')).toBe('foo@bar.com');
  });

  it('only trims phone numbers (assumes caller already E.164-normalized)', () => {
    expect(normalizeAddress('sms', '  +36301234567  ')).toBe('+36301234567');
  });
});

describe('isSuppressed', () => {
  it('returns true when the RPC reports a match', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: true, error: null });
    const supabase = { rpc } as any;
    const result = await isSuppressed(supabase, 'email', 'Foo@Bar.com');
    expect(result).toBe(true);
    expect(rpc).toHaveBeenCalledWith('is_suppressed', { p_channel: 'email', p_address: 'foo@bar.com' });
  });

  it('returns false when the RPC reports no match', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: false, error: null });
    const supabase = { rpc } as any;
    expect(await isSuppressed(supabase, 'email', 'clean@example.com')).toBe(false);
  });

  it('throws (fail-open at the call site) when the RPC itself errors', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: 'connection refused' } });
    const supabase = { rpc } as any;
    await expect(isSuppressed(supabase, 'email', 'foo@bar.com')).rejects.toThrow('connection refused');
  });
});

describe('addSuppression', () => {
  it('upserts the normalized address and marks the matching profile unreachable', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq });
    const from = vi.fn((table: string) => {
      if (table === 'suppressions') return { upsert };
      if (table === 'profiles') return { update };
      throw new Error(`unexpected table ${table}`);
    });
    const supabase = { from } as any;

    await addSuppression(supabase, 'email', 'Foo@Bar.com', 'bounced', 'webhook', 'hard bounce');

    expect(upsert).toHaveBeenCalledWith(
      { channel: 'email', address: 'foo@bar.com', reason: 'bounced', source: 'webhook', detail: 'hard bounce' },
      { onConflict: 'channel,address', ignoreDuplicates: false },
    );
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ email_channel_status: 'unreachable' }),
    );
    expect(eq).toHaveBeenCalledWith('notification_email', 'foo@bar.com');
  });

  it('throws when the upsert fails', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: { message: 'unique violation' } });
    const from = vi.fn().mockReturnValue({ upsert });
    const supabase = { from } as any;
    await expect(addSuppression(supabase, 'email', 'foo@bar.com', 'manual', 'admin')).rejects.toThrow(
      'unique violation',
    );
  });
});
