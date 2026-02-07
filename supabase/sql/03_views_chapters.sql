-- 03_views_chapters.sql
-- Vistas/estadísticas basadas en capítulos (no minutos de lectura)

-- Totales por joven (solo role='youth')
create or replace view public.leader_youth_totals as
select
  p.id as user_id,
  p.name,
  p.group_id,
  coalesce(sum(r.chapters_count),0) as total_bible_chapters,
  coalesce(sum(r.prayer_minutes),0) as total_prayer_minutes,
  count(r.*) as total_reports
from public.profiles p
left join public.reports r on r.user_id = p.id
where p.role = 'youth'
group by p.id, p.name, p.group_id;

-- Totales por líder (role='leader')
create or replace view public.admin_leader_totals as
select
  p.id as user_id,
  p.name,
  p.group_id,
  coalesce(sum(r.chapters_count),0) as total_bible_chapters,
  coalesce(sum(r.prayer_minutes),0) as total_prayer_minutes,
  count(r.*) as total_reports
from public.profiles p
left join public.reports r on r.user_id = p.id
where p.role = 'leader'
group by p.id, p.name, p.group_id;

-- Helper: jóvenes por grupo
create or replace view public.group_youth_counts as
select g.id as group_id, g.name as group_name, count(p.*) as youth_count
from public.groups g
left join public.profiles p on p.group_id = g.id and p.role='youth'
group by g.id, g.name;

-- Estadísticas públicas por grupo/semana (semanas con reportes)
create or replace view public.public_group_stats_week as
with base as (
  select
    p.group_id,
    date_trunc('week', r.report_date)::date as week_start,
    sum(r.chapters_count)::bigint as total_bible_chapters,
    sum(r.prayer_minutes)::bigint as total_prayer_minutes,
    count(*)::bigint as total_reports
  from public.reports r
  join public.profiles p on p.id = r.user_id
  where p.role='youth' and p.group_id is not null
  group by 1,2
)
select
  b.group_id,
  g.name as group_name,
  b.week_start,
  yc.youth_count as active_youth,
  coalesce(b.total_bible_chapters,0) as total_bible_chapters,
  round(coalesce(b.total_bible_chapters,0)::numeric / nullif(yc.youth_count,0), 2) as avg_bible_chapters_per_youth,
  coalesce(b.total_prayer_minutes,0) as total_prayer_minutes,
  round(coalesce(b.total_prayer_minutes,0)::numeric / nullif(yc.youth_count,0), 2) as avg_prayer_minutes_per_youth,
  coalesce(b.total_reports,0) as total_reports
from base b
join public.groups g on g.id=b.group_id
join public.group_youth_counts yc on yc.group_id=b.group_id;

-- Estadísticas públicas por grupo/mes (meses con reportes)
create or replace view public.public_group_stats_month as
with base as (
  select
    p.group_id,
    date_trunc('month', r.report_date)::date as month_start,
    sum(r.chapters_count)::bigint as total_bible_chapters,
    sum(r.prayer_minutes)::bigint as total_prayer_minutes,
    count(*)::bigint as total_reports
  from public.reports r
  join public.profiles p on p.id = r.user_id
  where p.role='youth' and p.group_id is not null
  group by 1,2
)
select
  b.group_id,
  g.name as group_name,
  b.month_start,
  yc.youth_count as active_youth,
  coalesce(b.total_bible_chapters,0) as total_bible_chapters,
  round(coalesce(b.total_bible_chapters,0)::numeric / nullif(yc.youth_count,0), 2) as avg_bible_chapters_per_youth,
  coalesce(b.total_prayer_minutes,0) as total_prayer_minutes,
  round(coalesce(b.total_prayer_minutes,0)::numeric / nullif(yc.youth_count,0), 2) as avg_prayer_minutes_per_youth,
  coalesce(b.total_reports,0) as total_reports
from base b
join public.groups g on g.id=b.group_id
join public.group_youth_counts yc on yc.group_id=b.group_id;

-- Vistas para líder (misma estructura; el RLS de reports limita el acceso)
create or replace view public.leader_group_stats_week as
select * from public.public_group_stats_week;

create or replace view public.leader_group_stats_month as
select * from public.public_group_stats_month;

-- Vista admin para comparar líderes por grupo/semana (activos=líderes en el grupo)
create or replace view public.admin_public_leader_group_stats_week as
with leaders as (
  select g.id as group_id, g.name as group_name, count(p.*) as leader_count
  from public.groups g
  left join public.profiles p on p.group_id=g.id and p.role='leader'
  group by g.id, g.name
),
base as (
  select
    p.group_id,
    date_trunc('week', r.report_date)::date as week_start,
    sum(r.chapters_count)::bigint as total_bible_chapters,
    sum(r.prayer_minutes)::bigint as total_prayer_minutes,
    count(*)::bigint as total_reports
  from public.reports r
  join public.profiles p on p.id=r.user_id
  where p.role='leader' and p.group_id is not null
  group by 1,2
)
select
  b.group_id,
  g.name as group_name,
  b.week_start,
  l.leader_count as active_leaders,
  coalesce(b.total_bible_chapters,0) as total_bible_chapters,
  coalesce(b.total_prayer_minutes,0) as total_prayer_minutes,
  coalesce(b.total_reports,0) as total_reports
from base b
join public.groups g on g.id=b.group_id
join leaders l on l.group_id=b.group_id;

