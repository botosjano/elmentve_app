#!/usr/bin/env node
// Kézbesítési teszt több nagy levelezőnél -- spec 11. rész kötelező pontja.
//
// FIGYELEM: ez a szkript ÉLŐ API-kulcsot igényel és TÉNYLEGESEN küld
// emaileket -- csak azután futtasd, hogy a domain SPF/DKIM/DMARC-ja kész
// (l. verify-dns.mjs és email-deliverability-runbook.md). Nem fut le
// hitelesítő adatok nélkül, és szándékosan nincs alapértelmezett
// teszt-címlista bedrótozva -- neked kell megadnod valódi, általad
// felügyelt postafiókokat minden nagyobb levelezőnél (Gmail, Outlook/
// Microsoft, Yahoo, egy magyar szolgáltató, pl. freemail/citromail).
//
// Használat:
//   RESEND_API_KEY=... REMINDER_FROM_EMAIL=emlekezteto@ertesites.elmentve.hu \
//   REPLY_TO_EMAIL=support@elmentve.hu \
//   node scripts/delivery-test.mjs teszt.gmail@gmail.com teszt.outlook@outlook.com ...
//
// A szkript csak azt jelenti, hogy a szolgáltató ELFOGADTA a küldést
// (HTTP 200 + message id) -- azt NEM tudja megmondani, hogy a levél a
// Beérkezett üzenetek vagy a Spam mappába érkezett-e. Ahhoz nézd meg
// kézzel mind a négy postafiókot, VAGY használj egy külső
// spam-pontszám-szolgáltatást (pl. mail-tester.com) -- l. a runbook 5. pontját.

const apiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.REMINDER_FROM_EMAIL;
const replyTo = process.env.REPLY_TO_EMAIL;
const recipients = process.argv.slice(2);

if (!apiKey || !fromEmail || !replyTo) {
  console.error(
    'Hiányzó env-változó -- RESEND_API_KEY, REMINDER_FROM_EMAIL és REPLY_TO_EMAIL mind kötelező.\n' +
      'Ez szándékos: nincs alapértelmezett/beégetett hitelesítő adat.',
  );
  process.exit(2);
}

if (recipients.length === 0) {
  console.error(
    'Adj meg legalább egy, de inkább 3-4 teszt-címet (Gmail, Outlook, Yahoo, magyar szolgáltató) ' +
      'parancssori argumentumként.\n\nPélda:\n  node scripts/delivery-test.mjs teszt@gmail.com teszt@outlook.com',
  );
  process.exit(2);
}

async function sendTestEmail(to) {
  const idempotencyKey = `delivery-test:${to}:${Date.now()}`;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({
      to,
      from: fromEmail,
      reply_to: replyTo,
      subject: 'Elmentve — kézbesítési teszt',
      text: `Ez egy kézbesítési teszt-levél az Elmentve emlékeztető-rendszeréből. Időbélyeg: ${new Date().toISOString()}`,
      html: `<p>Ez egy kézbesítési teszt-levél az Elmentve emlékeztető-rendszeréből.</p><p>Időbélyeg: ${new Date().toISOString()}</p>`,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    return { to, ok: false, detail: `HTTP ${res.status}: ${body.slice(0, 300)}` };
  }
  const data = await res.json();
  return { to, ok: true, detail: `message id: ${data.id ?? '(nincs id a válaszban)'}` };
}

async function main() {
  console.log(`Kézbesítési teszt indul -- feladó: ${fromEmail}, ${recipients.length} címzett.\n`);
  const results = await Promise.all(recipients.map(sendTestEmail));

  let failCount = 0;
  for (const r of results) {
    console.log(`  ${r.ok ? 'OK  ' : 'HIBA'} ${r.to} -- ${r.detail}`);
    if (!r.ok) failCount += 1;
  }

  console.log(
    `\n${results.length - failCount}/${results.length} elfogadva a szolgáltató által.\n` +
      'FONTOS: ez csak az elfogadást jelenti, nem a postaláda-elhelyezést (beérkezett vs. spam) -- ' +
      'ellenőrizd kézzel mindegyik postafiókot, l. worker/docs/email-deliverability-runbook.md 5. pont.',
  );
  process.exit(failCount > 0 ? 1 : 0);
}

main();
