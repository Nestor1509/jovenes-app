"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useMyProfile } from "@/lib/useMyProfile";
import LoadingCard from "@/components/LoadingCard";
import dynamic from "next/dynamic";
const TrendLine = dynamic(() => import("@/components/charts/TrendLine"), { ssr: false });

import { Container, Card, Title, Subtitle, PageFade, Stat, Button, Input } from "@/components/ui";
import { ArrowLeft, CalendarDays } from "lucide-react";

function iso(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
function formatearMinutos(min: number) {
  const t = Math.max(0, Math.floor(Number(min || 0)));
  const h = Math.floor(t / 60);
  const m = t % 60;
  if (h <= 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}
function inicioSemana(dateISO: string) {
  const d = new Date(dateISO + "T00:00:00");
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return iso(d);
}

type ProfileRow = { id: string; name: string; role: string; group_id: string | null };
type ReportRow = { report_date: string; bible_minutes: number; prayer_minutes: number };

export default function AdminLeaderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();
  const { loading: authLoading, session, profile } = useMyProfile();

  const today = iso(new Date());
  const defaultFrom = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 34);
    return iso(d);
  }, []);
  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(today);

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [person, setPerson] = useState<ProfileRow | null>(null);
  const [reports, setReports] = useState<ReportRow[]>([]);

  async function cargar() {
    setMsg("");
    setLoading(true);

    if (!session || !profile || !id) {
      setLoading(false);
      return;
    }
    if (profile.role !== "admin") {
      setMsg("Acceso restringido.");
      setLoading(false);
      return;
    }

    const { data: pRow, error: pErr } = await supabase
      .from("profiles")
      .select("id,name,role,group_id")
      .eq("id", id)
      .maybeSingle();

    if (pErr || !pRow) {
      setMsg("No se pudo cargar la persona.");
      setLoading(false);
      return;
    }
    if (pRow.role !== "leader") {
      setMsg("Esta vista es solo para líderes.");
      setLoading(false);
      return;
    }
    setPerson(pRow as any);

    const { data: rep, error: repErr } = await supabase
      .from("reports")
      .select("report_date,bible_minutes,prayer_minutes")
      .eq("user_id", id)
      .gte("report_date", fromDate)
      .lte("report_date", toDate)
      .order("report_date", { ascending: true });

    if (repErr) {
      setMsg("No se pudieron cargar los reportes (revisa RLS).");
      setReports([]);
    } else setReports((rep ?? []) as any);

    setLoading(false);
  }

  useEffect(() => {
    if (authLoading) return;
    if (!session) return;
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, session?.user?.id, id, fromDate, toDate]);

  const totals = useMemo(() => {
    const t = { bible: 0, prayer: 0, reports: reports.length };
    for (const r of reports) {
      t.bible += Number(r.bible_minutes ?? 0);
      t.prayer += Number(r.prayer_minutes ?? 0);
    }
    return t;
  }, [reports]);

  const trend = useMemo(() => {
    const map = new Map<string, { lectura: number; oracion: number }>();
    for (const r of reports) {
      const k = inicioSemana(r.report_date);
      const cur = map.get(k) ?? { lectura: 0, oracion: 0 };
      cur.lectura += Number(r.bible_minutes ?? 0);
      cur.oracion += Number(r.prayer_minutes ?? 0);
      map.set(k, cur);
    }
    return [...map.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([k, v]) => ({ label: k, lectura: v.lectura, oracion: v.oracion }));
  }, [reports]);

  if (authLoading) return <LoadingCard text="Cargando sesión…" />;

  if (!session) {
    return (
      <Container>
        <PageFade>
          <Card>
            <Title>Inicia sesión</Title>
            <Subtitle>Necesitas iniciar sesión para ver esta página.</Subtitle>
          </Card>
        </PageFade>
      </Container>
    );
  }

  if (loading) return <LoadingCard text="Cargando vista…" />;

  return (
    <Container>
      <PageFade>
        <div className="grid gap-6">
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2">
                <Button className="bg-white/10 hover:bg-white/20 text-white px-3 py-2" onClick={() => router.back()} title="Volver">
                  <ArrowLeft size={16} />
                </Button>
                <Title>{person?.name ?? "Líder"}</Title>
              </div>
              <Subtitle>Vista por líder • Rango: {fromDate} → {toDate}</Subtitle>
              {msg && <div className="text-red-300 text-sm mt-2">{msg}</div>}
            </div>

            <div className="flex gap-3 flex-wrap">
              <div className="w-full sm:w-44">
                <div className="text-xs text-white/60 mb-1">Desde</div>
                <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div className="w-full sm:w-44">
                <div className="text-xs text-white/60 mb-1">Hasta</div>
                <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
            </div>
          </div>

          <Card>
            <div className="flex items-center gap-2 mb-2">
              <CalendarDays size={18} className="opacity-80" />
              <div className="text-sm font-semibold">Resumen del rango</div>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Stat label="Lectura" value={formatearMinutos(totals.bible)} />
              <Stat label="Oración" value={formatearMinutos(totals.prayer)} />
              <Stat label="Reportes" value={totals.reports} />
            </div>
          </Card>

          <Card>
            <div className="text-sm font-semibold">Tendencia semanal</div>
            <div className="text-xs text-white/60 mt-1">Agrupado por semana (lunes).</div>
            <div className="mt-4">
              {trend.length < 2 ? <div className="text-sm text-white/70">No hay suficientes datos.</div> : <TrendLine data={trend as any} />}
            </div>
          </Card>

          <div className="text-xs text-white/50">
            <Link className="underline decoration-white/20 hover:decoration-white/60" href="/admin">
              Volver al panel
            </Link>
          </div>
        </div>
      </PageFade>
    </Container>
  );
}
