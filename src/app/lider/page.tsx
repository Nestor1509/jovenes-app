"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabaseClient";
import { cached, invalidate } from "@/lib/cache";
import { useMyProfile } from "@/lib/useMyProfile";
import { Container, Card, Title, Subtitle, PageFade, Stat, Select, Skeleton, EmptyState } from "@/components/ui";
import LoadingCard from "@/components/LoadingCard";
import { Users, CalendarDays, BarChart3, Trophy, RefreshCw } from "lucide-react";
const TopYouthBars = dynamic(() => import("@/components/charts/TopYouthBars"), { ssr: false });


type Group = { id: string; name: string };

type WeekStats = {
  group_id: string;
  week_start: string;
  active_youth: number;
  total_bible_minutes: number;
  total_prayer_minutes: number;
  total_reports: number;
};

type MonthStats = {
  group_id: string;
  month_start: string;
  active_youth: number;
  total_bible_minutes: number;
  total_prayer_minutes: number;
  total_reports: number;
};

type YouthTotals = {
  user_id: string;
  name: string;
  group_id: string;
  total_bible_minutes: number;
  total_prayer_minutes: number;
  total_reports: number;
};

function formatearMinutos(min: any) {
  const t = Math.max(0, Math.floor(Number(min ?? 0)));
  const h = Math.floor(t / 60);
  const m = t % 60;
  if (h <= 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

function hoyISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function inicioSemanaISO(dateISO: string) {
  const d = new Date(dateISO + "T00:00:00");
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function inicioMesISO(dateISO: string) {
  return dateISO.slice(0, 7) + "-01";
}

export default function LiderPage() {
  const { loading: authLoading, session, profile, error: authError } = useMyProfile();

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const [group, setGroup] = useState<Group | null>(null);

  const [availableWeeks, setAvailableWeeks] = useState<string[]>([]);
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");

  const [weekStats, setWeekStats] = useState<WeekStats | null>(null);
  const [monthStats, setMonthStats] = useState<MonthStats | null>(null);

  const [youth, setYouth] = useState<YouthTotals[]>([]);
  const [topMode, setTopMode] = useState<"bible" | "prayer" | "reports">("bible");

  const today = useMemo(() => hoyISO(), []);
  const defaultWeek = useMemo(() => inicioSemanaISO(today), [today]);
  const defaultMonth = useMemo(() => inicioMesISO(today), [today]);

  async function cargarBase() {
    setMsg("");
    setLoading(true);

    if (!session) {
      setLoading(false);
      return;
    }

    if (authError) {
      setMsg(authError);
      setLoading(false);
      return;
    }

    if (!profile || (profile.role !== "leader" && profile.role !== "admin")) {
      setMsg("Esta página es solo para líderes.");
      setLoading(false);
      return;
    }

    if (!profile.group_id) {
      setMsg("No tienes grupo asignado. Pide al administrador que te asigne uno.");
      setLoading(false);
      return;
    }

    const gRes = await cached(`leader:${session.user.id}:group:${profile.group_id}`, async () => supabase.from("groups").select("id,name").eq("id", profile.group_id).maybeSingle(), 60000);
    if (gRes.error) setMsg("No se pudo cargar tu grupo.");
    setGroup((gRes.data as Group) ?? null);

    const [wListRes, mListRes, ytRes] = await cached(`leader:${session.user.id}:base:${profile.group_id}`, async () => Promise.all([
      supabase
        .from("leader_group_stats_week")
        .select("week_start")
        .eq("group_id", profile.group_id)
        .order("week_start", { ascending: false })
        .limit(24),
      supabase
        .from("leader_group_stats_month")
        .select("month_start")
        .eq("group_id", profile.group_id)
        .order("month_start", { ascending: false })
        .limit(12),
      supabase.from("leader_youth_totals").select("*").eq("group_id", profile.group_id).order("name"),
    ]), 20000);

    const weeks = Array.from(new Set((wListRes.data ?? []).map((x: any) => x.week_start))).filter(Boolean);
    const months = Array.from(new Set((mListRes.data ?? []).map((x: any) => x.month_start))).filter(Boolean);

    setAvailableWeeks(weeks.length ? weeks : [defaultWeek]);
    setAvailableMonths(months.length ? months : [defaultMonth]);

    setSelectedWeek((prev) => prev || (weeks[0] ?? defaultWeek));
    setSelectedMonth((prev) => prev || (months[0] ?? defaultMonth));

    if (ytRes.error) {
      setMsg("No se pudo cargar la lista de jóvenes.");
      setYouth([]);
    } else {
      setYouth((ytRes.data ?? []) as YouthTotals[]);
    }

    setLoading(false);
  }

  async function cargarStatsPorSeleccion(groupId: string, weekStart: string, monthStart: string) {
    if (!session) return;
    const [wsRes, msRes] = await cached(
      `leader:${session.user.id}:stats:${groupId}:${weekStart}:${monthStart}`,
      async () =>
        Promise.all([
          supabase
            .from("leader_group_stats_week")
            .select("*")
            .eq("group_id", groupId)
            .eq("week_start", weekStart)
            .maybeSingle(),
          supabase
            .from("leader_group_stats_month")
            .select("*")
            .eq("group_id", groupId)
            .eq("month_start", monthStart)
            .maybeSingle(),
        ]),
      20000
    );

    setWeekStats((wsRes.data as WeekStats) ?? null);
    setMonthStats((msRes.data as MonthStats) ?? null);
  }

  useEffect(() => {
    if (authLoading) return;
    if (!session) return;
    cargarBase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, session?.user?.id, profile?.group_id, profile?.role, authError]);

  useEffect(() => {
    if (!profile?.group_id) return;
    if (!selectedWeek || !selectedMonth) return;
    cargarStatsPorSeleccion(profile.group_id, selectedWeek, selectedMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.group_id, selectedWeek, selectedMonth]);

  const topData = useMemo(() => {
    const sorted = [...youth].sort((a, b) => {
      const av =
        topMode === "bible" ? a.total_bible_minutes : topMode === "prayer" ? a.total_prayer_minutes : a.total_reports;
      const bv =
        topMode === "bible" ? b.total_bible_minutes : topMode === "prayer" ? b.total_prayer_minutes : b.total_reports;
      return Number(bv ?? 0) - Number(av ?? 0);
    });

    return sorted.slice(0, 10).map((y) => ({
      name: y.name.length > 12 ? y.name.slice(0, 12) + "…" : y.name,
      fullName: y.name,
      value:
        topMode === "bible"
          ? Number(y.total_bible_minutes ?? 0)
          : topMode === "prayer"
          ? Number(y.total_prayer_minutes ?? 0)
          : Number(y.total_reports ?? 0),
    }));
  }, [youth, topMode]);

  if (authLoading) return <LoadingCard text="Cargando sesión…" />;

  if (!session) {
    return (
      <Container>
        <PageFade>
          <Card>
            <Title>Inicia sesión</Title>
            <Subtitle>Necesitas iniciar sesión para usar esta página.</Subtitle>
          </Card>
        </PageFade>
      </Container>
    );
  }

  if (loading)
    return (
      <Container>
        <PageFade>
          <div className="grid gap-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <Skeleton className="h-7 w-48" />
                <Skeleton className="mt-2 h-4 w-72" />
              </div>
              <Skeleton className="h-10 w-44" />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
            <Skeleton className="h-[360px]" />
          </div>
        </PageFade>
      </Container>
    );

  return (
    <Container>
      <PageFade>
        <div className="grid gap-6">
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <div>
              <Title>Panel de líder</Title>
              <Subtitle>{group ? `Grupo: ${group.name} (solo jóvenes)` : "Estadísticas del grupo"}</Subtitle>
            </div>

            <button
              onClick={cargarBase}
              className="px-3 py-2 rounded-xl hover:bg-white/10 text-sm inline-flex items-center gap-2"
            >
              <RefreshCw size={16} /> Actualizar
            </button>
          </div>

          {msg && <div className="text-red-300 text-sm">{msg}</div>}

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <CalendarDays size={18} className="opacity-80" />
                    <div className="text-sm font-semibold">Semana (jóvenes)</div>
                  </div>
                  <div className="text-xs text-white/60">Selecciona una semana</div>
                </div>

                <div className="w-full sm:w-56">
                  <Select value={selectedWeek} onChange={(e) => setSelectedWeek(e.target.value)}>
                    {availableWeeks.map((w) => (
                      <option key={w} value={w}>
                        {w}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="mt-4">
                {weekStats ? (
                  <div className="grid gap-2">
                    <Stat label="Jóvenes activos" value={Number(weekStats.active_youth ?? 0)} />
                    <Stat label="Lectura total" value={formatearMinutos(weekStats.total_bible_minutes)} />
                    <Stat label="Oración total" value={formatearMinutos(weekStats.total_prayer_minutes)} />
                    <Stat label="Reportes" value={Number(weekStats.total_reports ?? 0)} />
                  </div>
                ) : (
                  <div className="text-sm text-white/70">No hay datos para esa semana.</div>
                )}
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <BarChart3 size={18} className="opacity-80" />
                    <div className="text-sm font-semibold">Mes (jóvenes)</div>
                  </div>
                  <div className="text-xs text-white/60">Selecciona un mes</div>
                </div>

                <div className="w-full sm:w-56">
                  <Select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
                    {availableMonths.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="mt-4">
                {monthStats ? (
                  <div className="grid gap-2">
                    <Stat label="Jóvenes activos" value={Number(monthStats.active_youth ?? 0)} />
                    <Stat label="Lectura total" value={formatearMinutos(monthStats.total_bible_minutes)} />
                    <Stat label="Oración total" value={formatearMinutos(monthStats.total_prayer_minutes)} />
                    <Stat label="Reportes" value={Number(monthStats.total_reports ?? 0)} />
                  </div>
                ) : (
                  <div className="text-sm text-white/70">No hay datos para ese mes.</div>
                )}
              </div>
            </Card>
          </div>

          <Card>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Trophy size={18} className="opacity-80" />
                  <div className="text-sm font-semibold">Top 10 del grupo (solo jóvenes)</div>
                </div>
                <Subtitle>Visual (totales generales).</Subtitle>
              </div>

              <div className="w-full sm:w-64">
                <div className="text-xs text-white/60 mb-1">Ordenar por</div>
                <Select value={topMode} onChange={(e) => setTopMode(e.target.value as any)}>
                  <option value="bible">Lectura (minutos)</option>
                  <option value="prayer">Oración (minutos)</option>
                  <option value="reports">Reportes (cantidad)</option>
                </Select>
              </div>
            </div>

            <div className="mt-4">
              {topData.length === 0 ? (
                <EmptyState
                  title="Aún no hay datos"
                  description="Cuando los jóvenes envíen reportes, verás el Top 10 aquí."
                  action={<Trophy className="h-5 w-5 text-amber-400" />}
                />
              ) : (
                <TopYouthBars data={topData as any} />
              )}
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2 mb-2">
              <Users size={18} className="opacity-80" />
              <div className="text-sm font-semibold">Jóvenes del grupo (totales)</div>
            </div>
            <Subtitle>Sin incluir al líder ni al admin.</Subtitle>

            <div className="mt-4 overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-white/70">
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 pr-3">Nombre</th>
                    <th className="text-left py-3 pr-3">Lectura</th>
                    <th className="text-left py-3 pr-3">Oración</th>
                    <th className="text-left py-3 pr-3">Detalle</th>
                    <th className="text-left py-3 pr-3">Reportes</th>
                  </tr>
                </thead>
                <tbody>
                  {youth.map((y) => (
                    <tr key={y.user_id} className="border-b border-white/5">
                      <td className="py-3 pr-3 font-medium">{y.name}</td>
                      <td className="py-3 pr-3">{formatearMinutos(y.total_bible_minutes)}</td>
                      <td className="py-3 pr-3">{formatearMinutos(y.total_prayer_minutes)}</td>
                      
<td className="py-3 pr-3">
  <Link href={`/lider/joven/${y.user_id}`} className="inline-flex">
    <span className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/15 transition">
      Ver
    </span>
  </Link>
</td>
<td className="py-3 pr-3">{Number(y.total_reports ?? 0)}</td>
                    </tr>
                  ))}

                  {youth.length === 0 && (
                    <tr>
                      <td className="py-4 text-white/70" colSpan={5}>
                        No hay jóvenes en este grupo o aún no han registrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </PageFade>
    </Container>
  );
}