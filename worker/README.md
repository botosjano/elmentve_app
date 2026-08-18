# Elmentve — emlékeztető-motor + kézbesítési infrastruktúra Worker

Cloudflare Worker, ami percenként (cron) lekéri az esedékes emlékeztetőket
a Supabase-ből, atomikusan lefoglalja őket (`FOR UPDATE SKIP LOCKED`), elküldi
email-en vagy SMS-en, naplózza a küldést, és sikertelen küldésnél
korlátozott, exponenciális visszalépéssel újrapróbálkozik. Végleges hibánál és
a saját futási hibájánál admin-riasztást küld. Kezeli a szolgáltatói bounce/
complaint-webhookokat, a suppression-listát és a leiratkozást.

Forrás: `docs/elmentve-mvp-koncepcio.md` 7. és 11. rész (marveen repo).

## Amit ez a kártya lefed (kanban #afc15ea0, a #11d3cf1f emlékeztető-motor
## kártyára épülve)

- `supabase/migrations/0002_email_delivery_hardening.sql` — `suppressions`
  és `webhook_events` táblák, `is_suppressed` SQL függvény, a
  `notification_deliveries.status` check bővítve `suppressed`-del.
- `worker/src/lib/webhookVerify.ts` — valódi Svix HMAC-SHA256
  aláírás-ellenőrzés (a korábbi placeholder, ami csak a header meglétét
  nézte, most tényleg ellenőriz — replay-védelemmel is).
- `worker/src/lib/twilioWebhookVerify.ts` — Twilio saját HMAC-SHA1
  webhook-sémájának ellenőrzése.
- `worker/src/lib/suppression.ts` — `isSuppressed`/`addSuppression`,
  cím-normalizálás, a `profiles.*_channel_status` automatikus frissítése.
- `worker/src/lib/unsubscribe.ts` — állapotmentes, HMAC-aláírt,
  bejelentkezés nélkül működő leiratkozó token.
- `worker/src/lib/sms.ts` — `SmsProvider` interfész + Twilio adapter (az
  eddig "sms channel not implemented yet" hibával visszautasított ág most
  ténylegesen küld).
- `worker/src/lib/senderConfig.ts` — a feladó/Reply-To cím és a küldő-
  aldomain induláskori, hangos ellenőrzése.
- `worker/src/index.ts` — bővítve: suppression-ellenőrzés minden küldés
  előtt, `/webhooks/twilio` route, `/unsubscribe` route, unsubscribe-link
  minden kimenő emailben.
- `worker/docs/email-deliverability-runbook.md` — SPF/DKIM/DMARC
  checklist és sorrend (DNS/fiók-oldali lépések, amiket ember végez el).
- `worker/scripts/verify-dns.mjs` — SPF/DMARC DNS-ellenőrző (élő
  hitelesítő adat nélkül fut, publikus DNS-lekérdezéssel; a repóban tesztelt
  valós domainek ellen, l. commit).
- `worker/scripts/delivery-test.mjs` — kézbesítési teszt-küldő több
  levelezőnek (ÉLŐ API-kulcsot igényel, l. a fájl fejlécét).

## Amit ez a kártya NEM fed le (más kártyák dolga)

- Az emlékeztetők **létrehozása** (természetes nyelvű felvitel, sablonok,
  jóváhagyási kártya) — ez a `reminders` táblát már kitöltve várja.
- A GHL-integráció és az `outbox_events` tábla (spec 8. rész) — külön kártya.
- Független külső monitor a heartbeat-re (spec: "10 percen belül nincs
  sikeres futás" riasztás) — a `worker_heartbeats` tábla megvan, a külső
  megfigyelő (pl. UptimeRobot / Cronitor a `/healthz`-re) még nincs bekötve.
- **Az email-cím módosítása bejelentkezett felhasználó által** (spec 11.
  rész "Elérhetetlen felhasználó" szakasz) — ez app-oldali (Next.js) UI-
  feladat, nem a Worker dolga; a Worker csak a `profiles.email_channel_status`
  mezőt olvassa/írja, amire ez az app-funkció épülne.
- Profiles tábla normalizált email/telefon oszlop + index (l.
  `suppression.ts` komment "Ismert korlát") — apró, külön migráció.

## Nyitott döntések / blokkolók éles indulás előtt

Ezek Janos döntése és/vagy hozzáférése kellenek, nem tudtam magamtól
provisionalni:

1. **Supabase projekt** — jelenleg egyáltalán nincs Supabase projekt az
   Elmentve-hez. Kell egy projekt, rajta lefuttatva a két migráció (0001,
   majd 0002 -- ebben a sorrendben, mert a 0002 a 0001 tábláira épül).
2. **Cloudflare account + Worker** — a `wrangler deploy` egy bejelentkezett
   Cloudflare accountot és (első alkalommal) `wrangler login`-t igényel.
3. **Email-szolgáltató végleges kiválasztása** — a spec (11. rész) nem dönt,
   csak követelményeket ír elő, és Janos explicit kérése volt, hogy a
   kártya ne döntse el helyette. A kód Resendre van bedrótozva mint
   alapértelmezés (`EmailProvider` interfész mögött, könnyen cserélhető —
   csak `src/lib/email.ts`-t kell cserélni, a hívó kód csak az interfészt
   ismeri), de a tényleges fiók, a `ertesites.elmentve.hu` aldomain
   SPF/DKIM/DMARC beállítása és a webhook-titok Janos/az infra-tulajdonos
   dolga. Ugyanez SMS-nél Twilióval (`src/lib/sms.ts`).
4. **DNS-rekordok (SPF/DKIM/DMARC)** — l. `docs/email-deliverability-
   runbook.md`, teljes checklist és sorrend. A `scripts/verify-dns.mjs`-sel
   ellenőrizhető, hogy készen vannak-e, mielőtt élesítünk.
5. **Kézbesítési teszt élő fiókkal** — `scripts/delivery-test.mjs`, csak a
   3-4. pont után futtatható.

Amíg ezek nincsenek meg, a kód **nem deploy-olható élesben**, de minden
tiszta logika (retry/idempotencia/csendes-óra/webhook-aláírás-ellenőrzés/
suppression/unsubscribe-token) self-containedként tesztelhető és
review-zható élő infra nélkül.

## Fejlesztés

```bash
cd worker
npm install
npm run typecheck
npm test        # tiszta logika, élő infra nélkül (47 teszt)
```

## Deploy (ha megvannak a fenti blokkolók)

```bash
cd worker
wrangler login
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
wrangler secret put RESEND_API_KEY
wrangler secret put REMINDER_FROM_EMAIL
wrangler secret put REPLY_TO_EMAIL
wrangler secret put ADMIN_ALERT_EMAIL
wrangler secret put RESEND_WEBHOOK_SECRET
wrangler secret put UNSUBSCRIBE_SECRET
wrangler secret put WORKER_BASE_URL
# Opcionális, csak ha az SMS-csatorna élesedik:
wrangler secret put TWILIO_ACCOUNT_SID
wrangler secret put TWILIO_AUTH_TOKEN
wrangler secret put TWILIO_FROM_NUMBER
wrangler deploy
```

A migrációkat a Supabase CLI-vel vagy a Supabase dashboard SQL-editorában
kell lefuttatni, **sorrendben**: `0001_reminder_engine.sql`, majd
`0002_email_delivery_hardening.sql`.

## Idempotencia és versenyhelyzet-védelem — hogyan garantálja a kód

- **Lefoglalás**: `claim_due_reminders` egy SQL tranzakcióban `UPDATE ...
  FROM (SELECT ... FOR UPDATE SKIP LOCKED)`-ot futtat, tehát két párhuzamos
  Worker-futás (pl. lassú futás + következő cron) sose foglalja le
  ugyanazt a sort kétszer.
- **Idempotenciakulcs**: a `reminders.idempotency_key` generált oszlop
  (`deadline_id:channel:scheduled_at`) `UNIQUE` indexszel — ez maga a
  spec által előírt kulcs. Ugyanezt a kulcsot küldi a Worker a Resend
  `Idempotency-Key` fejlécében is, tehát még ha a Worker a válasz
  fogadása előtt szakadna is meg, egy újrapróbálkozás nem duplikál levelet.
- **Beragadt `processing` sorok**: ha a Worker összeomlik a lefoglalás
  után, de a státuszfrissítés előtt, a következő futás
  `reclaim_stuck_processing_reminders`-szel 5 perc után visszateszi
  `scheduled`-be — nem vész el, de nem is ragad örökre "feldolgozás alatt"
  állapotban.
- **Webhook-idempotencia**: a `webhook_events` tábla `(provider,
  provider_event_id)` unique indexe garantálja, hogy egy szolgáltatói
  retry ne dolgozza fel kétszer ugyanazt a bounce/complaint/status-
  eseményt (a második beszúrási kísérlet unique-constraint hibával elbukik,
  ezt a kód csendben, sikeresen kezeli — l. `handleResendWebhook`/
  `handleTwilioWebhook`).

## Suppression és leiratkozás — hogyan függ össze

1. Bounce/complaint webhook VAGY leiratkozás-link → `addSuppression()` →
   sor a `suppressions` táblában + a megfelelő `profiles.*_channel_status`
   `unreachable`-re állítva.
2. Minden küldés előtt (`processReminder`) a Worker `isSuppressed()`-del
   ellenőriz. Ha suppressed: a küldés KIMARAD, a `notification_deliveries`
   sor `suppressed` státusszal kerül be (nem `failed` — ez szándékos,
   nem hiba, l. a migráció kommentje), a `reminders` sor `cancelled`-re
   vált, NINCS retry, NINCS admin-riasztás.
3. A suppression-ellenőrzés hibája (pl. átmeneti DB-hiba) fail-open: a
   Worker inkább megpróbál küldeni, mint hogy egy DB-hiba miatt
   elveszítsen egy legitim emlékeztetőt (l. `suppression.ts` komment).
