import { describe, expect, it } from 'vitest';
import { isWithinQuietHours, minutesUntilQuietWindowEnds } from '../src/lib/quietHours';

const DEFAULT_WINDOW = { quietStart: '21:00', quietEnd: '08:00' };

function minutes(hh: number, mm: number) {
  return hh * 60 + mm;
}

describe('isWithinQuietHours (athuzodik ejfelen, 21:00-08:00)', () => {
  it('csendes idoben van 23:00-kor', () => {
    expect(isWithinQuietHours(minutes(23, 0), DEFAULT_WINDOW)).toBe(true);
  });

  it('csendes idoben van 03:00-kor', () => {
    expect(isWithinQuietHours(minutes(3, 0), DEFAULT_WINDOW)).toBe(true);
  });

  it('nincs csendes idoben 08:00-kor (hatar, kizarolagos)', () => {
    expect(isWithinQuietHours(minutes(8, 0), DEFAULT_WINDOW)).toBe(false);
  });

  it('csendes idoben van 20:59-kor NEM, csendes 21:00-tol', () => {
    expect(isWithinQuietHours(minutes(20, 59), DEFAULT_WINDOW)).toBe(false);
    expect(isWithinQuietHours(minutes(21, 0), DEFAULT_WINDOW)).toBe(true);
  });

  it('delben nincs csendes idoben', () => {
    expect(isWithinQuietHours(minutes(12, 0), DEFAULT_WINDOW)).toBe(false);
  });

  it('nincs csendes ablak, ha start === end', () => {
    expect(isWithinQuietHours(minutes(23, 0), { quietStart: '10:00', quietEnd: '10:00' })).toBe(
      false,
    );
  });
});

describe('minutesUntilQuietWindowEnds', () => {
  it('0-t ad, ha nem csendes idoben van', () => {
    expect(minutesUntilQuietWindowEnds(minutes(12, 0), DEFAULT_WINDOW)).toBe(0);
  });

  it('ejfel utan (03:00) az aznapi 08:00-ig szamol', () => {
    expect(minutesUntilQuietWindowEnds(minutes(3, 0), DEFAULT_WINDOW)).toBe(5 * 60);
  });

  it('ejfel elott (23:00) masnap 08:00-ig szamol', () => {
    // 23:00 -> 24:00 (60 perc) + 08:00 (480 perc) = 540 perc
    expect(minutesUntilQuietWindowEnds(minutes(23, 0), DEFAULT_WINDOW)).toBe(540);
  });
});
