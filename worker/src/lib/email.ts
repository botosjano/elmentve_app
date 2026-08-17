// Email-szolgaltato-fuggetlen interfesz. A spec (11. resz) meg nem dontotte
// el vegleg a szolgaltatot, csak a kovetelmenyeket (SPF/DKIM/DMARC, kulon
// aldomain, bounce/complaint webhook). Resend-adapter van bedratozva
// alapertelmezesnek (egyszeru API, natív webhook-alairas, jo Worker
// tamogatas), de a hivo kod csak az EmailProvider interfeszt ismeri --
// szolgaltato-valtas eseten csak ezt a fajlt kell cserelni.

export interface SendEmailInput {
  to: string;
  from: string;
  subject: string;
  html: string;
  text: string;
  /** Dedup-kulcs a szolgaltato fele, hogy retry ne duplikaljon kuldest. */
  idempotencyKey: string;
}

export interface SendEmailResult {
  ok: boolean;
  providerMessageId: string | null;
  errorMessage: string | null;
}

export interface EmailProvider {
  send(input: SendEmailInput): Promise<SendEmailResult>;
}

export class ResendEmailProvider implements EmailProvider {
  constructor(private readonly apiKey: string) {}

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        // Resend natívan tamogat idempotencia-header-t: ismetelt kuldes
        // ugyanazzal a kulccsal nem hoz letre uj levelet.
        'Idempotency-Key': input.idempotencyKey,
      },
      body: JSON.stringify({
        to: input.to,
        from: input.from,
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return {
        ok: false,
        providerMessageId: null,
        errorMessage: `resend ${res.status}: ${body.slice(0, 500)}`,
      };
    }

    const data = (await res.json()) as { id?: string };
    return { ok: true, providerMessageId: data.id ?? null, errorMessage: null };
  }
}
