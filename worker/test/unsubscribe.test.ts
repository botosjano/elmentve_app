import { describe, expect, it } from 'vitest';
import { createUnsubscribeToken, verifyUnsubscribeToken } from '../src/lib/unsubscribe';

const SECRET = 'test-unsubscribe-secret';

describe('unsubscribe token round-trip', () => {
  const now = new Date('2026-08-18T10:00:00Z');
  const payload = { userId: 'user-123', channel: 'email' as const, address: 'foo@bar.com' };

  it('creates a token that verifies successfully', async () => {
    const token = await createUnsubscribeToken(payload, SECRET, now);
    const result = await verifyUnsubscribeToken(token, SECRET, now);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.payload.userId).toBe('user-123');
      expect(result.payload.channel).toBe('email');
      expect(result.payload.address).toBe('foo@bar.com');
    }
  });

  it('rejects a token verified with the wrong secret', async () => {
    const token = await createUnsubscribeToken(payload, SECRET, now);
    const result = await verifyUnsubscribeToken(token, 'a-different-secret', now);
    expect(result.valid).toBe(false);
  });

  it('rejects a tampered payload (address swapped after signing)', async () => {
    const tokenForOther = await createUnsubscribeToken({ ...payload, address: 'attacker@evil.com' }, SECRET, now);
    const tokenForVictim = await createUnsubscribeToken(payload, SECRET, now);
    // Az "attacker" tokenjének payload-részét ráültetjük a "victim" tokenjének
    // aláírására -- ha az ellenőrzés csak a payloadot nézné az aláírás nélkül,
    // ez átmenne. A valós védelem: a signature a payload tartalmára számol,
    // tehát az összefésült token aláírás-eltéréssel bukik.
    const [attackerPayload] = tokenForOther.split('.');
    const [, victimSignature] = tokenForVictim.split('.');
    const frankensteinToken = `${attackerPayload}.${victimSignature}`;
    const result = await verifyUnsubscribeToken(frankensteinToken, SECRET, now);
    expect(result.valid).toBe(false);
  });

  it('rejects an expired token', async () => {
    const token = await createUnsubscribeToken(payload, SECRET, now, 60); // 60s TTL
    const later = new Date(now.getTime() + 120_000); // 2 perccel később
    const result = await verifyUnsubscribeToken(token, SECRET, later);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toContain('expired');
  });

  it('rejects a malformed token', async () => {
    const result = await verifyUnsubscribeToken('not-a-valid-token', SECRET, now);
    expect(result.valid).toBe(false);
  });

  it('produces different tokens for different addresses', async () => {
    const tokenA = await createUnsubscribeToken(payload, SECRET, now);
    const tokenB = await createUnsubscribeToken({ ...payload, address: 'other@bar.com' }, SECRET, now);
    expect(tokenA).not.toBe(tokenB);
  });
});
