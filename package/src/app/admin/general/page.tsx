"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { cached, invalidate } from "@/lib/cache";
import { useMyProfile } from "@/lib/useMyProfile";
import { Container, Card, Title, Subtitle, PageFade, Stat, Button, Select, Input } from "@/components/ui";
import LoadingCard from "@/components/LoadingCard";
import { Users, ArrowLeft, CalendarDays, Trophy } from "lucide-react";

type Perfil = {
  id: string;
  name: string;
  role: "admin" | "leader" | "youth";
  group_id: string | null;
  groups?: { name: string } | null;
};

type ReportRow = {
  user_id: string;
  report_date: string;
  bible_minutes: number;
  prayer_minutes: number;
};

function formatearMinutos(min: any) {
  const t = Math.max(0, Math.floor(Number(min ?? 0)));
  const h = Math.floor(t / 60);
  const m = t % 60;
  if (h <= 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

function roleLabel(role: string) {
  if (role === "admin") return "Admin";
  if (role === "leader") return "Líder";
  return "Joven";
}

export default function AdminGeneralPage() {
  const { loading: loadingMe, profile: me } = useMyProfile();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return iso(d);
  });
  const [toDate, setToDate] = useState(() => iso(new Date()));
  const [query, setQuery] = useState("");

  const [perfiles, setPerfiles] = useState<Perfil[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      if (!me) {
        setLoading(false);
        return;
      }
      if (me.role !== "admin") {
        setLoading(false);
        setError("No autorizado.");
        return;
      }

      const pRes = await supabase
        .from("profiles")
        .select("id,name,role,group_id,groups(name)")
        .in("role", ["youth", "leader", "admin"])
        .order("name", { ascending: true });

      if (pRes.error) {
        setLoading(false);
        setError(pRes.error.message);
        return;
      }

      const rRes = await supabase
        .from("reports")
        .select("user_id,report_date,bible_minutes,prayer_minutes")
        .gte("report_date", fromDate)
        .lte("report_date", toDate);

      if (rRes.error) {
        setLoading(false);
        setError(rRes.error.message);
        return;
      }

      setPerfiles((pRes.data ?? []) as any);
      setReports((rRes.data ?? []) as any);
      setLoading(false);
    }

    load();
  }, [me, fromDate, toDate]);

  const byUser = useMemo(() => {
    const map = new Map<string, { bible: number; prayer: number; reports: number; last?: string }>();
    for (const r of reports) {
      const prev = map.get(r.user_id) ?? { bible: 0, prayer: 0, reports: 0 };
      prev.bible += Number(r.bible_minutes ?? 0);
      prev.prayer += Number(r.prayer_minutes ?? 0);
      prev.reports += 1;
      if (!prev.last || r.report_date > prev.last) prev.last = r.report_date;
      map.set(r.user_id, prev);
    }
    return map;
  }, [reports]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = perfiles.map((p) => {
      const s = byUser.get(p.id) ?? { bible: 0, prayer: 0, reports: 0, last: undefined };
      return {
        ...p,
        bible_minutes: s.bible,
        prayer_minutes: s.prayer,
        reports: s.reports,
        total_minutes: s.bible + s.prayer,
        last_report: s.last ?? null,
        group_name: p.groups?.name ?? "Sin grupo",
      };
    });

    const filtered = q
      ? base.filter((x) => `${x.name} ${x.group_name} ${x.role}`.toLowerCase().includes(q))
      : base;

    filtered.sort((a, b) => b.total_minutes - a.total_minutes);
    return filtered;
  }, [perfiles, byUser, query]);

  const totals = useMemo(() => {
    const t = { users: perfiles.length, reports: 0, bible: 0, prayer: 0 };
    for (const r of reports) {
      t.reports += 1;
      t.bible += Number(r.bible_minutes ?? 0);
      t.prayer += Number(r.prayer_minutes ?? 0);
    }
    return t;
  }, [perfiles, reports]);

  const roleTotals = useMemo(() => {
    const acc: Record<string, { users: number; reports: number; bible: number; prayer: number }> = {
      youth: { users: 0, reports: 0, bible: 0, prayer: 0 },
      leader: { users: 0, reports: 0, bible: 0, prayer: 0 },
      admin: { users: 0, reports: 0, bible: 0, prayer: 0 },
    };
    const roleById = new Map(perfiles.map((p) => [p.id, p.role]));
    for (const p of perfiles) acc[p.role].users += 1;
    for (const r of reports) {
      const role = roleById.get(r.user_id);
      if (!role) continue;
      acc[role].reports += 1;
      acc[role].bible += Number(r.bible_minutes ?? 0);
      acc[role].prayer += Number(r.prayer_minutes ?? 0);
    }
    return acc;
  }, [perfiles, reports]);

  return (
    <Container>
      <PageFade>
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-3">
              <Link href="/admin" className="text-white/70 hover:text-white inline-flex items-center gap-2">
                <ArrowLeft size={16} /> Volver
              </Link>
            </div>
            <Title>Reporte general</Title>
            <Subtitle>Incluye jóvenes, líderes y admins. Rango editable y ranking total.</Subtitle>
          </div>

          <div className="flex items-center gap-2">
            <div className="grid gap-1">
              <div className="text-xs text-white/60">Desde</div>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div className="grid gap-1">
              <div className="text-xs text-white/60">Hasta</div>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
          </div>
        </div>

        {error && (
          <Card className="border-red-500/20 bg-red-500/10 mb-6">
            <div className="text-sm text-red-200">{error}</div>
          </Card>
        )}

        {(loadingMe || loading) ? (
          <LoadingCard />
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-4 mb-6">
              <Stat label="Personas (total)" value={totals.users} />
              <Stat label="Reportes" value={totals.reports} />
              <Stat label="Lectura total" value={formatearMinutos(totals.bible)} />
              <Stat label="Oración total" value={formatearMinutos(totals.prayer)} />
            </div>

            <Card className="mb-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Users size={18} className="opacity-80" />
                    <div className="font-semibold">Resumen por rol</div>
                  </div>
                  <div className="text-sm text-white/70 mt-1">
                    Ideal para ver el balance general del ministerio.
                  </div>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3 mt-4">
                {(["youth", "leader", "admin"] as const).map((r) => (
                  <div key={r} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="text-xs text-white/60">{roleLabel(r)}</div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <Stat label="Personas" value={roleTotals[r].users} />
                      <Stat label="Reportes" value={roleTotals[r].reports} />
                      <Stat label="Lectura" value={formatearMinutos(roleTotals[r].bible)} />
                      <Stat label="Oración" value={formatearMinutos(roleTotals[r].prayer)} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Trophy size={18} className="opacity-80" />
                  <div className="font-semibold">Ranking general</div>
                  <span className="text-xs text-white/60">(por minutos totales)</span>
                </div>

                <div className="w-full sm:w-80">
                  <Input placeholder="Buscar por nombre / rol / grupo…" value={query} onChange={(e) => setQuery(e.target.value)} />
                </div>
              </div>

              <div className="mt-4 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="text-white/70">
                    <tr className="border-b border-white/10">
                      <th className="text-left py-2 pr-3">#</th>
                      <th className="text-left py-2 pr-3">Nombre</th>
                      <th className="text-left py-2 pr-3">Rol</th>
                      <th className="text-left py-2 pr-3">Grupo</th>
                      <th className="text-right py-2 pr-3">Lectura</th>
                      <th className="text-right py-2 pr-3">Oración</th>
                      <th className="text-right py-2 pr-3">Reportes</th>
                      <th className="text-right py-2 pr-3">Total</th>
                      <th className="text-right py-2 pr-0">Detalle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, idx) => (
                      <tr key={r.id} className="border-b border-white/5">
                        <td className="py-2 pr-3 text-white/70">{idx + 1}</td>
                        <td className="py-2 pr-3 font-medium">{r.name}</td>
                        <td className="py-2 pr-3 text-white/80">{roleLabel(r.role)}</td>
                        <td className="py-2 pr-3 text-white/80">{r.group_name}</td>
                        <td className="py-2 pr-3 text-right">{formatearMinutos(r.bible_minutes)}</td>
                        <td className="py-2 pr-3 text-right">{formatearMinutos(r.prayer_minutes)}</td>
                        <td className="py-2 pr-3 text-right">{r.reports}</td>
                        <td className="py-2 pr-3 text-right font-semibold">{formatearMinutos(r.total_minutes)}</td>
                        <td className="py-2 text-right">
                          <Link
                            className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 hover:bg-white/10 transition"
                            href={`/admin/persona/${r.id}`}
                          >
                            Ver
                          </Link>
                        </td>
                      </tr>
                    ))}
                    {rows.length === 0 && (
                      <tr>
                        <td colSpan={9} className="py-6 text-center text-white/60">
                          No hay datos para mostrar.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </PageFade>
    </Container>
  );
}
