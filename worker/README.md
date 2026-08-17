# Elmentve — emlékeztető-motor Worker

Cloudflare Worker, ami percenként (cron) lekéri az esedékes emlékeztetőket
a Supabase-ből, atomikusan lefoglalja őket (`FOR UPDATE SKIP LOCKED`), elküldi
email-en Resend-en keresztül, naplózza a küldést, és sikertelen küldésnél
korlátozott, exponenciális visszalépéssel újrapróbálkozik. Végleges hibánál és
a saját futási hibájánál admin-riasztást küld.

Forrás: `docs/elmentve-mvp-koncepcio.md` 7. rész (marveen repo).

## Amit ez a kártya lefed

- `supabase/migrations/0001_reminder_engine.sql` — `profiles`, `items`,
  `deadlines`, `reminders`, `notification_deliveries`, `worker_heartbeats`
  táblák, RLS, és a `claim_due_reminders` / `reclaim_stuck_processing_reminders`
  SQL függvények (service role only).
- `worker/src/index.ts` — cron handler (`scheduled`) + Resend webhook fogadó
  (`fetch`, `/webhooks/resend`).
- `worker/src/lib/backoff.ts`, `quietHours.ts` — tiszta, tesztelt logika.
- `worker/src/lib/email.ts` — `EmailProvider` interfész + Resend adapter.

## Amit ez a kártya NEM fed le (más kártyák dolga)

- Az emlékeztetők **létrehozása** (természetes nyelvű felvitel, sablonok,
  jóváhagyási kártya) — ez a `reminders` táblát már kitöltve várja, a
  `scheduled_at`-et az app számolja ki a csendes órák/időzóna figyelembe
  vételével.
- SMS-csatorna — a séma és a `reminders.channel` check constraint már
  felkészült rá, de a Worker jelenleg csak `email`-t küld (lásd
  `src/index.ts` `processReminder` eleje).
- A GHL-integráció és az `outbox_events` tábla (spec 8. rész) — külön kártya.
- Független külső monitor a heartbeat-re (spec: "10 percen belül nincs
  sikeres futás" riasztás) — a `worker_heartbeats` tábla megvan, a külső
  megfigyelő (pl. UptimeRobot / Cronitor a `/healthz`-re, vagy egy másik
  scheduled job ami a heartbeat-táblát nézi) még nincs bekötve.

## Nyitott döntések / blokkolók éles indulás előtt

Ezek Janos döntése és/vagy hozzáférése kellenek, nem tudtam magamtól
provisionalni:

1. **Supabase projekt** — jelenleg egyáltalán nincs Supabase projekt az
   Elmentve-hez (ellenőriztem: sem a repóban, sem a marveen doksik között
   nincs URL/kulcs). Kell egy projekt, rajta lefuttatva ez a migráció.
2. **Cloudflare account + Worker** — a `wrangler deploy` egy bejelentkezett
   Cloudflare accountot és (első alkalommal) `wrangler login`-t igényel.
3. **Email-szolgáltató végleges kiválasztása** — a spec (11. rész) nem dönt,
   csak követelményeket ír elő. A kód Resendre van bedrótozva mint
   alapértelmezés (`EmailProvider` interfész mögött, könnyen cserélhető),
   de a tényleges fiók, a `ertesites.elmentve.hu` aldomain SPF/DKIM/DMARC
   beállítása és a webhook-titok Janos/az infra-tulajdonos dolga.
4. **Resend webhook aláírás-ellenőrzés** — a `handleResendWebhook` jelenleg
   csak azt nézi, hogy van-e `svix-signature` header és be van-e állítva a
   secret; a tényleges svix HMAC-ellenőrzés még nincs bekötve (a `svix` npm
   csomag Worker-kompatibilitását érdemes deploy előtt leellenőrizni, vagy
   kézzel implementálni a HMAC-SHA256-ot Web Crypto API-val).

Amíg ezek nincsenek meg, a kód **nem deploy-olható élesben**, de a séma és a
retry/idempotencia/csendes-óra logika self-containedként tesztelhető és
review-zható.

## Fejlesztés

```bash
cd worker
npm install
npm run typecheck
npm test        # backoff + csendes órák tiszta logika, élő infra nélkül
```

## Deploy (ha megvannak a fenti blokkolók)

```bash
cd worker
wrangler login
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
wrangler secret put RESEND_API_KEY
wrangler secret put REMINDER_FROM_EMAIL
wrangler secret put ADMIN_ALERT_EMAIL
wrangler secret put RESEND_WEBHOOK_SECRET
wrangler deploy
```

A migrációt a Supabase CLI-vel vagy a Supabase dashboard SQL-editorában kell
lefuttatni (`supabase/migrations/0001_reminder_engine.sql`).

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
