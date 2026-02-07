-- Views de estadísticas (compatibles con el frontend antiguo)
-- IMPORTANTE: Conservamos los nombres de columnas (total_bible_minutes, etc.)
-- pero "total_bible_minutes" ahora representa SUMA de capítulos (chapters_count).

drop view if exists public.public_group_stats_week cascade;
drop view if exists public.public_group_stats_month cascade;
drop view if exists public.leader_group_stats_week cascade;
drop view if exists public.leader_group_stats_month cascade;
drop view if exists public.leader_youth_totals cascade;
drop view if exists public.admin_public_leader_group_stats_week cascade;
drop view if exists public.admin_leader_totals cascade;

-- Jóvenes por grupo (semanal)
create view public.public_group_stats_week as
with youth as (
  select id as user_id, group_id
  from public.profiles
  where role = 'youth' and group_id is not null
),
reports_w as (
  select
    y.group_id,
    date_trunc('week', r.report_date)::date as week_start,
    sum(coalesce(r.chapters_count,0))::bigint as total_bible_minutes,
    sum(coalesce(r.prayer_minutes,0))::bigint as total_prayer_minutes,
    count(*)::bigint as total_reports
  from public.reports r
  join youth y on y.user_id = r.user_id
  group by 1,2
),
active as (
  select group_id, count(*)::bigint as active_youth
  from youth
  group by 1
)
select
  g.id as group_id,
  g.name as group_name,
  rw.week_start,
  coalesce(a.active_youth,0) as active_youth,
  coalesce(rw.total_bible_minutes,0) as total_bible_minutes,
  coalesce(rw.total_prayer_minutes,0) as total_prayer_minutes,
  coalesce(rw.total_reports,0) as total_reports
from public.groups g
join reports_w rw on rw.group_id = g.id
left join active a on a.group_id = g.id;

-- Jóvenes por grupo (mensual)
create view public.public_group_stats_month as
with youth as (
  select id as user_id, group_id
  from public.profiles
  where role = 'youth' and group_id is not null
),
reports_m as (
  select
    y.group_id,
    date_trunc('month', r.report_date)::date as month_start,
    sum(coalesce(r.chapters_count,0))::bigint as total_bible_minutes,
    sum(coalesce(r.prayer_minutes,0))::bigint as total_prayer_minutes,
    count(*)::bigint as total_reports
  from public.reports r
  join youth y on y.user_id = r.user_id
  group by 1,2
),
active as (
  select group_id, count(*)::bigint as active_youth
  from youth
  group by 1
)
select
  g.id as group_id,
  g.name as group_name,
  rm.month_start,
  coalesce(a.active_youth,0) as active_youth,
  coalesce(rm.total_bible_minutes,0) as total_bible_minutes,
  coalesce(rm.total_prayer_minutes,0) as total_prayer_minutes,
  coalesce(rm.total_reports,0) as total_reports
from public.groups g
join reports_m rm on rm.group_id = g.id
left join active a on a.group_id = g.id;

-- Líder: stats de su grupo (semanal)
create view public.leader_group_stats_week as
with leader as (
  select id as leader_id, group_id
  from public.profiles
  where role = 'leader' and group_id is not null
),
youth as (
  select id as user_id, group_id
  from public.profiles
  where role = 'youth' and group_id is not null
),
reports_w as (
  select
    y.group_id,
    date_trunc('week', r.report_date)::date as week_start,
    sum(coalesce(r.chapters_count,0))::bigint as total_bible_minutes,
    sum(coalesce(r.prayer_minutes,0))::bigint as total_prayer_minutes,
    count(*)::bigint as total_reports
  from public.reports r
  join youth y on y.user_id = r.user_id
  group by 1,2
),
active as (
  select group_id, count(*)::bigint as active_youth
  from youth
  group by 1
)
select
  g.id as group_id,
  rw.week_start,
  coalesce(a.active_youth,0) as active_youth,
  coalesce(rw.total_bible_minutes,0) as total_bible_minutes,
  coalesce(rw.total_prayer_minutes,0) as total_prayer_minutes,
  coalesce(rw.total_reports,0) as total_reports
from public.groups g
join reports_w rw on rw.group_id = g.id
left join active a on a.group_id = g.id;

-- Líder: stats de su grupo (mensual)
create view public.leader_group_stats_month as
with youth as (
  select id as user_id, group_id
  from public.profiles
  where role = 'youth' and group_id is not null
),
reports_m as (
  select
    y.group_id,
    date_trunc('month', r.report_date)::date as month_start,
    sum(coalesce(r.chapters_count,0))::bigint as total_bible_minutes,
    sum(coalesce(r.prayer_minutes,0))::bigint as total_prayer_minutes,
    count(*)::bigint as total_reports
  from public.reports r
  join youth y on y.user_id = r.user_id
  group by 1,2
),
active as (
  select group_id, count(*)::bigint as active_youth
  from youth
  group by 1
)
select
  g.id as group_id,
  rm.month_start,
  coalesce(a.active_youth,0) as active_youth,
  coalesce(rm.total_bible_minutes,0) as total_bible_minutes,
  coalesce(rm.total_prayer_minutes,0) as total_prayer_minutes,
  coalesce(rm.total_reports,0) as total_reports
from public.groups g
join reports_m rm on rm.group_id = g.id
left join active a on a.group_id = g.id;

-- Líder: totales por joven (incluye jóvenes sin reportes)
create view public.leader_youth_totals as
with youth as (
  select id as user_id, name, group_id
  from public.profiles
  where role = 'youth' and group_id is not null
),
agg as (
  select
    r.user_id,
    sum(coalesce(r.chapters_count,0))::bigint as total_bible_minutes,
    sum(coalesce(r.prayer_minutes,0))::bigint as total_prayer_minutes,
    count(*)::bigint as total_reports
  from public.reports r
  group by 1
)
select
  y.user_id,
  y.name,
  y.group_id,
  coalesce(a.total_bible_minutes,0) as total_bible_minutes,
  coalesce(a.total_prayer_minutes,0) as total_prayer_minutes,
  coalesce(a.total_reports,0) as total_reports
from youth y
left join agg a on a.user_id = y.user_id;

-- Admin: stats de líderes (por grupo / semana)
create view public.admin_public_leader_group_stats_week as
with leaders as (
  select id as user_id, group_id
  from public.profiles
  where role = 'leader' and group_id is not null
),
reports_w as (
  select
    l.group_id,
    date_trunc('week', r.report_date)::date as week_start,
    sum(coalesce(r.chapters_count,0))::bigint as total_bible_minutes,
    sum(coalesce(r.prayer_minutes,0))::bigint as total_prayer_minutes,
    count(*)::bigint as total_reports
  from public.reports r
  join leaders l on l.user_id = r.user_id
  group by 1,2
),
active as (
  select group_id, count(*)::bigint as active_leaders
  from leaders
  group by 1
)
select
  g.id as group_id,
  g.name as group_name,
  rw.week_start,
  coalesce(a.active_leaders,0) as active_leaders,
  coalesce(rw.total_bible_minutes,0) as total_bible_minutes,
  coalesce(rw.total_prayer_minutes,0) as total_prayer_minutes,
  coalesce(rw.total_reports,0) as total_reports
from public.groups g
join reports_w rw on rw.group_id = g.id
left join active a on a.group_id = g.id;

-- Admin: totales por líder (incluye líderes sin reportes)
create view public.admin_leader_totals as
with leaders as (
  select id as user_id, name, group_id
  from public.profiles
  where role = 'leader'
),
agg as (
  select
    r.user_id,
    sum(coalesce(r.chapters_count,0))::bigint as total_bible_minutes,
    sum(coalesce(r.prayer_minutes,0))::bigint as total_prayer_minutes,
    count(*)::bigint as total_reports
  from public.reports r
  group by 1
)
select
  l.user_id,
  l.name,
  l.group_id,
  coalesce(a.total_bible_minutes,0) as total_bible_minutes,
  coalesce(a.total_prayer_minutes,0) as total_prayer_minutes,
  coalesce(a.total_reports,0) as total_reports
from leaders l
left join agg a on a.user_id = l.user_id;
