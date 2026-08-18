// SMS-szolgaltato-fuggetlen interfesz, ugyanaz a minta mint email.ts. A
// spec (11. resz) itt sem dont vegleg szolgaltatot, csak annyit ir elo hogy
// "csomaglimittel vagy kredittel" mukodjon es a felulet a szolgaltato altal
// visszaadott kezbesitesi allapotot mutassa (nem allithatjuk hogy a user
// elolvasta). Twilio-adapter van bedratozva alapertelmezesnek (piaci
// standard, jol dokumentalt REST API, natv delivery-status webhook), de a
// hivo kod csak az SmsProvider interfeszt ismeri.

export interface SendSmsInput {
  to: string; // E.164 formatum, pl. +36301234567
  from: string; // Twilio-nal ez lehet egy bejelentett szam vagy Messaging Service SID
  body: string;
  /** Dedup-kulcs -- Twilio nem tamogat natv idempotencia-headert mint
   *  Resend, ezert ezt csak a mi oldalunkon hasznaljuk (a hivo kod nem
   *  kuld ket kulon reminder-hez ugyanazzal a kulccsal). */
  idempotencyKey: string;
}

export interface SendSmsResult {
  ok: boolean;
  providerMessageId: string | null;
  errorMessage: string | null;
}

export interface SmsProvider {
  send(input: SendSmsInput): Promise<SendSmsResult>;
}

export class TwilioSmsProvider implements SmsProvider {
  constructor(
    private readonly accountSid: string,
    private readonly authToken: string,
  ) {}

  async send(input: SendSmsInput): Promise<SendSmsResult> {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    const body = new URLSearchParams({
      To: input.to,
      From: input.from,
      Body: input.body,
    });

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${this.accountSid}:${this.authToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      return {
        ok: false,
        providerMessageId: null,
        errorMessage: `twilio ${res.status}: ${errBody.slice(0, 500)}`,
      };
    }

    const data = (await res.json()) as { sid?: string; status?: string };
    // A Twilio a "queued"/"accepted" allapotot adja vissza rogton -- ez NEM
    // kezbesitve, csak elfogadva. A tenyleges statuszt a delivery-status
    // webhook fogja frissiteni (l. index.ts handleTwilioStatusWebhook).
    return { ok: true, providerMessageId: data.sid ?? null, errorMessage: null };
  }
}
