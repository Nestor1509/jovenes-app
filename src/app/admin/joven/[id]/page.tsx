"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useMyProfile } from "@/lib/useMyProfile";
import LoadingCard from "@/components/LoadingCard";
import TrendLine from "@/components/charts/TrendLine";
import { Container, Card, Title, Subtitle, PageFade, Stat, Button, Input } from "@/components/ui";
import { ArrowLeft, CalendarDays, NotebookPen } from "lucide-react";

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
  const day = d.getDay(); // 0 domingo
  const diff = day === 0 ? -6 : 1 - day; // lunes
  d.setDate(d.getDate() + diff);
  return iso(d);
}

type ProfileRow = { id: string; name: string; role: string; group_id: string | null };
type ReportRow = { report_date: string; bible_minutes: number; prayer_minutes: number };
type NoteRow = { id: number; note: string; created_at: string; author_id: string };

export default function PersonDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();

  const { loading: authLoading, session, profile } = useMyProfile();

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const [person, setPerson] = useState<ProfileRow | null>(null);

  const today = iso(new Date());
  const defaultFrom = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 34);
    return iso(d);
  }, []);

  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(today);

  const [reports, setReports] = useState<ReportRow[]>([]);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // Esta ruta es exclusiva de admin (la vista de líder vive en /lider/joven/[id]).
  // Dejamos la bandera por compatibilidad con el código existente.
  const isLeaderView = false;

  async function cargar() {
    setMsg("");
    setLoading(true);

    if (!session || !profile || !id) {
      setLoading(false);
      return;
    }

    // Permisos:
    // - líder: solo ve jóvenes de su grupo
    // - admin: ve todo
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

    if (isLeaderView) {
      if (profile.role !== "leader") {
        setMsg("Acceso restringido.");
        setLoading(false);
        return;
      }
      if (pRow.role !== "youth" || !profile.group_id || profile.group_id !== pRow.group_id) {
        setMsg("Solo puedes ver jóvenes de tu grupo.");
        setLoading(false);
        return;
      }
    } else {
      if (profile.role !== "admin") {
        setMsg("Acceso restringido.");
        setLoading(false);
        return;
      }
    }

    setPerson(pRow as any);

    // Reportes en rango
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
    } else {
      setReports((rep ?? []) as any);
    }

    // Notas (si existe tabla)
    const { data: n, error: nErr } = await supabase
      .from("youth_notes")
      .select("id,note,created_at,author_id")
      .eq("youth_id", id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!nErr) setNotes((n ?? []) as any);

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
    // Agrupar por inicio de semana
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

  const historyMap = useMemo(() => {
    const m: Record<string, { bible: number; prayer: number }> = {};
    for (const r of reports) {
      m[r.report_date] = { bible: Number(r.bible_minutes ?? 0), prayer: Number(r.prayer_minutes ?? 0) };
    }
    return m;
  }, [reports]);

  const calendarDays = useMemo(() => {
    // Construir la grilla del rango (máx 70 días por UX)
    const from = new Date(fromDate + "T00:00:00");
    const to = new Date(toDate + "T00:00:00");
    const days: string[] = [];
    const max = 70;
    for (let i = 0; i < max; i++) {
      const cur = new Date(from);
      cur.setDate(from.getDate() + i);
      if (cur > to) break;
      days.push(iso(cur));
    }
    return days;
  }, [fromDate, toDate]);

  async function addNote() {
    setMsg("");
    const note = noteText.trim();
    if (!note) return;

    setSavingNote(true);
    const { error } = await supabase.from("youth_notes").insert({ youth_id: id, author_id: profile?.id, note });
    setSavingNote(false);

    if (error) return setMsg("No se pudo guardar la nota (revisa RLS).");
    setNoteText("");
    await cargar();
  }

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
                <Button
                  className="bg-white/10 hover:bg-white/20 text-white px-3 py-2"
                  onClick={() => router.back()}
                  title="Volver"
                >
                  <ArrowLeft size={16} />
                </Button>
                <Title>{person?.name ?? "Detalle"}</Title>
              </div>
              <Subtitle>
                Vista por persona • <span className="text-white/60">Rango:</span> {fromDate} → {toDate}
              </Subtitle>
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
              {trend.length < 2 ? (
                <div className="text-sm text-white/70">No hay suficientes datos para mostrar la tendencia.</div>
              ) : (
                <TrendLine data={trend as any} />
              )}
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2 mb-2">
              <div className="text-sm font-semibold">Historial</div>
              <div className="text-xs text-white/60">• marca los días con reporte</div>
            </div>

            <div className="mt-3 grid grid-cols-7 gap-2">
              {calendarDays.map((d) => {
                const has = Boolean(historyMap[d]);
                const bible = historyMap[d]?.bible ?? 0;
                const prayer = historyMap[d]?.prayer ?? 0;
                return (
                  <div
                    key={d}
                    title={has ? `${d} • Lectura: ${bible}m • Oración: ${prayer}m` : d}
                    className={[
                      "rounded-xl border px-2 py-2 text-[11px] leading-tight",
                      has ? "border-white/20 bg-white/10" : "border-white/10 bg-black/20 text-white/50",
                    ].join(" ")}
                  >
                    <div className="font-medium">{d.slice(8, 10)}</div>
                    {has ? <div className="text-white/70">{bible + prayer}m</div> : <div className="opacity-50">—</div>}
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2 mb-2">
              <NotebookPen size={18} className="opacity-80" />
              <div className="text-sm font-semibold">Notas de seguimiento</div>
            </div>
            <Subtitle>Solo líder/admin. Útiles para acompañamiento.</Subtitle>

            <div className="mt-4 grid gap-3">
              <textarea
                className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-white/30 min-h-[90px]"
                placeholder="Escribe una nota…"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
              />
              <div className="flex justify-end">
                <Button
                  onClick={addNote}
                  disabled={savingNote}
                  className="bg-white/90 hover:bg-white text-zinc-900"
                >
                  {savingNote ? "Guardando…" : "Agregar nota"}
                </Button>
              </div>
            </div>

            <div className="mt-5 grid gap-2">
              {notes.length === 0 ? (
                <div className="text-sm text-white/70">Aún no hay notas.</div>
              ) : (
                notes.map((n) => (
                  <div key={n.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <div className="text-xs text-white/50">{new Date(n.created_at).toLocaleString()}</div>
                    <div className="text-sm mt-1 whitespace-pre-wrap">{n.note}</div>
                  </div>
                ))
              )}
            </div>
          </Card>

          <div className="text-xs text-white/50">
            <Link className="underline decoration-white/20 hover:decoration-white/60" href={isLeaderView ? "/lider" : "/admin"}>
              Volver al panel
            </Link>
          </div>
        </div>
      </PageFade>
    </Container>
  );
}
