-- Elmentve — magyar szabalytudas adatbazis (kanban #85e5a4cf)
-- Forras: docs/elmentve-mvp-koncepcio.md 10. resz.
--
-- Az AI nem jogszabalyforras: minden automatikus javaslat egy karbantartott,
-- verziozott, ember altal jovahagyott szabalybol szarmazik. Egy tetelhez az
-- a szabalyverzio kapcsolodik, amely a vasarlas/esemeny idopontjaban volt
-- hatalyos -- ezert verziozott tabla, nem egyetlen "aktualis ertek" mezo.
--
-- Ez a migracio feltetelezi a 0001_reminder_engine.sql-ben letrehozott
-- public.items tablat (item_rule_applications.item_id arra mutat).

-- ---------------------------------------------------------------------
-- rules: verziozott, jovahagyasi allapotu szabalyok
--
-- Egy "szabaly" (pl. "szemelygepkocsi muszaki vizsga gyakorisaga") tobb
-- verzioban letezhet a tortenelme soran; a `slug` fogja ossze a
-- verziokat, a `version` sorszamozza oket. Csak egyetlen `published`,
-- meg le nem jart (valid_to is null) verzio lehet slugonkent -- ezt egy
-- parcialis unique index kenyszeriti ki lejjebb.
-- ---------------------------------------------------------------------
create table if not exists public.rules (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  version int not null check (version > 0),
  name text not null,
  description text not null,

  -- Alkalmazasi feltetelek strukturaltan (pl. kategoria, jarmutipus,
  -- korhataros eset). Szabadon bovitheto sema-valtoztatas nelkul.
  applicability jsonb not null default '{}'::jsonb,

  -- "Mely datumbol kell szamolni" -- szoveges leiras (pl. "elso
  -- forgalomba helyezes datuma"), plusz a hatarido-szamitas intervalluma.
  base_date_description text not null,
  interval_amount int,
  interval_unit text check (interval_unit in ('day', 'month', 'year')),

  valid_from date not null,
  valid_to date,

  source_url text not null,
  last_reviewed_at date not null,
  next_review_due date not null,

  -- Felelos szerkeszto -- szoveges nev/email a naploban, es ha van hozza
  -- tartozo admin-fiok, opcionalisan a user id is.
  editor_name text not null,
  editor_user_id uuid references auth.users(id),

  status text not null default 'draft'
    check (status in ('draft', 'published', 'deprecated')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint rules_valid_range check (valid_to is null or valid_to > valid_from),
  constraint rules_slug_version_unique unique (slug, version)
);

alter table public.rules enable row level security;

-- Kliens csak a publikalt vagy mar leallitott (deprecated) verziokat
-- lathatja -- a draft szandekosan rejtve marad, amig ember jova nem
-- hagyja. Iras (letrehozas/publikalas/deprecalas) kizarolag admin-
-- felulet/service role feladata -- ezert nincs kliens-oldali
-- insert/update/delete policy.
create policy "rules_select_published_or_deprecated" on public.rules
  for select using (status in ('published', 'deprecated'));

create index if not exists rules_slug_idx on public.rules(slug);
create index if not exists rules_status_idx on public.rules(status);
create index if not exists rules_next_review_due_idx
  on public.rules(next_review_due) where status = 'published';

-- Slugonkent legfeljebb egy "jelenleg hatalyos, publikalt" verzio
-- (valid_to is null) lehet -- ez kenyszeriti ki, hogy uj verzio
-- bevezetesekor a regit elobb le kell zarni (valid_to kitoltese) vagy
-- deprecated-be kell tenni.
create unique index if not exists rules_one_active_published_per_slug
  on public.rules(slug)
  where status = 'published' and valid_to is null;

-- ---------------------------------------------------------------------
-- item_rule_applications: melyik tetelre melyik szabalyverziot
-- alkalmaztuk, es milyen esemeny-datum alapjan.
-- ---------------------------------------------------------------------
create table if not exists public.item_rule_applications (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  rule_id uuid not null references public.rules(id),
  user_id uuid not null references auth.users(id) on delete cascade,

  -- A vasarlas/esemeny datuma, ami alapjan ezt a szabalyverziot
  -- valasztottuk (spec: "amely a vasarlas vagy esemeny idopontjaban
  -- volt hatalyos").
  event_date date not null,

  -- A szabaly alapjan szamitott hatarido, ha az alkalmazas idopontjaban
  -- ki lehetett szamolni (interval_amount/interval_unit alapjan).
  computed_due_date date,

  applied_at timestamptz not null default now(),

  unique (item_id, rule_id)
);

alter table public.item_rule_applications enable row level security;

create policy "item_rule_applications_owner_select" on public.item_rule_applications
  for select using (auth.uid() = user_id);

-- Iras itt is csak service role/szerveroldali logika -- a szabaly-
-- alkalmazas az AI-javaslat es a jovahagyasi folyamat resze, nem
-- kozvetlen kliens-iras.

create index if not exists item_rule_applications_item_id_idx
  on public.item_rule_applications(item_id);
create index if not exists item_rule_applications_rule_id_idx
  on public.item_rule_applications(rule_id);
create index if not exists item_rule_applications_user_id_idx
  on public.item_rule_applications(user_id);

-- ---------------------------------------------------------------------
-- select_applicable_rule_version: a p_slug szabalycsoportban azt a
-- verziot adja vissza, amely p_event_date idopontjaban hatalyos volt
-- (valid_from <= event_date < valid_to VAGY valid_to is null), csak
-- publikalt vagy mar deprecated (soha nem draft) verziok kozul.
--
-- security invoker (nem definer): a hivo sajat jogaival fut, es ugyis
-- csak published/deprecated sorokat lat a RLS miatt -- nincs szukseg
-- jogosultsag-emelesre.
-- ---------------------------------------------------------------------
create or replace function public.select_applicable_rule_version(
  p_slug text,
  p_event_date date
)
returns public.rules
language sql
stable
security invoker
set search_path = public
as $$
  select r.*
  from public.rules r
  where r.slug = p_slug
    and r.status in ('published', 'deprecated')
    and r.valid_from <= p_event_date
    and (r.valid_to is null or r.valid_to > p_event_date)
  order by r.version desc
  limit 1;
$$;

-- ---------------------------------------------------------------------
-- items_needing_rule_reevaluation: egy adott slug legfrissebb publikalt
-- verziojahoz kepest mely tetelek reven kotott item_rule_applications
-- mutat regebbi verziora -- ezekhez erdemes ujraertekelest ajanlani a
-- felhasznalonak (spec: "Szabalyvaltozaskor lekerdezheto, mely teteleket
-- kell ujraertekelni").
--
-- security definer, mert tobb felhasznalo teteleit keresztul kell
-- latnia -- kizarolag service role hivja (admin folyamat), nem kliens.
-- ---------------------------------------------------------------------
create or replace function public.items_needing_rule_reevaluation(p_slug text)
returns table (item_id uuid, user_id uuid, applied_rule_version int, current_rule_version int)
language sql
stable
security definer
set search_path = public
as $$
  select
    ira.item_id,
    ira.user_id,
    applied.version as applied_rule_version,
    current_rule.version as current_rule_version
  from public.item_rule_applications ira
  join public.rules applied on applied.id = ira.rule_id
  join public.rules current_rule
    on current_rule.slug = p_slug
   and current_rule.status = 'published'
   and current_rule.valid_to is null
  where applied.slug = p_slug
    and applied.id <> current_rule.id;
$$;

revoke all on function public.items_needing_rule_reevaluation(text) from public;
grant execute on function public.items_needing_rule_reevaluation(text) to service_role;
