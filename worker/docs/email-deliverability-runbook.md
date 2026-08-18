# Email-kézbesíthetőség runbook — élesítés előtti checklist

Forrás: `docs/elmentve-mvp-koncepcio.md` 11. rész (marveen repo).

Ez a doksi a **DNS/fiók-oldali** lépéseket írja le, amiket ember (Janos vagy
az infra-tulajdonos) végez el egy valódi domain-en és email-szolgáltató-
fiókban — ezt kód nem tudja elvégezni helyette, mert domain-hozzáférést és
egy éles szolgáltató-fiókot igényel. A `scripts/verify-dns.mjs` szkript az
eredményt tudja utólag ellenőrizni.

## 1. Külön küldő-aldomain

A spec szerint az emlékeztetők **ne** a fő `elmentve.hu` domainről menjenek,
hanem egy külön aldomainről, pl. `ertesites.elmentve.hu`. Ennek két oka van:

- ha valamiért romlik a küldő-domain reputációja (spam-jelentés, magas
  bounce-arány), az NEM viszi magával a fő domaint (a marketing oldal, a
  bejelentkezési emailek stb. érintetlenek maradnak);
- a szolgáltató DKIM/SPF-beállítása egy dedikált aldomainen tisztán, a fő
  domain egyéb DNS-rekordjaitól függetlenül konfigurálható.

A worker kódja ezt `SENDER_DOMAIN` env-változóval (l. `wrangler.toml`)
kényszeríti ki: a `REMINDER_FROM_EMAIL`-nek erre az aldomainre kell
végződnie, különben a Worker induláskor hangosan hibázik (l.
`src/lib/senderConfig.ts`).

## 2. SPF, DKIM, DMARC — mit kell beállítani

Ezeket a választott email-szolgáltató (Resend/SendGrid/SES/stb.) dashboardja
generálja **azután**, hogy hozzáadtad és megerősítetted az
`ertesites.elmentve.hu` aldomaint a fiókjában — a konkrét DKIM-kulcs
szolgáltatónként és fiókonként egyedi, nem lehet előre kitalálni.

Amit a DNS-en (az `elmentve.hu` zóna kezelőjében) létre kell hozni,
**típus szerint**, függetlenül a választott szolgáltatótól:

| Rekordtípus | Host (tipikus) | Mit ellenőriz |
|---|---|---|
| TXT (SPF) | `ertesites.elmentve.hu` | Mely szerverek küldhetnek `@ertesites.elmentve.hu` néven — a szolgáltató ad egy `v=spf1 include:... ~all` értéket. |
| CNAME/TXT (DKIM) | a szolgáltató által megadott, gyakran `<selector>._domainkey.ertesites.elmentve.hu` | Kriptográfiai aláírás minden kimenő levélen — a szolgáltató generálja a kulcspárt, a publikus felét kell DNS-be tenni. |
| TXT (DMARC) | `_dmarc.ertesites.elmentve.hu` (VAGY `_dmarc.elmentve.hu`, ha az egész domainre vonatkozó szabályt akarsz) | Mit tegyen a fogadó, ha az SPF/DKIM nem egyezik — induláskor javasolt `p=quarantine` (ne `p=reject`, amíg nincs pár hetes tiszta küldési előzmény), pl.: `v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@elmentve.hu` |

**Sorrend, ami hibát spórol:**

1. Aldomain hozzáadása a szolgáltatóban → DKIM/SPF rekordok generálása.
2. DNS-rekordok felvitele a domain-kezelőben.
3. Várj a DNS-terjedésre (általában percek, ritkán órák) — a szolgáltató
   dashboardja jelzi, ha "verified".
4. Csak EZUTÁN indítsd el a `scripts/verify-dns.mjs`-t és a
   `scripts/delivery-test.mjs`-t (l. lentebb).
5. Csak a 4. lépés zöld eredménye után élesítsd a Workert (`wrangler deploy`
   + a cron bekapcsolása).

## 3. Bounce- és complaint-webhook

A `worker/src/index.ts` már fogadja és feldolgozza ezeket
(`/webhooks/resend`, aláírás-ellenőrzéssel, l. `src/lib/webhookVerify.ts`).
Amit a szolgáltató-fiókban be kell állítani: a webhook URL-t
(`https://<worker-domain>/webhooks/resend`) és a webhook-titkot (ami a
`RESEND_WEBHOOK_SECRET` env-változóba kerül).

**Ellenőrzés élesítés előtt:** küldj egy teszt-emailt egy szándékosan
érvénytelen címre (pl. `bounce-test-<random>@ertesites.elmentve.hu` egy
saját ellenőrzött doménen, vagy a szolgáltató teszt-bounce-címét használva,
ha van ilyen), és nézd meg hogy:

- a `notification_deliveries` táblában megjelenik-e a `bounced` státusz;
- a `suppressions` táblában megjelenik-e a cím;
- a hozzá tartozó `reminders` sor `bounced`-ra vált-e.

## 4. Suppression-lista

Már megvan (`public.suppressions` tábla, `is_suppressed`/`addSuppression`).
Nincs hozzá külön ember-oldali teendő élesítés előtt — automatikusan épül a
webhookokból és a leiratkozás-linkekből.

## 5. Kézbesítési teszt több nagy levelezőnél

L. `scripts/delivery-test.mjs`. Ez a szkript **ténylegesen küld** teszt-
emaileket a megadott címekre a konfigurált szolgáltatón keresztül — csak
azután futtasd, hogy a fenti 1-3. pontok készen vannak, és élő
API-kulccsal (`RESEND_API_KEY` vagy amit választotok).

Mit NEM tud automatizálni ez a szkript: hogy a levél a Beérkezett üzenetek
vagy a Spam mappába került-e a fogadó oldalán — ezt manuálisan kell
ellenőrizni mind a négy teszt-postafiókban, VAGY egy külső
spam-pontszám-szolgáltatással (pl. mail-tester.com — ingyenes, egy
egyszer-használatos email-címet ad, amire küldesz egy tesztlevelet, és
0-10 pontszámmal + konkrét hibalistával értékeli az SPF/DKIM/DMARC-ot és a
tartalmat). Ez utóbbi a gyorsabb és megbízhatóbb módszer, érdemes azzal
kezdeni.

## 6. Leiratkozás

Már megvan (`/unsubscribe?token=...` route, HMAC-aláírt, bejelentkezés
nélkül működő token, l. `src/lib/unsubscribe.ts`). A kiküldött emailek
lábjegyzetében automatikusan szerepel a link (l. `src/index.ts`
`processReminder` email-ág). Nincs hozzá külön ember-oldali teendő.

## Nyitott döntés, ami Janos/az infra-tulajdonos dolga

Ezt a doksit **nem tudtam magamtól végigcsinálni**, mert éles domain-
hozzáférést és egy fizetős szolgáltató-fiókot igényel:

- domain-kezelő hozzáférés (`elmentve.hu` DNS-zóna);
- email-szolgáltató fiók létrehozása és az aldomain hozzáadása benne;
- a fenti checklist 1-5. pontjának tényleges végrehajtása;
- SMS-nél (ha élesedik) ugyanez Twilio-fiókkal, telefonszám-vásárlással.

A kód (webhook-fogadás, suppression, leiratkozás, sender-config-ellenőrzés)
mindettől függetlenül készen áll és tesztelt — csak élő hitelesítő adatok
nélkül nem futtatható végponttól végpontig.
