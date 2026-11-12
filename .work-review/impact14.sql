insert into public.rules (id, slug, version, name, description, base_date_description, interval_amount, interval_unit, valid_from, valid_to, source_url, last_reviewed_at, next_review_due, editor_name, status) values
 ('a0000000-0000-0000-0000-000000000001', 'muszaki', 1, 'v1', 'd', 'b', 2, 'year', '2020-01-01', '2026-01-01', 'https://x', '2026-01-01', '2027-01-01', 'e', 'deprecated'),
 ('a0000000-0000-0000-0000-000000000002', 'muszaki', 2, 'v2', 'd', 'b', 4, 'year', '2026-01-01', null, 'https://x', '2026-01-01', '2027-01-01', 'e', 'published'),
 ('a0000000-0000-0000-0000-000000000003', 'muszaki', 3, 'v3', 'd', 'b', 9, 'year', '2026-06-01', null, 'https://x', '2026-01-01', '2027-01-01', 'e', 'draft');
-- A's item was evaluated with v1, then re-evaluated with v2 (a new application row, unique(item_id, rule_id) allows it)
insert into public.item_rule_applications (item_id, rule_id, user_id, event_date) values
 ('11111111-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '2025-05-01'),
 ('11111111-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', '2025-05-01');

\echo '--- R1: applicable version by event date (2025 -> v1, 2026-07 -> v2, draft v3 must not appear)'
select (select_applicable_rule_version('muszaki', '2025-05-01')).version as v_2025,
       (select_applicable_rule_version('muszaki', '2026-07-01')).version as v_2026,
       (select_applicable_rule_version('muszaki', '2019-01-01')) is null as none_2019_is_null;
\echo '--- R2: re-evaluated item still listed?'
select * from items_needing_rule_reevaluation('muszaki');
\echo '--- R3: authenticated B and anon call the security definer function'
begin; set local role authenticated; select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', true);
select count(*) as b_sees_applications from public.item_rule_applications;
select item_id, user_id from items_needing_rule_reevaluation('muszaki'); rollback;
begin; set local role anon; select count(*) as anon_rows from items_needing_rule_reevaluation('muszaki'); rollback;
\echo '--- R4: B sees drafts?'
begin; set local role authenticated; select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', true);
select version, status from public.rules order by version; rollback;
\echo '--- R5: two published versions with overlapping closed ranges'
insert into public.rules (slug, version, name, description, base_date_description, valid_from, valid_to, source_url, last_reviewed_at, next_review_due, editor_name, status) values
 ('x', 1, 'n', 'd', 'b', '2020-01-01', '2030-01-01', 'u', '2026-01-01', '2027-01-01', 'e', 'published'),
 ('x', 2, 'n', 'd', 'b', '2025-01-01', '2028-01-01', 'u', '2026-01-01', '2027-01-01', 'e', 'published');
select count(*) as overlapping_published from public.rules where slug = 'x' and status = 'published';
