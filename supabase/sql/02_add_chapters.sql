-- Agrega columna para capítulos (lectura por cantidad)
alter table public.reports
add column if not exists chapters_count integer not null default 0;

-- Backfill opcional:
-- Si antes usabas bible_minutes, NO podemos inferir capítulos automáticamente.
-- Deja chapters_count=0 para reportes antiguos, o llena manualmente si lo deseas.
