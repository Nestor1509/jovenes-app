"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Container, Card, Title, Subtitle, PageFade, Stat, Button, Skeleton, EmptyState } from "@/components/ui";
import dynamic from "next/dynamic";
const TrendLine = dynamic(() => import("@/components/charts/TrendLine"), { ssr: false });

import { ChartCard } from "@/components/charts/ChartCard";

type Totales = {
  total_bible_minutes: number;
  total_prayer_minutes: number;
  total_reports: number;
};

type ReportRow = {
  report_date: string; // YYYY-MM-DD
  bible_minutes: number | null;
  prayer_minutes: number | null;
};

function formatearMinutos(min: number) {
  const t = Number.isFinite(min) ? Math.max(0, Math.floor(min)) : 0;
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

export default function MisEstadisticasPage() {
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const [nombre, setNombre] = useState<string>("");
  const [rol, setRol] = useState<string>("");

  const [reports, setReports] = useState<ReportRow[]>([]);
  const [week, setWeek] = useState<Totales>({ total_bible_minutes: 0, total_prayer_minutes: 0, total_reports: 0 });
  const [month, setMonth] = useState<Totales>({ total_bible_minutes: 0, total_prayer_minutes: 0, total_reports: 0 });
  const [all, setAll] = useState<Totales>({ total_bible_minutes: 0, total_prayer_minutes: 0, total_reports: 0 });

  const today = useMemo(() => hoyISO(), []);
  const weekStart = useMemo(() => inicioSemanaISO(today), [today]);
  const monthStart = useMemo(() => inicioMesISO(today), [today]);

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

      // Traemos los reportes del usuario (para totales + tendencia)
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

      const rows = (rRows ?? []) as ReportRow[];
      setReports(rows);

      setAll(sumar(rows));
      setWeek(sumar(rows.filter((r) => r.report_date >= weekStart && r.report_date <= today)));
      setMonth(sumar(rows.filter((r) => r.report_date >= monthStart && r.report_date <= today)));

      setLoading(false);
    })();
  }, [today, weekStart, monthStart]);

  const rolBonito = rol === "admin" ? "Admin" : rol === "leader" ? "Líder" : "Joven";

  const trendData = useMemo(() => {
    // Agrupar por mes (YYYY-MM)
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
  }, [reports]);

  if (loading && reports.length === 0) {
    return (
      <Container>
        <PageFade>
          <div className="grid gap-6">
            <div>
              <Skeleton className="h-7 w-56" />
              <Skeleton className="mt-2 h-4 w-72" />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Skeleton className="h-56" />
              <Skeleton className="h-56" />
              <Skeleton className="h-56" />
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
          <div>
            <Title>Mis estadísticas</Title>
            <Subtitle>{nombre ? `${nombre} — ${rolBonito}` : "Cargando…"}</Subtitle>
          </div>

          {msg && <div className="text-red-300 text-sm">{msg}</div>}

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <div className="text-sm font-medium mb-1">Semana</div>
              <div className="text-xs text-white/60 mb-4">Desde {weekStart}</div>
              <div className="grid gap-2">
                <Stat label="Lectura" value={formatearMinutos(week.total_bible_minutes)} />
                <Stat label="Oración" value={formatearMinutos(week.total_prayer_minutes)} />
                <Stat label="Reportes" value={week.total_reports} />
              </div>
            </Card>

            <Card>
              <div className="text-sm font-medium mb-1">Mes</div>
              <div className="text-xs text-white/60 mb-4">Desde {monthStart}</div>
              <div className="grid gap-2">
                <Stat label="Lectura" value={formatearMinutos(month.total_bible_minutes)} />
                <Stat label="Oración" value={formatearMinutos(month.total_prayer_minutes)} />
                <Stat label="Reportes" value={month.total_reports} />
              </div>
            </Card>

            <Card>
              <div className="text-sm font-medium mb-1">Histórico</div>
              <div className="text-xs text-white/60 mb-4">Todo el tiempo</div>
              <div className="grid gap-2">
                <Stat label="Lectura" value={formatearMinutos(all.total_bible_minutes)} />
                <Stat label="Oración" value={formatearMinutos(all.total_prayer_minutes)} />
                <Stat label="Reportes" value={all.total_reports} />
              </div>
            </Card>
          </div>

          <div className="mt-2 grid grid-cols-1 gap-4">
            <ChartCard title="Tendencia (mes a mes)" subtitle="Lectura bíblica y oración acumuladas por mes">
              {trendData.length < 2 ? (
                <EmptyState title="Aún no hay suficientes datos" description="Cuando tengas más reportes, verás tu tendencia mes a mes aquí." />
              ) : (
                <TrendLine data={trendData} />
              )}
            </ChartCard>
          </div>

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
