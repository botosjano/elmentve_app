import { describe, expect, it } from 'vitest';
import { validateSenderConfig } from '../src/lib/senderConfig';

describe('validateSenderConfig', () => {
  it('passes with well-formed addresses and no domain constraint', () => {
    const config = validateSenderConfig({
      fromEmail: 'emlekezteto@ertesites.elmentve.hu',
      replyToEmail: 'support@elmentve.hu',
    });
    expect(config.fromEmail).toBe('emlekezteto@ertesites.elmentve.hu');
  });

  it('passes when fromEmail matches the expected sending subdomain', () => {
    expect(() =>
      validateSenderConfig({
        fromEmail: 'emlekezteto@ertesites.elmentve.hu',
        replyToEmail: 'support@elmentve.hu',
        expectedFromDomain: 'ertesites.elmentve.hu',
      }),
    ).not.toThrow();
  });

  it('throws when fromEmail is missing', () => {
    expect(() => validateSenderConfig({ fromEmail: undefined, replyToEmail: 'a@b.hu' })).toThrow(
      /REMINDER_FROM_EMAIL/,
    );
  });

  it('throws when fromEmail is not a valid email shape', () => {
    expect(() => validateSenderConfig({ fromEmail: 'not-an-email', replyToEmail: 'a@b.hu' })).toThrow();
  });

  it('throws when replyToEmail is missing', () => {
    expect(() => validateSenderConfig({ fromEmail: 'a@b.hu', replyToEmail: undefined })).toThrow(/REPLY_TO_EMAIL/);
  });

  it('throws when fromEmail is on the wrong domain', () => {
    expect(() =>
      validateSenderConfig({
        fromEmail: 'emlekezteto@gmail.com',
        replyToEmail: 'support@elmentve.hu',
        expectedFromDomain: 'ertesites.elmentve.hu',
      }),
    ).toThrow(/küldő-aldomain/);
  });

  it('reports multiple problems at once', () => {
    try {
      validateSenderConfig({ fromEmail: undefined, replyToEmail: undefined });
      expect.fail('should have thrown');
    } catch (err) {
      const message = (err as Error).message;
      expect(message).toContain('REMINDER_FROM_EMAIL');
      expect(message).toContain('REPLY_TO_EMAIL');
    }
  });
});
