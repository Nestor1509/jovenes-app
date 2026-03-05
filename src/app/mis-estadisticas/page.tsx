"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabaseClient";
import {
  Container,
  Card,
  Title,
  Subtitle,
  PageFade,
  Button,
  Skeleton,
  EmptyState,
  Badge,
} from "@/components/ui";

import {
  CalendarDays,
  BookOpen,
  HeartHandshake,
  FileText,
  Sparkles,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";

const TrendLine = dynamic(() => import("@/components/charts/TrendLine"), { ssr: false });
import { ChartCard } from "@/components/charts/ChartCard";

type Totales = {
  total_bible_minutes: number; // (en tu app esto equivale a "Capítulos")
  total_prayer_minutes: number;
  total_reports: number;
};

type ReportRow = {
  report_date: string; // YYYY-MM-DD
  bible_minutes: number | null;
  prayer_minutes: number | null;
};

type Period = "week" | "month" | "all";

function formatearMinutos(min: number) {
  const t = Number.isFinite(min) ? Math.max(0, Math.floor(min)) : 0;
  const h = Math.floor(t / 60);
  const m = t % 60;
  if (h <= 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

function formatearCapitulos(v: number) {
  const n = Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0;
  return String(n);
}

/** Fecha local YYYY-MM-DD (evita bugs de UTC) */
function hoyISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function addDaysISO(dateISO: string, days: number) {
  const d = new Date(dateISO + "T00:00:00");
  d.setDate(d.getDate() + days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function inicioSemanaISO(dateISO: string) {
  const d = new Date(dateISO + "T00:00:00");
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // lunes
  d.setDate(d.getDate() + diff);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function inicioMesISO(dateISO: string) {
  return dateISO.slice(0, 7) + "-01";
}

function inicioMesAnteriorISO(monthStartISO: string) {
  const d = new Date(monthStartISO + "T00:00:00");
  d.setMonth(d.getMonth() - 1);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}-01`;
}

function sumar(rows: ReportRow[]): Totales {
  let b = 0,
    o = 0,
    c = 0;
  for (const r of rows) {
    b += Number(r.bible_minutes ?? 0);
    o += Number(r.prayer_minutes ?? 0);
    c += 1;
  }
  return { total_bible_minutes: b, total_prayer_minutes: o, total_reports: c };
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function Segmented({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="grid grid-cols-3 gap-1 rounded-2xl border border-white/10 bg-black/20 p-1">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={[
              "rounded-xl px-3 py-2 text-sm font-medium transition",
              active ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5",
            ].join(" ")}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function DeltaPill({
  delta,
  suffix = "",
}: {
  delta: number;
  suffix?: string;
}) {
  const d = Math.floor(delta);
  const isZero = d === 0;
  const isPos = d > 0;

  const Icon = isZero ? Minus : isPos ? ArrowUpRight : ArrowDownRight;

  return (
    <div
      className={[
        "inline-flex items-center gap-1 rounded-2xl border px-2 py-1 text-[11px]",
        isZero
          ? "border-white/10 text-white/60 bg-white/5"
          : isPos
          ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
          : "border-rose-400/20 bg-rose-500/10 text-rose-200",
      ].join(" ")}
      title="Comparado con el periodo anterior"
    >
      <Icon size={12} className="opacity-90" />
      <span className="font-medium">
        {isZero ? "Igual" : `${isPos ? "+" : ""}${d}${suffix}`}
      </span>
      <span className="opacity-70">vs anterior</span>
    </div>
  );
}

function StatCard({
  icon,
  title,
  value,
  subtitle,
  deltaNode,
  progressPct,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle?: string;
  deltaNode?: React.ReactNode;
  progressPct?: number; // 0..100
}) {
  const pct = typeof progressPct === "number" ? clamp(progressPct, 0, 100) : null;

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-2xl border border-white/10 bg-white/5 grid place-items-center">
            {icon}
          </div>
          <div className="min-w-0">
            <div className="text-xs text-white/60">{title}</div>
            <div className="text-2xl font-semibold leading-tight">{value}</div>
          </div>
        </div>
        <div className="shrink-0">{deltaNode}</div>
      </div>

      {subtitle ? <div className="mt-2 text-[12px] text-white/55">{subtitle}</div> : null}

      {pct !== null ? (
        <div className="mt-3">
          <div className="h-2 w-full rounded-full bg-white/5 border border-white/10 overflow-hidden">
            <div className="h-full rounded-full bg-white/30" style={{ width: `${pct}%` }} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function MisEstadisticasPage() {
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const [nombre, setNombre] = useState<string>("");
  const [rol, setRol] = useState<string>("");

  const [period, setPeriod] = useState<Period>("week");

  const [reports, setReports] = useState<ReportRow[]>([]);
  const today = useMemo(() => hoyISO(), []);
  const weekStart = useMemo(() => inicioSemanaISO(today), [today]);
  const monthStart = useMemo(() => inicioMesISO(today), [today]);

  // Para deltas vs periodo anterior
  const prevWeekStart = useMemo(() => addDaysISO(weekStart, -7), [weekStart]);
  const prevWeekEnd = useMemo(() => addDaysISO(weekStart, -1), [weekStart]);

  const prevMonthStart = useMemo(() => inicioMesAnteriorISO(monthStart), [monthStart]);
  const prevMonthEnd = useMemo(() => addDaysISO(monthStart, -1), [monthStart]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setMsg("");

      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        window.location.href = "/";
        return;
      }

      const userId = sess.session.user.id;

      const { data: p, error: pErr } = await supabase
        .from("profiles")
        .select("name, role")
        .eq("id", userId)
        .single();

      if (pErr || !p) {
        setMsg("No se pudo cargar tu perfil.");
        setLoading(false);
        return;
      }

      setNombre(p.name);
      setRol(p.role);

      const { data: rRows, error: rErr } = await supabase
        .from("reports")
        .select("report_date, bible_minutes, prayer_minutes")
        .eq("user_id", userId)
        .order("report_date", { ascending: true });

      if (rErr) {
        setMsg("No se pudieron cargar tus reportes.");
        setLoading(false);
        return;
      }

      setReports((rRows ?? []) as ReportRow[]);
      setLoading(false);
    })();
  }, []);

  const rolBonito = rol === "admin" ? "Admin" : rol === "leader" ? "Líder" : "Joven";

  const range = useMemo(() => {
    if (period === "week") return { start: weekStart, end: today, label: "Semana", since: `Desde ${weekStart}` };
    if (period === "month") return { start: monthStart, end: today, label: "Mes", since: `Desde ${monthStart}` };
    return { start: "", end: "", label: "Histórico", since: "Todo el tiempo" };
  }, [period, weekStart, monthStart, today]);

  const rowsInRange = useMemo(() => {
    if (period === "all") return reports;
    return reports.filter((r) => r.report_date >= range.start && r.report_date <= range.end);
  }, [reports, period, range.start, range.end]);

  const totals = useMemo(() => sumar(rowsInRange), [rowsInRange]);

  const prevTotals = useMemo(() => {
    if (period === "week") {
      const prevRows = reports.filter((r) => r.report_date >= prevWeekStart && r.report_date <= prevWeekEnd);
      return sumar(prevRows);
    }
    if (period === "month") {
      const prevRows = reports.filter((r) => r.report_date >= prevMonthStart && r.report_date <= prevMonthEnd);
      return sumar(prevRows);
    }
    return null;
  }, [period, reports, prevWeekStart, prevWeekEnd, prevMonthStart, prevMonthEnd]);

  const deltas = useMemo(() => {
    if (!prevTotals) return null;
    return {
      bible: totals.total_bible_minutes - prevTotals.total_bible_minutes,
      prayer: totals.total_prayer_minutes - prevTotals.total_prayer_minutes,
      reports: totals.total_reports - prevTotals.total_reports,
    };
  }, [prevTotals, totals]);

  // Streak: días consecutivos con reporte (terminando HOY)
  const streakDays = useMemo(() => {
    if (reports.length === 0) return 0;
    const set = new Set(reports.map((r) => r.report_date));
    let cur = today;
    let streak = 0;
    while (set.has(cur)) {
      streak += 1;
      cur = addDaysISO(cur, -1);
      if (streak > 365) break;
    }
    return streak;
  }, [reports, today]);

  // Días activos en el periodo seleccionado + promedio por día del periodo
  const periodDays = useMemo(() => {
    if (period === "all") return null;
    const start = new Date(range.start + "T00:00:00");
    const end = new Date(range.end + "T00:00:00");
    const diffMs = end.getTime() - start.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, days);
  }, [period, range.start, range.end]);

  const activeDays = useMemo(() => {
    const set = new Set(rowsInRange.map((r) => r.report_date));
    return set.size;
  }, [rowsInRange]);

  const avgPerDay = useMemo(() => {
    if (!periodDays) return null;
    return {
      bible: totals.total_bible_minutes / periodDays,
      prayer: totals.total_prayer_minutes / periodDays,
      reports: totals.total_reports / periodDays,
    };
  }, [totals, periodDays]);

  // Mejor día del periodo (por suma de lectura+oración)
  const bestDay = useMemo(() => {
    if (rowsInRange.length === 0) return null;
    let best: { date: string; score: number; bible: number; prayer: number } | null = null;
    for (const r of rowsInRange) {
      const bible = Number(r.bible_minutes ?? 0);
      const prayer = Number(r.prayer_minutes ?? 0);
      const score = bible + prayer;
      if (!best || score > best.score) best = { date: r.report_date, score, bible, prayer };
    }
    return best;
  }, [rowsInRange]);

  /**
   * ✅ Tendencia “mejor UX”:
   * - Semana/Mes => DIA A DIA (rellenando días sin reporte en 0)
   * - Histórico => MES A MES (para que sea legible)
   */
  const trendMode = useMemo<"daily" | "monthly">(() => {
    if (period === "all") return "monthly";
    return "daily";
  }, [period]);

  const trendData = useMemo(() => {
    if (trendMode === "monthly") {
      // MES A MES (histórico)
      const map = new Map<string, { lectura: number; oracion: number }>();
      for (const r of reports) {
        const k = r.report_date.slice(0, 7); // YYYY-MM
        const cur = map.get(k) ?? { lectura: 0, oracion: 0 };
        cur.lectura += Number(r.bible_minutes ?? 0);
        cur.oracion += Number(r.prayer_minutes ?? 0);
        map.set(k, cur);
      }
      return [...map.entries()]
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([k, v]) => ({ label: k, lectura: v.lectura, oracion: v.oracion }));
    }

    // DIA A DIA (semana/mes)
    let start = weekStart;
    let end = today;
    let daysToFill = 7;

    if (period === "month") {
      start = addDaysISO(today, -29); // últimos 30 días
      daysToFill = 30;
    }

    const map = new Map<string, { lectura: number; oracion: number }>();

    // Rellenar con 0 para línea continua
    for (let i = 0; i < daysToFill; i++) {
      const k = addDaysISO(start, i);
      map.set(k, { lectura: 0, oracion: 0 });
    }

    for (const r of reports) {
      if (r.report_date < start || r.report_date > end) continue;
      const k = r.report_date;
      const cur = map.get(k) ?? { lectura: 0, oracion: 0 };
      cur.lectura += Number(r.bible_minutes ?? 0);
      cur.oracion += Number(r.prayer_minutes ?? 0);
      map.set(k, cur);
    }

    return [...map.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([k, v]) => ({ label: k, lectura: v.lectura, oracion: v.oracion }));
  }, [trendMode, reports, period, today, weekStart]);

  const hasTrendData = useMemo(() => {
    return trendData.some((d) => Number(d.lectura ?? 0) > 0 || Number(d.oracion ?? 0) > 0);
  }, [trendData]);

  // Para barras/progreso “bonito”
  const topForBars = useMemo(() => {
    const b = totals.total_bible_minutes;
    const p = totals.total_prayer_minutes;
    const r = totals.total_reports;
    return Math.max(1, b, p, r);
  }, [totals]);

  if (loading && reports.length === 0) {
    return (
      <Container>
        <PageFade>
          <div className="grid gap-6">
            <div>
              <Skeleton className="h-7 w-56" />
              <Skeleton className="mt-2 h-4 w-72" />
            </div>
            <div className="grid gap-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-28 w-full" />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
            <Skeleton className="h-[360px]" />
          </div>
        </PageFade>
      </Container>
    );
  }

  return (
    <Container>
      <PageFade>
        <div className="grid gap-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <Title>Mis estadísticas</Title>
              <Subtitle>{nombre ? `${nombre} — ${rolBonito}` : "Cargando…"}</Subtitle>
            </div>

            <div className="w-full sm:w-[420px]">
              <Segmented
                value={period}
                onChange={(v) => setPeriod(v as Period)}
                options={[
                  { value: "week", label: "Semana" },
                  { value: "month", label: "Mes" },
                  { value: "all", label: "Histórico" },
                ]}
              />
            </div>
          </div>

          {msg && <div className="text-red-300 text-sm">{msg}</div>}

          {/* Hero / Summary */}
          <Card className="p-4 bg-black/20 border border-white/10">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-2xl border border-white/10 bg-white/5 grid place-items-center shrink-0">
                    <Sparkles size={18} className="opacity-85" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">Resumen — {range.label}</div>
                    <div className="text-[12px] text-white/60 flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays size={14} className="opacity-70" /> {range.since}
                      </span>
                      {period !== "all" ? (
                        <>
                          <span className="opacity-40">•</span>
                          <span className="inline-flex items-center gap-1">
                            <Flame size={14} className="opacity-70" /> Racha:{" "}
                            <span className="text-white/85 font-semibold">{streakDays} día(s)</span>
                          </span>
                          <span className="opacity-40">•</span>
                          <span>
                            Días activos: <span className="text-white/85 font-semibold">{activeDays}</span>
                            {periodDays ? <span className="text-white/50">/{periodDays}</span> : null}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="opacity-40">•</span>
                          <span className="inline-flex items-center gap-1">
                            <Flame size={14} className="opacity-70" /> Racha:{" "}
                            <span className="text-white/85 font-semibold">{streakDays} día(s)</span>
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Micro-mensaje motivacional */}
                <div className="mt-3 text-sm text-white/70">
                  {rowsInRange.length === 0 ? (
                    <>Aún no tienes reportes en este periodo. Registra tu reporte de hoy y empieza a construir tu progreso 💪</>
                  ) : (
                    <>
                      Vas muy bien. Mantén tu constancia — cada reporte cuenta 🔥
                      {bestDay ? (
                        <span className="block text-[12px] text-white/55 mt-1">
                          Mejor día: <span className="text-white/80 font-medium">{bestDay.date}</span> ·{" "}
                          {formatearCapitulos(bestDay.bible)} cap · {formatearMinutos(bestDay.prayer)}
                        </span>
                      ) : null}
                    </>
                  )}
                </div>
              </div>

              <div className="flex gap-2 shrink-0">
                <Link href="/reporte">
                  <Button variant="primary">Crear reporte</Button>
                </Link>
                <Link href="/ranking">
                  <Button className="bg-white/10 text-white border border-white/10 hover:bg-white/15">
                    Ver ranking
                  </Button>
                </Link>
              </div>
            </div>

            {/* Quick badges */}
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge className="gap-2">
                <BookOpen size={14} className="opacity-80" />
                <span className="text-white/80">Capítulos:</span>
                <span className="font-semibold text-white">{formatearCapitulos(totals.total_bible_minutes)}</span>
              </Badge>
              <Badge className="gap-2">
                <HeartHandshake size={14} className="opacity-80" />
                <span className="text-white/80">Oración:</span>
                <span className="font-semibold text-white">{formatearMinutos(totals.total_prayer_minutes)}</span>
              </Badge>
              <Badge className="gap-2">
                <FileText size={14} className="opacity-80" />
                <span className="text-white/80">Reportes:</span>
                <span className="font-semibold text-white">{totals.total_reports}</span>
              </Badge>

              {avgPerDay && periodDays ? (
                <Badge className="gap-2">
                  <span className="text-white/70">Promedio/día:</span>
                  <span className="text-white/85 font-semibold">
                    {formatearCapitulos(avgPerDay.bible)} cap · {formatearMinutos(avgPerDay.prayer)}
                  </span>
                </Badge>
              ) : null}
            </div>
          </Card>

          {/* Main metric cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard
              icon={<BookOpen size={16} className="opacity-85" />}
              title="Capítulos"
              value={formatearCapitulos(totals.total_bible_minutes)}
              subtitle={period !== "all" ? "Total del periodo seleccionado" : "Total acumulado"}
              deltaNode={
                deltas ? <DeltaPill delta={deltas.bible} /> : <span className="text-[11px] text-white/45">—</span>
              }
              progressPct={(totals.total_bible_minutes / topForBars) * 100}
            />

            <StatCard
              icon={<HeartHandshake size={16} className="opacity-85" />}
              title="Oración"
              value={formatearMinutos(totals.total_prayer_minutes)}
              subtitle={period !== "all" ? "Tiempo total del periodo" : "Tiempo total acumulado"}
              deltaNode={
                deltas ? <DeltaPill delta={deltas.prayer} suffix=" min" /> : <span className="text-[11px] text-white/45">—</span>
              }
              progressPct={(totals.total_prayer_minutes / topForBars) * 100}
            />

            <StatCard
              icon={<FileText size={16} className="opacity-85" />}
              title="Reportes"
              value={String(totals.total_reports)}
              subtitle={period !== "all" ? "Reportes registrados" : "Reportes acumulados"}
              deltaNode={
                deltas ? <DeltaPill delta={deltas.reports} /> : <span className="text-[11px] text-white/45">—</span>
              }
              progressPct={(totals.total_reports / topForBars) * 100}
            />
          </div>

          {/* Trend */}
<div className="mt-2 grid grid-cols-1 gap-4">
  <Card className="bg-black/20 border border-white/10 p-4 rounded-3xl">
    {/* Header */}
    <div>
      <div className="text-sm font-semibold">
        {trendMode === "daily" ? "Tendencia (día a día)" : "Tendencia (mes a mes)"}
      </div>
      <div className="text-[12px] text-white/55 mt-1">
        {trendMode === "daily"
          ? period === "week"
            ? "Tu progreso durante la semana"
            : "Tu progreso en los últimos 30 días"
          : "Capítulos y oración acumulados por mes"}
      </div>
    </div>

    {/* Chart / Empty */}
    <div className="mt-4 min-h-[260px]">
      {!hasTrendData ? (
        <EmptyState
          title="Aún no hay reportes en este rango"
          description="Registra tu reporte y aquí verás tu progreso de forma clara."
        />
      ) : (
        <TrendLine data={trendData} height={260} />
      )}
    </div>

    {/* Footer (siempre dentro del contenedor) */}
    <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
      <div className="text-[12px] text-white/55">
        Consejo: aunque un día sea poco, la constancia es lo que más suma.
      </div>

      <Link href="/reporte" className="w-full sm:w-auto">
        <Button className="bg-white/10 text-white border border-white/10 hover:bg-white/15 w-full sm:w-auto">
          Registrar reporte de hoy
        </Button>
      </Link>
    </div>
  </Card>
</div>
          {/* Admin CTA */}
          {rol === "admin" && (
            <Card className="border-aguila-500/20 bg-aguila-500/10">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="text-sm font-semibold">Mostrar todas las estadísticas</div>
                  <div className="text-sm text-white/70 mt-1">
                    Incluye también las estadísticas del <span className="text-white/90">admin</span> (vista general).
                  </div>
                </div>
                <Link href="/admin/general">
                  <Button variant="primary">Ver estadísticas generales</Button>
                </Link>
              </div>
            </Card>
          )}
        </div>
      </PageFade>
    </Container>
  );
}
