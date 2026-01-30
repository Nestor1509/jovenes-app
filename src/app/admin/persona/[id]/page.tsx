"use client";

import dynamicImport from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { cached } from "@/lib/cache";
import { useMyProfile, Profile } from "@/lib/useMyProfile";
import { Container, Card, Title, Subtitle, PageFade, Stat, Button, Input } from "@/components/ui";
import LoadingCard from "@/components/LoadingCard";
import { ArrowLeft, CalendarDays, RefreshCw } from "lucide-react";
const TrendLine = dynamicImport(() => import("@/components/charts/TrendLine"), { ssr: false });


type ReportRow = { report_date: string; bible_minutes: number; prayer_minutes: number };

function isoToday() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function startOfMonth(iso: string) {
  return iso.slice(0, 7) + "-01";
}

function minusDays(iso: string, days: number) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() - days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function fmtMinutes(min: number) {
  const t = Math.max(0, Math.floor(Number(min || 0)));
  const h = Math.floor(t / 60);
  const m = t % 60;
  if (h <= 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

function weekKey(iso: string) {
  const d = new Date(iso + "T00:00:00");
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function AdminPersonaDetallePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const userId = params?.id;

  const { loading: authLoading, session, profile: me, error: authError } = useMyProfile();

  const [loading, setLoading] = useState(true);
  const [restricted, setRestricted] = useState(false);
  const [msg, setMsg] = useState("");

  const [person, setPerson] = useState<Profile | null>(null);
  const [rows, setRows] = useState<ReportRow[]>([]);

  const today = useMemo(() => isoToday(), []);
  const [from, setFrom] = useState(minusDays(today, 30));
  const [to, setTo] = useState(today);

  async function load() {
    setLoading(true);
    setMsg("");
    setRestricted(false);

    if (!session) {
      setLoading(false);
      return;
    }
    if (authError) {
      setMsg(authError);
      setLoading(false);
      return;
    }
    if (!me || me.role !== "admin") {
      setRestricted(true);
      setLoading(false);
      return;
    }
    if (!userId) {
      setMsg("Falta el ID.");
      setLoading(false);
      return;
    }

    const pRes = await supabase.from("profiles").select("id,name,role,group_id").eq("id", userId).maybeSingle();
    if (pRes.error) {
      setRestricted(true);
      setLoading(false);
      return;
    }
    const p = pRes.data as Profile | null;
    if (!p) {
      setMsg("No se encontró el perfil.");
      setLoading(false);
      return;
    }
    setPerson(p);

    const rRes = await supabase
      .from("reports")
      .select("report_date,bible_minutes,prayer_minutes")
      .eq("user_id", userId)
      .gte("report_date", from)
      .lte("report_date", to)
      .order("report_date", { ascending: true });

    if (rRes.error) {
      // Puede ser normal si no hay policy admin en reports (se arregla con SQL recomendado)
      setMsg("No se pudieron cargar los reportes. Revisa las policies de reports.");
      setRows([]);
      setLoading(false);
      return;
    }

    setRows((rRes.data ?? []) as any);
    setLoading(false);
  }

  useEffect(() => {
    if (authLoading) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, session?.user?.id, me?.role, userId]);

  useEffect(() => {
    if (!session || authLoading) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  const totals = useMemo(() => {
    let b = 0, p = 0;
    for (const r of rows) {
      b += Number(r.bible_minutes ?? 0);
      p += Number(r.prayer_minutes ?? 0);
    }
    return { bible: b, prayer: p, reports: rows.length };
  }, [rows]);

  const trend = useMemo(() => {
    const map = new Map<string, { lectura: number; oracion: number }>();
    for (const r of rows) {
      const k = weekKey(r.report_date);
      const cur = map.get(k) ?? { lectura: 0, oracion: 0 };
      cur.lectura += Number(r.bible_minutes ?? 0);
      cur.oracion += Number(r.prayer_minutes ?? 0);
      map.set(k, cur);
    }
    const labels = Array.from(map.keys()).sort();
    return labels.map((k) => ({
      label: k.slice(5),
      lectura: map.get(k)!.lectura,
      oracion: map.get(k)!.oracion,
    }));
  }, [rows]);

  if (authLoading) return <LoadingCard text="Cargando sesión…" />;

  if (!session) {
    return (
      <Container>
        <PageFade>
          <Card>
            <Title>Detalle</Title>
            <Subtitle>Inicia sesión para ver esta página.</Subtitle>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button className="bg-indigo-500/20 text-white border border-indigo-400/20 hover:bg-indigo-500/30" onClick={() => router.push(`/admin/usuario/${userId}/perfil`)}>
                  Editar perfil
                </Button>
              </div>
            <div className="mt-4">
              <Button onClick={() => (window.location.href = "/")}>Ir a inicio</Button>
            </div>
          </Card>
        </PageFade>
      </Container>
    );
  }

  return (
    <Container>
      <PageFade>
        <div className="grid gap-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Button className="mb-3 bg-white/10 text-white border border-white/10 hover:bg-white/15" onClick={() => router.back()}>
                <ArrowLeft size={16} className="mr-2" />
                Volver
              </Button>
              <Title>Detalle</Title>
              <Subtitle>
                Vista por persona · Rango: {from} → {to}
              </Subtitle>
              {restricted && <div className="text-red-300 text-sm mt-2">Acceso restringido.</div>}
              {msg && <div className="text-amber-200 text-sm mt-2">{msg}</div>}
              {person && !restricted && (
                <div className="text-sm text-white/70 mt-1">
                  {person.name} · {person.role === "admin" ? "Admin" : person.role === "leader" ? "Líder" : "Joven"}
                </div>
              )}
            </div>

            <Card className="p-4 min-w-[300px]">
              <div className="flex items-center gap-2 mb-2">
                <CalendarDays size={16} className="opacity-80" />
                <div className="text-sm font-semibold">Rango</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-white/60 mb-1">Desde</div>
                  <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                </div>
                <div>
                  <div className="text-xs text-white/60 mb-1">Hasta</div>
                  <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button className="bg-white/10 text-white border border-white/10 hover:bg-white/15" onClick={() => { setFrom(minusDays(today, 7)); setTo(today); }}>
                  7 días
                </Button>
                <Button className="bg-white/10 text-white border border-white/10 hover:bg-white/15" onClick={() => { setFrom(minusDays(today, 30)); setTo(today); }}>
                  30 días
                </Button>
                <Button className="bg-white/10 text-white border border-white/10 hover:bg-white/15" onClick={() => { setFrom(startOfMonth(today)); setTo(today); }}>
                  Mes
                </Button>
                <Button className="bg-white/10 text-white border border-white/10 hover:bg-white/15" onClick={load} disabled={loading}>
                  <RefreshCw size={16} className={loading ? "animate-spin mr-2" : "mr-2"} />
                  Actualizar
                </Button>
              </div>
            </Card>
          </div>

          {!restricted && (
            <>
              <Card>
                <div className="text-sm font-semibold mb-3">Resumen</div>
                <div className="grid gap-3 md:grid-cols-3">
                  <Stat label="Lectura" value={fmtMinutes(totals.bible)} />
                  <Stat label="Oración" value={fmtMinutes(totals.prayer)} />
                  <Stat label="Reportes" value={totals.reports} />
                </div>
              </Card>

              <Card>
                <div className="text-sm font-semibold mb-1">Tendencia semanal</div>
                <Subtitle>Agrupado por semana (lunes).</Subtitle>
                <div className="mt-4">
                  {trend.length < 2 ? (
                    <div className="text-sm text-white/70">No hay suficientes datos para mostrar la tendencia.</div>
                  ) : (
                    <TrendLine data={trend} />
                  )}
                </div>
              </Card>

              <Card>
                <div className="text-sm font-semibold mb-1">Historial</div>
                <Subtitle>Reportes del rango seleccionado.</Subtitle>
                <div className="mt-4 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="text-white/70">
                      <tr className="border-b border-white/10">
                        <th className="text-left py-2 pr-3">Fecha</th>
                        <th className="text-left py-2 pr-3">Lectura</th>
                        <th className="text-left py-2 pr-3">Oración</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.report_date} className="border-b border-white/5">
                          <td className="py-2 pr-3">{r.report_date}</td>
                          <td className="py-2 pr-3">{fmtMinutes(Number(r.bible_minutes ?? 0))}</td>
                          <td className="py-2 pr-3">{fmtMinutes(Number(r.prayer_minutes ?? 0))}</td>
                        </tr>
                      ))}
                      {rows.length === 0 && (
                        <tr>
                          <td className="py-3 text-white/70" colSpan={3}>No hay reportes en este rango.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}

          {loading && <div className="text-sm text-white/70">Cargando…</div>}
        </div>
      </PageFade>
    </Container>
  );
}