// Retry-utemezes vegleges hiba utan.
//
// A spec (docs/elmentve-mvp-koncepcio.md 7. resz) "korlatozott, fokozatos
// ujraprobalast" ir elo, majd a vegleg hibas kuldesnel adminriasztast.
// A percenkenti cronhoz igazodo, exponencialisan novekvo kesleltetes:
// 5 perc, 15 perc, 1 ora, 6 ora -- ezutan (5. probalkozas) vegleges hiba.

export const RETRY_DELAYS_MINUTES = [5, 15, 60, 360] as const;

export const DEFAULT_MAX_ATTEMPTS = RETRY_DELAYS_MINUTES.length + 1;

export interface RetryDecision {
  shouldRetry: boolean;
  nextAttemptAt: Date | null;
}

/**
 * attemptCount: a MOST lezajlott (sikertelen) probalkozas sorszama (1-tol).
 * maxAttempts: hany probalkozas utan adjuk fel vegleg.
 */
export function computeRetryDecision(
  attemptCount: number,
  maxAttempts: number,
  now: Date,
): RetryDecision {
  if (attemptCount >= maxAttempts) {
    return { shouldRetry: false, nextAttemptAt: null };
  }
  const delayMinutes =
    RETRY_DELAYS_MINUTES[attemptCount - 1] ??
    RETRY_DELAYS_MINUTES[RETRY_DELAYS_MINUTES.length - 1];
  const nextAttemptAt = new Date(now.getTime() + delayMinutes * 60_000);
  return { shouldRetry: true, nextAttemptAt };
}
