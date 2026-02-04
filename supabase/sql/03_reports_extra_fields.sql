-- 1) Agregar columnas (esto sí soporta IF NOT EXISTS)
alter table public.reports
  add column if not exists chapters_count int,
  add column if not exists chapters_detail text,
  add column if not exists prayer_topic text;

-- 2) Agregar constraint sin IF NOT EXISTS (workaround)
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'reports_chapters_count_nonneg'
  ) then
    alter table public.reports
      add constraint reports_chapters_count_nonneg
      check (chapters_count is null or chapters_count >= 0);
  end if;
end $$;
