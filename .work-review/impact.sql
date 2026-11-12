-- users A and B, A has one due reminder
insert into auth.users values ('aaaaaaaa-0000-0000-0000-000000000001'), ('bbbbbbbb-0000-0000-0000-000000000002');
insert into public.items (id, user_id, title) values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'A titkos ugye');
insert into public.deadlines (id, item_id, user_id, due_date) values ('22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '2026-11-12');
insert into public.reminders (id, deadline_id, user_id, channel, scheduled_at) values ('33333333-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'email', now() - interval '1 minute');

\echo '--- G1: B (authenticated) sees A reminder via select? (RLS)'
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', true);
select count(*) as b_sees_reminders from public.reminders;
\echo '--- G1: B calls claim_due_reminders (security definer)'
select id, user_id, status from public.claim_due_reminders(50);
commit;
select id, status from public.reminders;

\echo '--- G2: anon calls reclaim + claim'
update public.reminders set status = 'scheduled';
begin;
set local role anon;
select count(*) as anon_claimed from public.claim_due_reminders(50);
rollback;

\echo '--- D1: B inserts a deadline pointing at A item (own user_id)'
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', true);
insert into public.deadlines (item_id, user_id, due_date) values ('11111111-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', '2026-12-01') returning id, item_id, user_id;
rollback;

\echo '--- K1: idempotency_key before and after a retry-style scheduled_at update'
select idempotency_key from public.reminders;
update public.reminders set scheduled_at = scheduled_at + interval '5 minutes';
select idempotency_key from public.reminders;
