import { describe, expect, it } from 'vitest';
import { computeRetryDecision, DEFAULT_MAX_ATTEMPTS, RETRY_DELAYS_MINUTES } from '../src/lib/backoff';

describe('computeRetryDecision', () => {
  const now = new Date('2026-08-17T10:00:00Z');

  it('retries with the first backoff delay after attempt 1', () => {
    const decision = computeRetryDecision(1, DEFAULT_MAX_ATTEMPTS, now);
    expect(decision.shouldRetry).toBe(true);
    expect(decision.nextAttemptAt?.toISOString()).toBe(
      new Date(now.getTime() + RETRY_DELAYS_MINUTES[0] * 60_000).toISOString(),
    );
  });

  it('escalates the delay on later attempts', () => {
    const d2 = computeRetryDecision(2, DEFAULT_MAX_ATTEMPTS, now);
    const d3 = computeRetryDecision(3, DEFAULT_MAX_ATTEMPTS, now);
    expect(d2.nextAttemptAt!.getTime()).toBeLessThan(d3.nextAttemptAt!.getTime());
  });

  it('gives up after max attempts', () => {
    const decision = computeRetryDecision(DEFAULT_MAX_ATTEMPTS, DEFAULT_MAX_ATTEMPTS, now);
    expect(decision.shouldRetry).toBe(false);
    expect(decision.nextAttemptAt).toBeNull();
  });

  it('never retries past max attempts even if called again', () => {
    const decision = computeRetryDecision(DEFAULT_MAX_ATTEMPTS + 1, DEFAULT_MAX_ATTEMPTS, now);
    expect(decision.shouldRetry).toBe(false);
  });
});
