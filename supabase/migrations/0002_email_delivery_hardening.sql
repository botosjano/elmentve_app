-- Elmentve — email/SMS kézbesítési infrastruktúra (kanban #afc15ea0)
-- Forrás: docs/elmentve-mvp-koncepcio.md 11. rész.
--
-- Ez a migráció a 0001_reminder_engine.sql-ben létrehozott profiles/
-- reminders/notification_deliveries táblákra épül. Semmit nem tételez fel
-- a 0002_rule_knowledge_base.sql-ből (az egy másik, párhuzamos ág) --
-- a két 0002-es migráció egymástól függetlenül alkalmazható, csak a
-- fájlnév-sorszám ütközik. Végleges sorszámozás a branch-ek összefésülésekor
-- Janos/az integráló dolga (l. worker/README.md).

-- ---------------------------------------------------------------------
-- suppressions: tartósan kézbesíthetetlen vagy leiratkozott címek/számok
--
-- Küldés előtt EZT kell ellenőrizni -- ha egy cím/szám itt szerepel, a
-- Worker nem próbálkozik vele (se most, se retry-vel), amíg valaki
-- (a felhasználó email-cím-módosítással, vagy admin) fel nem oldja.
-- ---------------------------------------------------------------------
create table if not exists public.suppressions (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('email', 'sms')),
  -- normalizált cím: email kisbetűs+trim, telefon E.164. A normalizálást a
  -- hívó kód végzi (l. worker/src/lib/suppression.ts) -- itt csak tárolás.
  address text not null,
  reason text not null
    check (reason in ('bounced', 'complained', 'unsubscribed', 'manual')),
  -- honnan érkezett a jelzés, hibakereséshez és auditáláshoz
  source text not null check (source in ('webhook', 'unsubscribe_link', 'admin')),
  -- a kiváltó webhook-esemény/kérés szabad szöveges leírása, ha van
  detail text,
  created_at timestamptz not null default now(),

  constraint suppressions_channel_address_unique unique (channel, address)
);

alter table public.suppressions enable row level security;
-- Nincs kliens-oldali policy: a suppression-lista kezelése kizárólag a
-- Workeré (service role) és egy jövőbeli admin-felületé, sose közvetlen
-- felhasználói olvasás/írás (a cím maga bizalmas lehet más userek felé).

create index if not exists suppressions_channel_address_idx
  on public.suppressions(channel, address);

-- ---------------------------------------------------------------------
-- webhook_events: a feldolgozott (bounce/complaint/delivered) webhook-
-- események naplója, a szolgáltató saját esemény-id-jával kulcsolva.
--
-- Idempotencia: egy webhook-szolgáltató retry-elhet (nálunk időleges
-- hibánál, vagy sajátjából), ugyanazt az eseményt többször is elküldheti.
-- Enélkül a tábla nélkül egy duplikált "bounced" esemény duplán próbálná
-- felírni/módosítani a suppressions sort -- ártalmatlan lenne az unique
-- indexnek köszönhetően, DE a notification_deliveries.status update és a
-- profiles.email_channel_status update NEM idempotens művelet önmagában
-- (habár ugyanarra az értékre állítás gyakorlatilag ártalmatlan) -- ez a
-- tábla explicit, auditálható védelmet ad, nem csak "véletlenül ártalmatlan"-t.
-- ---------------------------------------------------------------------
create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  -- a szolgáltató saját, a webhook payloadban szereplő esemény-azonosítója
  -- (Resend/Svix-nél a "svix-id" fejléc értéke)
  provider_event_id text not null,
  event_type text not null,
  processed_at timestamptz not null default now(),

  constraint webhook_events_provider_event_unique unique (provider, provider_event_id)
);

alter table public.webhook_events enable row level security;
-- Nincs kliens-oldali policy: kizárólag a Worker (service role) írja/olvassa.

-- ---------------------------------------------------------------------
-- profiles: a csatorna-állapot automatikus frissítéséhez szükséges mezők
-- már megvannak (email_channel_status/sms_channel_status, l. 0001) -- ez a
-- migráció nem ad hozzá új oszlopot, csak a Worker fogja ezentúl ténylegesen
-- 'unreachable'-re állítani suppression-nél (eddig a mezők léteztek, de
-- semmi nem írta őket).
-- ---------------------------------------------------------------------

-- ---------------------------------------------------------------------
-- notification_deliveries: 'suppressed' állapot hozzáadása.
--
-- Ez SZÁNDÉKOSAN külön eset a 'failed'-től: a 'failed' azt jelenti, a
-- Worker megpróbálta elküldeni és a szolgáltató elutasította (ez retry-t
-- és sok-hibánál admin-riasztást indít). A 'suppressed' azt jelenti, a
-- Worker EL SE KEZDTE a küldést, mert a cím/szám a suppression-listán van
-- -- ez szándékos, nem hiba, nem kell admin-riasztás és nem kell retry.
-- ---------------------------------------------------------------------
alter table public.notification_deliveries
  drop constraint if exists notification_deliveries_status_check;
alter table public.notification_deliveries
  add constraint notification_deliveries_status_check
  check (status in ('sent', 'delivered', 'bounced', 'complained', 'failed', 'suppressed'));

-- ---------------------------------------------------------------------
-- is_suppressed: gyors, egy-lekérdezéses ellenőrzés küldés előtt.
-- security definer, csak service role hívja (a Worker RLS-t megkerülve
-- ellenőrzi a listát, mielőtt bárkinek is küldene).
-- ---------------------------------------------------------------------
create or replace function public.is_suppressed(p_channel text, p_address text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.suppressions
    where channel = p_channel and address = p_address
  );
$$;

revoke all on function public.is_suppressed(text, text) from public;
grant execute on function public.is_suppressed(text, text) to service_role;
