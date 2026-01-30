"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Container, Card, Title, Subtitle, PageFade, Stat, Select, Badge, Divider } from "@/components/ui";
import LoadingCard from "@/components/LoadingCard";
import { Globe2, Users2, CalendarDays, BarChart3 } from "lucide-react";
import TrendLine from "@/components/charts/TrendLine";

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

type PeriodAgg = {
  key: string;
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

  const previousKey = useMemo(() => {
    const uniq = Array.from(
      new Set((mode === "week" ? weekRows.map((r) => r.week_start) : monthRows.map((r) => r.month_start)).filter(Boolean))
    );
    // ya vienen orden desc por el query
    return uniq[1] ?? null;
  }, [mode, weekRows, monthRows]);

  const rows = useMemo(() => {
    if (!latestKey) return [];
    if (mode === "week") return weekRows.filter((r) => r.week_start === latestKey);
    return monthRows.filter((r) => r.month_start === latestKey);
  }, [mode, weekRows, monthRows, latestKey]);

  const prevRows = useMemo(() => {
    if (!previousKey) return [];
    if (mode === "week") return weekRows.filter((r) => r.week_start === previousKey);
    return monthRows.filter((r) => r.month_start === previousKey);
  }, [mode, weekRows, monthRows, previousKey]);

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

  const prevGlobal = useMemo(() => {
    return prevRows.reduce(
      (acc: any, r: any) => {
        acc.active_youth += Number(r.active_youth ?? 0);
        acc.total_bible_minutes += Number(r.total_bible_minutes ?? 0);
        acc.total_prayer_minutes += Number(r.total_prayer_minutes ?? 0);
        acc.total_reports += Number(r.total_reports ?? 0);
        return acc;
      },
      { active_youth: 0, total_bible_minutes: 0, total_prayer_minutes: 0, total_reports: 0 }
    );
  }, [prevRows]);

  const derived = useMemo(() => {
    const act = Math.max(1, Number(global.active_youth || 0));
    const rep = Math.max(1, Number(global.total_reports || 0));
    return {
      biblePerActive: Number(global.total_bible_minutes || 0) / act,
      prayerPerActive: Number(global.total_prayer_minutes || 0) / act,
      reportsPerActive: Number(global.total_reports || 0) / act,
      biblePerReport: Number(global.total_bible_minutes || 0) / rep,
      prayerPerReport: Number(global.total_prayer_minutes || 0) / rep,
    };
  }, [global]);

  function pct(now: number, prev: number) {
    const p = Number(prev || 0);
    if (!Number.isFinite(p) || p === 0) return null;
    return ((Number(now || 0) - p) / p) * 100;
  }

  const deltas = useMemo(() => {
    if (!previousKey) return null;
    return {
      active: pct(global.active_youth, prevGlobal.active_youth),
      bible: pct(global.total_bible_minutes, prevGlobal.total_bible_minutes),
      prayer: pct(global.total_prayer_minutes, prevGlobal.total_prayer_minutes),
      reports: pct(global.total_reports, prevGlobal.total_reports),
    };
  }, [previousKey, global, prevGlobal]);

  const trendData = useMemo(() => {
    // Agregamos por periodo y tomamos los últimos 8 (para que sea legible en móvil)
    const src = mode === "week" ? weekRows : monthRows;
    const keyField = mode === "week" ? "week_start" : "month_start";
    const map = new Map<string, PeriodAgg>();
    for (const r of src as any[]) {
      const k = String(r[keyField] ?? "");
      if (!k) continue;
      const cur = map.get(k) ?? { key: k, active_youth: 0, total_bible_minutes: 0, total_prayer_minutes: 0, total_reports: 0 };
      cur.active_youth += Number(r.active_youth ?? 0);
      cur.total_bible_minutes += Number(r.total_bible_minutes ?? 0);
      cur.total_prayer_minutes += Number(r.total_prayer_minutes ?? 0);
      cur.total_reports += Number(r.total_reports ?? 0);
      map.set(k, cur);
    }
    const periods = Array.from(map.values()).sort((a, b) => (a.key > b.key ? 1 : -1));
    const last = periods.slice(Math.max(0, periods.length - 8));
    return last.map((p) => ({
      label: p.key,
      bible: p.total_bible_minutes,
      prayer: p.total_prayer_minutes,
    }));
  }, [mode, weekRows, monthRows]);

  const topGroups = useMemo(() => {
    const list = [...rows];
    const by = (k: keyof WeekRow | keyof MonthRow) => [...list].sort((a: any, b: any) => Number(b[k] ?? 0) - Number(a[k] ?? 0)).slice(0, 3);
    return {
      active: by("active_youth" as any),
      bible: by("total_bible_minutes" as any),
      prayer: by("total_prayer_minutes" as any),
      reports: by("total_reports" as any),
    };
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
                  <div>
                    <Stat label="Activos (suma de grupos)" value={global.active_youth} />
                    {deltas?.active != null && (
                      <div className="mt-2">
                        <Badge className={deltas.active >= 0 ? "text-emerald-200" : "text-rose-200"}>
                          {deltas.active >= 0 ? "▲" : "▼"} {Math.abs(deltas.active).toFixed(1)}% vs {previousKey}
                        </Badge>
                      </div>
                    )}
                  </div>
                  <div>
                    <Stat label="Lectura total" value={formatearMinutos(global.total_bible_minutes)} />
                    {deltas?.bible != null && (
                      <div className="mt-2">
                        <Badge className={deltas.bible >= 0 ? "text-emerald-200" : "text-rose-200"}>
                          {deltas.bible >= 0 ? "▲" : "▼"} {Math.abs(deltas.bible).toFixed(1)}% vs {previousKey}
                        </Badge>
                      </div>
                    )}
                  </div>
                  <div>
                    <Stat label="Oración total" value={formatearMinutos(global.total_prayer_minutes)} />
                    {deltas?.prayer != null && (
                      <div className="mt-2">
                        <Badge className={deltas.prayer >= 0 ? "text-emerald-200" : "text-rose-200"}>
                          {deltas.prayer >= 0 ? "▲" : "▼"} {Math.abs(deltas.prayer).toFixed(1)}% vs {previousKey}
                        </Badge>
                      </div>
                    )}
                  </div>
                  <div>
                    <Stat label="Reportes" value={global.total_reports} />
                    {deltas?.reports != null && (
                      <div className="mt-2">
                        <Badge className={deltas.reports >= 0 ? "text-emerald-200" : "text-rose-200"}>
                          {deltas.reports >= 0 ? "▲" : "▼"} {Math.abs(deltas.reports).toFixed(1)}% vs {previousKey}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>

                <Divider className="my-5" />

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <Stat label="Lectura / activo" value={formatearMinutos(derived.biblePerActive)} />
                  <Stat label="Oración / activo" value={formatearMinutos(derived.prayerPerActive)} />
                  <Stat label="Reportes / activo" value={derived.reportsPerActive.toFixed(2)} />
                  <Stat label="Lectura / reporte" value={formatearMinutos(derived.biblePerReport)} />
                  <Stat label="Oración / reporte" value={formatearMinutos(derived.prayerPerReport)} />
                </div>
              </Card>

              {trendData.length >= 2 && (
                <Card>
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <div className="text-sm font-semibold">Tendencia reciente</div>
                      <div className="text-xs text-white/60 mt-1">
                        {mode === "week" ? "Últimas semanas (global)" : "Últimos meses (global)"}
                      </div>
                    </div>
                    <Badge>Lectura vs Oración</Badge>
                  </div>
                  <div className="mt-4">
                    <TrendLine data={trendData} height={280} />
                  </div>
                </Card>
              )}

              <Card>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <div className="text-sm font-semibold">Destacados por grupo</div>
                    <div className="text-xs text-white/60 mt-1">Top 3 en el periodo actual</div>
                  </div>
                  <Badge>{mode === "week" ? "Semana" : "Mes"}</Badge>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="glass rounded-2xl p-4">
                    <div className="text-xs text-white/60">Más activos</div>
                    <div className="mt-2 space-y-2">
                      {topGroups.active.map((g: any, idx: number) => (
                        <div key={g.group_id} className="flex items-center justify-between gap-3">
                          <div className="truncate"><span className="text-white/60 mr-2">#{idx + 1}</span><span className="font-medium">{g.group_name}</span></div>
                          <Badge>{g.active_youth}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="glass rounded-2xl p-4">
                    <div className="text-xs text-white/60">Más lectura</div>
                    <div className="mt-2 space-y-2">
                      {topGroups.bible.map((g: any, idx: number) => (
                        <div key={g.group_id} className="flex items-center justify-between gap-3">
                          <div className="truncate"><span className="text-white/60 mr-2">#{idx + 1}</span><span className="font-medium">{g.group_name}</span></div>
                          <Badge>{formatearMinutos(g.total_bible_minutes)}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="glass rounded-2xl p-4">
                    <div className="text-xs text-white/60">Más oración</div>
                    <div className="mt-2 space-y-2">
                      {topGroups.prayer.map((g: any, idx: number) => (
                        <div key={g.group_id} className="flex items-center justify-between gap-3">
                          <div className="truncate"><span className="text-white/60 mr-2">#{idx + 1}</span><span className="font-medium">{g.group_name}</span></div>
                          <Badge>{formatearMinutos(g.total_prayer_minutes)}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="glass rounded-2xl p-4">
                    <div className="text-xs text-white/60">Más reportes</div>
                    <div className="mt-2 space-y-2">
                      {topGroups.reports.map((g: any, idx: number) => (
                        <div key={g.group_id} className="flex items-center justify-between gap-3">
                          <div className="truncate"><span className="text-white/60 mr-2">#{idx + 1}</span><span className="font-medium">{g.group_name}</span></div>
                          <Badge>{g.total_reports}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="flex items-center gap-2 mb-2">
                  <Users2 size={18} className="opacity-80" />
                  <div className="text-sm font-semibold">Por grupo</div>
                </div>
                <Subtitle>Comparación simple entre grupos.</Subtitle>

                {/* Mobile: cards */}
                <div className="mt-4 space-y-3 md:hidden">
                  {rows.map((r: any) => (
                    <div key={r.group_id} className="glass rounded-2xl p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="font-semibold truncate">{r.group_name}</div>
                        <Badge>{r.active_youth} activos</Badge>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                        <div className="text-white/70">Lectura</div>
                        <div className="text-right">{formatearMinutos(r.total_bible_minutes)}</div>
                        <div className="text-white/70">Oración</div>
                        <div className="text-right">{formatearMinutos(r.total_prayer_minutes)}</div>
                        <div className="text-white/70">Reportes</div>
                        <div className="text-right">{r.total_reports}</div>
                        <div className="text-white/70">Lectura / activo</div>
                        <div className="text-right">{formatearMinutos(Number(r.total_bible_minutes || 0) / Math.max(1, Number(r.active_youth || 0)))}</div>
                        <div className="text-white/70">Oración / activo</div>
                        <div className="text-right">{formatearMinutos(Number(r.total_prayer_minutes || 0) / Math.max(1, Number(r.active_youth || 0)))}</div>
                      </div>
                    </div>
                  ))}

                  {rows.length === 0 && (
                    <div className="text-white/70 text-sm">No hay datos en este periodo.</div>
                  )}
                </div>

                {/* Desktop: table */}
                <div className="mt-4 overflow-auto hidden md:block">
                  <table className="w-full text-sm">
                    <thead className="text-white/70">
                      <tr className="border-b border-white/10">
                        <th className="text-left py-3 pr-3">Grupo</th>
                        <th className="text-left py-3 pr-3">Activos</th>
                        <th className="text-left py-3 pr-3">Lectura</th>
                        <th className="text-left py-3 pr-3">Oración</th>
                        <th className="text-left py-3 pr-3">Reportes</th>
                        <th className="text-left py-3 pr-3">Lectura/activo</th>
                        <th className="text-left py-3 pr-3">Oración/activo</th>
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
                          <td className="py-3 pr-3">{formatearMinutos(Number(r.total_bible_minutes || 0) / Math.max(1, Number(r.active_youth || 0)))}</td>
                          <td className="py-3 pr-3">{formatearMinutos(Number(r.total_prayer_minutes || 0) / Math.max(1, Number(r.active_youth || 0)))}</td>
                        </tr>
                      ))}

                      {rows.length === 0 && (
                        <tr>
                          <td className="py-4 text-white/70" colSpan={7}>
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
