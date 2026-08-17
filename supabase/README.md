# Elmentve — Supabase migrációk

A migrációk `supabase/migrations/`-ban vannak, sorszámozva, futtatási
sorrendben. Egyik migráció sem futott le éles Supabase projekten — ez a repo
egyelőre csak a kódot/sémát tartalmazza (lásd `worker/README.md` a
blokkolókról: nincs még Supabase projekt provisionalva).

Alkalmazás Supabase CLI-vel, ha megvan a projekt:

```bash
supabase link --project-ref <projekt-ref>
supabase db push
```

## 0001_reminder_engine.sql

`profiles`, `items`, `deadlines`, `reminders`, `notification_deliveries`,
`worker_heartbeats` — a lejáratfigyelő emlékeztető-motor alapja. Részletek:
`worker/README.md`.

## 0002_rule_knowledge_base.sql

`rules`, `item_rule_applications` — a magyar szabálytudás verziózott
adatbázisa (`docs/elmentve-mvp-koncepcio.md` 10. rész). Az AI soha nem
jogszabályforrás: minden javaslat egy karbantartott, verziózott,
`draft` → `published` → (később) `deprecated` életciklusú szabályból
származik.

### Kulcs-invariánsok

- **Egy tételhez az a szabályverzió tartozik, amely az esemény (pl.
  vásárlás) időpontjában hatályos volt** — nem mindig a legújabb. Ezért a
  `rules` tábla verziónkénti sorokból áll (`slug` + `version`), nem egy
  "jelenlegi érték" mezőből. A `select_applicable_rule_version(slug,
  event_date)` SQL függvény adja vissza a helyes verziót.
- **Slugonként legfeljebb egy aktív (`published`, `valid_to IS NULL`)
  verzió lehet** — ezt egy parciális unique index kényszeríti ki
  (`rules_one_active_published_per_slug`). Új verzió bevezetésekor előbb
  az előzőt kell lezárni (`valid_to` kitöltése) vagy `deprecated`-be
  tenni.
- **`draft` állapotú szabály sosem látszik kliens felől** — az
  `rules_select_published_or_deprecated` RLS policy csak `published`/
  `deprecated` sorokat enged olvasni. A jóváhagyás (draft → published)
  kizárólag szerveroldali/admin művelet lehet (service role), ezért a
  táblán szándékosan nincs kliens-oldali insert/update policy.
- **Szabályváltozás után ki lehet listázni, mely tételeket érdemes
  újraértékelni** — `items_needing_rule_reevaluation(slug)` (service
  role only) visszaadja azokat a tételeket, amelyek `item_rule_applications`
  sora egy már nem aktuális szabályverzióra mutat.

### Amit ez a migráció NEM fed le

- Az admin-felület maga (szabály létrehozása/jóváhagyása/deprecálása) —
  spec 5. rész, külön kártya. A DB-oldal (státuszgép, verziózás,
  egyediség-kényszer) kész, de a szerkesztő UI és a jóváhagyási workflow
  kódja még nincs megírva.
- A tényleges magyar jogszabálytartalom (pl. "műszaki vizsga
  gyakorisága") feltöltése. Ez jogi tartalom, forrás-ellenőrzést és
  emberi jóváhagyást igényel a spec szerint is — nem agent dolga
  kitalálni vagy "ésszerűen" kitölteni. Seed/példaadat szándékosan nincs
  a migrációban.
- Az AI-alapú javaslattétel (a felvitel során a `select_applicable_rule_version`
  hívása és a jóváhagyási kártyán való megjelenítés) — az MVP 4. részében
  leírt természetes nyelvű felvitel kártyájának a dolga.

### Példa admin-workflow (dokumentáció, nem futtatott kód)

```sql
-- Uj szabalyverzio bevezetese: elozo lezarasa + uj draft, majd publikalas
update public.rules
   set valid_to = '2027-01-01', status = 'deprecated', updated_at = now()
 where slug = 'muszaki-vizsga-szemelygepkocsi' and status = 'published';

insert into public.rules (
  slug, version, name, description, base_date_description,
  interval_amount, interval_unit, valid_from, source_url,
  last_reviewed_at, next_review_due, editor_name, status
) values (
  'muszaki-vizsga-szemelygepkocsi', 2, '...', '...', '...',
  4, 'year', '2027-01-01', 'https://...', current_date,
  current_date + interval '1 year', 'Janos', 'published'
);
```
