// "Ellenőrzött feladó és Reply-To cím" -- spec 11. rész, kötelező pont
// éles indulás előtt. Ez a modul NEM DNS-t ellenőriz (arra l.
// scripts/verify-dns.mjs) -- csak azt, hogy a Worker konfigurációja
// (env-változók) egyáltalán tartalmaz-e helyesnek tűnő, a küldő
// aldomainre mutató címeket, mielőtt a Worker élesben elkezdene küldeni.
// Célja: egy elgépelt vagy üresen hagyott FROM/REPLY-TO env-változó ne
// derüljön csak az első sikertelen kézbesítésnél, hanem induláskor,
// hangosan bukjon.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface SenderConfig {
  fromEmail: string;
  replyToEmail: string;
  /** A várt küldő-aldomain, pl. "ertesites.elmentve.hu" -- ha meg van adva,
   *  a fromEmail domain-részének erre kell végződnie. */
  expectedFromDomain?: string;
}

export function validateSenderConfig(config: {
  fromEmail: string | undefined;
  replyToEmail: string | undefined;
  expectedFromDomain?: string;
}): SenderConfig {
  const problems: string[] = [];

  if (!config.fromEmail || !EMAIL_PATTERN.test(config.fromEmail)) {
    problems.push(`REMINDER_FROM_EMAIL hiányzik vagy nem tűnik érvényes email-címnek: "${config.fromEmail}"`);
  }
  if (!config.replyToEmail || !EMAIL_PATTERN.test(config.replyToEmail)) {
    problems.push(`REPLY_TO_EMAIL hiányzik vagy nem tűnik érvényes email-címnek: "${config.replyToEmail}"`);
  }
  if (
    config.expectedFromDomain &&
    config.fromEmail &&
    !config.fromEmail.toLowerCase().endsWith(`@${config.expectedFromDomain.toLowerCase()}`)
  ) {
    problems.push(
      `REMINDER_FROM_EMAIL ("${config.fromEmail}") nem a várt küldő-aldomainen van (${config.expectedFromDomain}) -- ` +
        'a spec 11. része szerint a kézbesítési emlékeztetőknek külön aldomaint kell használniuk.',
    );
  }

  if (problems.length > 0) {
    throw new Error(`Sender-konfiguráció hibás:\n${problems.map((p) => `- ${p}`).join('\n')}`);
  }

  return {
    fromEmail: config.fromEmail!,
    replyToEmail: config.replyToEmail!,
    expectedFromDomain: config.expectedFromDomain,
  };
}
