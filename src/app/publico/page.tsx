"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { cached, invalidate } from "@/lib/cache";
import { Container, Card, Title, Subtitle, PageFade, Stat, Select } from "@/components/ui";
import LoadingCard from "@/components/LoadingCard";
import { Globe2, Users2, CalendarDays, BarChart3 } from "lucide-react";

type WeekRow = {
  group_id: string;
  group_name: string;
  week_start: string;
  active_youth: number;
  total_bible_minutes: number;
  total_prayer_minutes: number;
  total_reports: number;
};

type MonthRow = {
  group_id: string;
  group_name: string;
  month_start: string;
  active_youth: number;
  total_bible_minutes: number;
  total_prayer_minutes: number;
  total_reports: number;
};

function formatearMinutos(min: number) {
  const t = Number.isFinite(min) ? Math.max(0, Math.floor(min)) : 0;
  const h = Math.floor(t / 60);
  const m = t % 60;
  if (h <= 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

export default function PublicoPage() {
  const [mode, setMode] = useState<"week" | "month">("week");

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const [weekRows, setWeekRows] = useState<WeekRow[]>([]);
  const [monthRows, setMonthRows] = useState<MonthRow[]>([]);

  const latestKey = useMemo(() => {
    if (mode === "week") return weekRows[0]?.week_start ?? null;
    return monthRows[0]?.month_start ?? null;
  }, [mode, weekRows, monthRows]);

  const rows = useMemo(() => {
    if (!latestKey) return [];
    if (mode === "week") return weekRows.filter((r) => r.week_start === latestKey);
    return monthRows.filter((r) => r.month_start === latestKey);
  }, [mode, weekRows, monthRows, latestKey]);

  const global = useMemo(() => {
    return rows.reduce(
      (acc: any, r: any) => {
        acc.active_youth += Number(r.active_youth ?? 0);
        acc.total_bible_minutes += Number(r.total_bible_minutes ?? 0);
        acc.total_prayer_minutes += Number(r.total_prayer_minutes ?? 0);
        acc.total_reports += Number(r.total_reports ?? 0);
        return acc;
      },
      { active_youth: 0, total_bible_minutes: 0, total_prayer_minutes: 0, total_reports: 0 }
    );
  }, [rows]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setMsg("");

      // Cargamos SOLO lo más reciente (orden desc y traemos algunas filas)
      const [wRes, mRes] = await Promise.all([
        supabase.from("public_group_stats_week").select("*").order("week_start", { ascending: false }).limit(50),
        supabase.from("public_group_stats_month").select("*").order("month_start", { ascending: false }).limit(50),
      ]);

      if (wRes.error) setMsg("No se pudieron cargar las estadísticas semanales públicas.");
      if (mRes.error) setMsg("No se pudieron cargar las estadísticas mensuales públicas.");

      setWeekRows((wRes.data ?? []) as WeekRow[]);
      setMonthRows((mRes.data ?? []) as MonthRow[]);

      setLoading(false);
    })();
  }, []);

  if (loading) return <LoadingCard text="Cargando estadísticas públicas…" />;

  return (
    <Container>
      <PageFade>
        <div className="grid gap-6">
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2">
                <Globe2 size={18} className="opacity-80" />
                <Title>Estadísticas públicas</Title>
              </div>
              <Subtitle>Vista global y por grupo (sin detalles personales).</Subtitle>
            </div>

            <div className="w-full sm:w-64">
              <div className="text-xs text-white/60 mb-1">Vista</div>
              <Select value={mode} onChange={(e) => setMode(e.target.value as any)}>
                <option value="week">Semana (más reciente)</option>
                <option value="month">Mes (más reciente)</option>
              </Select>
            </div>
          </div>

          {msg && <div className="text-red-300 text-sm">{msg}</div>}

          {!latestKey ? (
            <Card>
              <Title>Aún no hay reportes</Title>
              <Subtitle>Cuando se registren reportes, aquí aparecerán las estadísticas.</Subtitle>
            </Card>
          ) : (
            <>
              <Card>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2">
                      {mode === "week" ? <CalendarDays size={18} className="opacity-80" /> : <BarChart3 size={18} className="opacity-80" />}
                      <div className="text-sm font-semibold">Global</div>
                    </div>
                    <div className="text-xs text-white/60 mt-1">
                      {mode === "week" ? `Semana: ${latestKey}` : `Mes: ${latestKey}`}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Stat label="Activos (suma de grupos)" value={global.active_youth} />
                  <Stat label="Lectura total" value={formatearMinutos(global.total_bible_minutes)} />
                  <Stat label="Oración total" value={formatearMinutos(global.total_prayer_minutes)} />
                  <Stat label="Reportes" value={global.total_reports} />
                </div>
              </Card>

              <Card>
                <div className="flex items-center gap-2 mb-2">
                  <Users2 size={18} className="opacity-80" />
                  <div className="text-sm font-semibold">Por grupo</div>
                </div>
                <Subtitle>Comparación simple entre grupos.</Subtitle>

                <div className="mt-4 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="text-white/70">
                      <tr className="border-b border-white/10">
                        <th className="text-left py-3 pr-3">Grupo</th>
                        <th className="text-left py-3 pr-3">Activos</th>
                        <th className="text-left py-3 pr-3">Lectura</th>
                        <th className="text-left py-3 pr-3">Oración</th>
                        <th className="text-left py-3 pr-3">Reportes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r: any) => (
                        <tr key={r.group_id} className="border-b border-white/5">
                          <td className="py-3 pr-3 font-medium">{r.group_name}</td>
                          <td className="py-3 pr-3">{r.active_youth}</td>
                          <td className="py-3 pr-3">{formatearMinutos(r.total_bible_minutes)}</td>
                          <td className="py-3 pr-3">{formatearMinutos(r.total_prayer_minutes)}</td>
                          <td className="py-3 pr-3">{r.total_reports}</td>
                        </tr>
                      ))}

                      {rows.length === 0 && (
                        <tr>
                          <td className="py-4 text-white/70" colSpan={5}>
                            No hay datos en este periodo.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </div>
      </PageFade>
    </Container>
  );
}
