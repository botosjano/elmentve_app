-- Elmentve — emlekezteto-motor alapadatmodell (kanban #11d3cf1f)
-- Forras: docs/elmentve-mvp-koncepcio.md 7. resz es 9. resz.
--
-- Ez a migracio a lejaratfigyelo-motorhoz szukseges minimalis tablakat hozza
-- letre: profiles, items, deadlines, reminders, notification_deliveries,
-- worker_heartbeats. A tovabbi 9. reszben felsorolt tablak (attachments,
-- rules, item_rule_applications, subscriptions, outbox_events, audit_events)
-- kulon kartyak/migraciok reszei.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- profiles: idozona + csendes orak + elerhetosegi allapot
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  timezone text not null default 'Europe/Budapest',
  quiet_hours_start time not null default '21:00',
  quiet_hours_end time not null default '08:00',
  notification_email text,
  email_channel_status text not null default 'active'
    check (email_channel_status in ('active', 'unreachable')),
  phone text,
  sms_channel_status text not null default 'active'
    check (sms_channel_status in ('active', 'unreachable')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

-- ---------------------------------------------------------------------
-- items: a mentett ugy/targy
-- ---------------------------------------------------------------------
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.items enable row level security;

create policy "items_owner_all" on public.items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists items_user_id_idx on public.items(user_id);

-- ---------------------------------------------------------------------
-- deadlines: dátum/idő/időzóna, státusz
-- ---------------------------------------------------------------------
create table if not exists public.deadlines (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  due_date date not null,
  due_time time,
  all_day boolean not null default true,
  timezone text not null default 'Europe/Budapest',
  status text not null default 'active'
    check (status in ('active', 'done', 'postponed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.deadlines enable row level security;

create policy "deadlines_owner_all" on public.deadlines
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists deadlines_item_id_idx on public.deadlines(item_id);
create index if not exists deadlines_user_id_idx on public.deadlines(user_id);

-- ---------------------------------------------------------------------
-- reminders: csatorna, kuldesi ido, idempotenciakulcs, allapot
-- ---------------------------------------------------------------------
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  deadline_id uuid not null references public.deadlines(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null check (channel in ('email', 'sms')),
  scheduled_at timestamptz not null,
  status text not null default 'scheduled'
    check (status in (
      'scheduled', 'processing', 'sent', 'delivered',
      'bounced', 'failed', 'cancelled'
    )),
  idempotency_key text generated always as (
    deadline_id::text || ':' || channel || ':' || extract(epoch from scheduled_at)::text
  ) stored,
  attempt_count int not null default 0,
  max_attempts int not null default 5,
  next_attempt_at timestamptz,
  last_error text,
  claimed_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.reminders enable row level security;

create policy "reminders_owner_select" on public.reminders
  for select using (auth.uid() = user_id);

-- csak a service role (a Worker) irhat statuszt/kuldest -- nincs kliens
-- oldali insert/update policy szandekosan.

create unique index if not exists reminders_idempotency_key_idx
  on public.reminders(idempotency_key);

-- A cron a ket allapotra (scheduled retry-re varakozva, VAGY processing-ben
-- ragadt) keres esedekesseget -- ez az index tartja gyorsan.
create index if not exists reminders_due_idx
  on public.reminders(status, scheduled_at)
  where status in ('scheduled', 'processing');

-- ---------------------------------------------------------------------
-- notification_deliveries: minden kuldesi probalkozas naplo-sora
-- ---------------------------------------------------------------------
create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  reminder_id uuid not null references public.reminders(id) on delete cascade,
  attempt_number int not null,
  channel text not null,
  provider text not null,
  provider_message_id text,
  status text not null
    check (status in (
      'sent', 'delivered', 'bounced', 'complained', 'failed'
    )),
  response_code text,
  error_message text,
  created_at timestamptz not null default now()
);

alter table public.notification_deliveries enable row level security;

create policy "deliveries_owner_select" on public.notification_deliveries
  for select using (
    exists (
      select 1 from public.reminders r
      where r.id = reminder_id and r.user_id = auth.uid()
    )
  );

create index if not exists deliveries_reminder_id_idx
  on public.notification_deliveries(reminder_id);
create index if not exists deliveries_provider_message_id_idx
  on public.notification_deliveries(provider_message_id)
  where provider_message_id is not null;

-- ---------------------------------------------------------------------
-- worker_heartbeats: a Worker minden sikeres futaskor ir ide
-- ---------------------------------------------------------------------
create table if not exists public.worker_heartbeats (
  id bigint generated always as identity primary key,
  run_at timestamptz not null default now(),
  claimed_count int not null default 0,
  sent_count int not null default 0,
  failed_count int not null default 0,
  error text
);

alter table public.worker_heartbeats enable row level security;
-- Nincs kliens-oldali policy: csak a service role olvassa/irja
-- (pl. a fugetlen kulso monitor is service role-lal kerdez).

create index if not exists worker_heartbeats_run_at_idx
  on public.worker_heartbeats(run_at desc);

-- ---------------------------------------------------------------------
-- claim_due_reminders: atomikus, versenyhelyzet-biztos lefoglalas
--
-- FOR UPDATE SKIP LOCKED -- ha a Worker ket peldanya egyszerre futna
-- (pl. lassu futas + uj cron-trigger), egyik sem foglalja le a masik
-- altal mar zarolt sort. security definer, csak a service role hivja.
-- ---------------------------------------------------------------------
create or replace function public.claim_due_reminders(p_limit int default 50)
returns setof public.reminders
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    update public.reminders r
    set status = 'processing',
        claimed_at = now(),
        updated_at = now()
    from (
      select id
      from public.reminders
      where status = 'scheduled'
        and scheduled_at <= now()
      order by scheduled_at
      limit p_limit
      for update skip locked
    ) due
    where r.id = due.id
    returning r.*;
end;
$$;

revoke all on function public.claim_due_reminders(int) from public;
grant execute on function public.claim_due_reminders(int) to service_role;

-- ---------------------------------------------------------------------
-- reclaim_stuck_processing_reminders: ha a Worker megszakadt kuldes
-- kozben, a 'processing'-ben ragadt sorokat visszateszi 'scheduled'-be,
-- hogy a kovetkezo futas ujra probalja. p_stuck_after a processing-be
-- kerulestol szamitott var.
-- ---------------------------------------------------------------------
create or replace function public.reclaim_stuck_processing_reminders(
  p_stuck_after interval default '5 minutes'
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  with stuck as (
    update public.reminders
    set status = 'scheduled',
        updated_at = now()
    where status = 'processing'
      and claimed_at < now() - p_stuck_after
    returning id
  )
  select count(*) into v_count from stuck;
  return v_count;
end;
$$;

revoke all on function public.reclaim_stuck_processing_reminders(interval) from public;
grant execute on function public.reclaim_stuck_processing_reminders(interval) to service_role;
