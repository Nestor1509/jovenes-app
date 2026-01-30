"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabaseClient";
import { cached, invalidate } from "@/lib/cache";
import { useMyProfile, Profile } from "@/lib/useMyProfile";
import { Container, Card, Title, Subtitle, Button, Input, Select, PageFade, Stat, Skeleton, EmptyState } from "@/components/ui";
import LoadingCard from "@/components/LoadingCard";
import { UserPlus, Users, Layers3, RefreshCw, BarChart3, Trophy } from "lucide-react";
const TopYouthBars = dynamic(() => import("@/components/charts/TopYouthBars"), { ssr: false });
const GroupCompareBars = dynamic(() => import("@/components/charts/GroupCompareBars"), { ssr: false });


type Group = { id: string; name: string };

type YouthGroupWeekRow = {
  group_id: string;
  group_name: string;
  week_start: string;
  active_youth: any;
  total_bible_minutes: any;
  total_prayer_minutes: any;
  total_reports: any;
};

type LeaderGroupWeekRow = {
  group_id: string;
  group_name: string;
  week_start: string;
  active_leaders: any;
  total_bible_minutes: any;
  total_prayer_minutes: any;
  total_reports: any;
};

type PersonTotals = {
  user_id: string;
  name: string;
  group_id: string | null;
  total_bible_minutes: any;
  total_prayer_minutes: any;
  total_reports: any;
};

function traducirError(msg: string) {
  const m = (msg ?? "").toLowerCase();
  if (m.includes("jwt")) return "Tu sesión expiró. Inicia sesión de nuevo.";
  if (m.includes("not authorized") || m.includes("no autorizado")) return "No autorizado.";
  if (m.includes("permission")) return "No tienes permisos para esta acción.";
  if (m.includes("duplicate") || m.includes("unique")) return "Ya existe un registro con esos datos.";
  return "Ocurrió un error.";
}

function formatearMinutos(min: any) {
  const t = Math.max(0, Math.floor(Number(min ?? 0)));
  const h = Math.floor(t / 60);
  const m = t % 60;
  if (h <= 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

export default function AdminPage() {
  const { loading: authLoading, session, profile, error: authError } = useMyProfile();

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  // Modo: jóvenes vs líderes
  const [whoMode, setWhoMode] = useState<"youth" | "leaders">("youth");

  // ✅ Selector Top 10 (lectura/oración/reportes)
  const [topMetric, setTopMetric] = useState<"bible" | "prayer" | "reports">("bible");

  const [groups, setGroups] = useState<Group[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  // Por grupos (semanal) para gráfica
  const [weekRowsYouth, setWeekRowsYouth] = useState<YouthGroupWeekRow[]>([]);
  const [weekRowsLeaders, setWeekRowsLeaders] = useState<LeaderGroupWeekRow[]>([]);
  const [availableWeeks, setAvailableWeeks] = useState<string[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string>("");

  // Totales individuales (tabla)
  const [youthTotals, setYouthTotals] = useState<PersonTotals[]>([]);
  const [leaderTotals, setLeaderTotals] = useState<PersonTotals[]>([]);

  const groupMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const g of groups) m.set(g.id, g.name);
    return m;
  }, [groups]);

  const activeWeekRows = useMemo(() => {
    if (!selectedWeek) return [];
    if (whoMode === "youth") return weekRowsYouth.filter((r) => r.week_start === selectedWeek);
    return weekRowsLeaders.filter((r) => r.week_start === selectedWeek);
  }, [whoMode, weekRowsYouth, weekRowsLeaders, selectedWeek]);

  const chartData = useMemo(() => {
    return activeWeekRows.map((r: any) => ({
      group: r.group_name,
      lectura: Number(r.total_bible_minutes ?? 0),
      oracion: Number(r.total_prayer_minutes ?? 0),
    }));
  }, [activeWeekRows]);

  const globalWeek = useMemo(() => {
    return activeWeekRows.reduce(
      (acc: any, r: any) => {
        const active = whoMode === "youth" ? Number(r.active_youth ?? 0) : Number(r.active_leaders ?? 0);
        acc.active += active;
        acc.bible += Number(r.total_bible_minutes ?? 0);
        acc.prayer += Number(r.total_prayer_minutes ?? 0);
        acc.reports += Number(r.total_reports ?? 0);
        return acc;
      },
      { active: 0, bible: 0, prayer: 0, reports: 0 }
    );
  }, [activeWeekRows, whoMode]);

  const people = useMemo(
    () => (whoMode === "youth" ? youthTotals : leaderTotals),
    [whoMode, youthTotals, leaderTotals]
  );

  const topTitle = useMemo(() => {
    const who = whoMode === "youth" ? "Jóvenes" : "Líderes";
    const metric =
      topMetric === "bible" ? "Lectura" : topMetric === "prayer" ? "Oración" : "Reportes";
    return `Top 10 ${who} — ${metric}`;
  }, [whoMode, topMetric]);

  const topData = useMemo(() => {
    const sorted = [...people].sort((a, b) => {
      const av =
        topMetric === "bible"
          ? Number(a.total_bible_minutes ?? 0)
          : topMetric === "prayer"
          ? Number(a.total_prayer_minutes ?? 0)
          : Number(a.total_reports ?? 0);

      const bv =
        topMetric === "bible"
          ? Number(b.total_bible_minutes ?? 0)
          : topMetric === "prayer"
          ? Number(b.total_prayer_minutes ?? 0)
          : Number(b.total_reports ?? 0);

      return bv - av;
    });

    return sorted.slice(0, 10).map((p) => ({
      name: p.name.length > 12 ? p.name.slice(0, 12) + "…" : p.name,
      fullName: p.name,
      // Si es reportes, es "cantidad", pero TopYouthBars lo formatea como minutos.
      // Para evitar confusión: cuando sea reportes, mostramos el número como "minutos" no sirve.
      // Así que si es reportes, lo convertimos a "minutos ficticios" NO. Mejor: dejamos el valor,
      // y ajustamos el tooltip en TopYouthBars si quieres (yo te doy opción abajo).
      value:
        topMetric === "bible"
          ? Number(p.total_bible_minutes ?? 0)
          : topMetric === "prayer"
          ? Number(p.total_prayer_minutes ?? 0)
          : Number(p.total_reports ?? 0),
      isCount: topMetric === "reports",
    }));
  }, [people, topMetric]);

  // Admin: crear grupo
  const [newGroupName, setNewGroupName] = useState("");

  // Admin: crear usuario
  const [uEmail, setUEmail] = useState("");
  const [uPass, setUPass] = useState("");
  const [uName, setUName] = useState("");
  const [uRole, setURole] = useState<"youth" | "leader">("youth");
  const [uGroup, setUGroup] = useState<string>("");

  const [savingId, setSavingId] = useState<string | null>(null);

  async function cargarTodo() {
    setMsg("");
    setLoading(true);

    if (!session || !profile || profile.role !== "admin") {
      setLoading(false);
      return;
    }

    const [gRes, pRes, wYouthRes, wLeaderRes, yTotRes, lTotRes] = await cached(`admin:${session.user.id}:base`, async () => Promise.all([
      supabase.from("groups").select("id,name").order("name"),
      supabase.from("profiles").select("id,name,role,group_id").order("role").order("name"),

      // Jóvenes por grupo
      supabase.from("public_group_stats_week").select("*").order("week_start", { ascending: false }).limit(800),

      // Líderes por grupo
      supabase.from("admin_public_leader_group_stats_week").select("*").order("week_start", { ascending: false }).limit(800),

      // Totales individuales (ya filtrado por SQL)
      supabase.from("leader_youth_totals").select("*").order("name"),
      supabase.from("admin_leader_totals").select("*").order("name"),
    ]), 30000);

    if (gRes.error) setMsg(traducirError(gRes.error.message));
    setGroups((gRes.data ?? []) as Group[]);

    if (pRes.error) setMsg(traducirError(pRes.error.message));
    setProfiles((pRes.data ?? []) as any);

    if (wYouthRes.error) setMsg("No se pudieron cargar estadísticas de jóvenes por grupo.");
    if (wLeaderRes.error) setMsg("No se pudieron cargar estadísticas de líderes por grupo.");

    const youthRows = (wYouthRes.data ?? []) as YouthGroupWeekRow[];
    const leaderRows = (wLeaderRes.data ?? []) as LeaderGroupWeekRow[];
    setWeekRowsYouth(youthRows);
    setWeekRowsLeaders(leaderRows);

    const weeks = Array.from(
      new Set([...youthRows.map((x) => x.week_start), ...leaderRows.map((x) => x.week_start)].filter(Boolean))
    ).slice(0, 24);

    setAvailableWeeks(weeks);
    setSelectedWeek((prev) => prev || weeks[0] || "");

    if (yTotRes.error) setMsg("No se pudieron cargar los totales de jóvenes.");
    if (lTotRes.error) setMsg("No se pudieron cargar los totales de líderes.");

    setYouthTotals((yTotRes.data ?? []) as any);
    setLeaderTotals((lTotRes.data ?? []) as any);

    setLoading(false);
  }

  useEffect(() => {
    if (authLoading) return;
    if (!session) return;
    cargarTodo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, session?.user?.id, profile?.role]);

  async function crearGrupo() {
    setMsg("");
    const name = newGroupName.trim();
    if (!name) return setMsg("Escribe un nombre de grupo.");

    const { error } = await supabase.from("groups").insert({ name });
    if (error) setMsg(traducirError(error.message));
    else {
      setNewGroupName("");
      setMsg("✅ Grupo creado.");
      await cargarTodo();
    }
  }

  async function crearUsuario() {
    setMsg("");
    const token = session?.access_token;

    if (!token) return setMsg("Sesión inválida. Inicia sesión de nuevo.");
    if (!uEmail.trim() || !uPass.trim() || !uName.trim()) {
      return setMsg("Completa: correo, contraseña temporal y nombre.");
    }

    const res = await fetch("/api/admin/create-user", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        email: uEmail.trim(),
        password: uPass,
        name: uName.trim(),
        role: uRole,
        group_id: uGroup ? uGroup : null,
      }),
    });

    const data = await res.json();
    if (!res.ok) return setMsg(data?.error ?? "No se pudo crear el usuario.");

    setMsg("✅ Usuario creado. Comparte el correo y contraseña temporal.");
    setUEmail("");
    setUPass("");
    setUName("");
    setURole("youth");
    setUGroup("");
    await cargarTodo();
  }

  async function actualizarGrupoUsuario(userId: string, newGroupId: string | null) {
    setMsg("");
    setSavingId(userId);

    const { error } = await supabase.from("profiles").update({ group_id: newGroupId }).eq("id", userId);
    if (error) setMsg(traducirError(error.message));
    else {
      setMsg("✅ Grupo actualizado.");
      setProfiles((prev) => prev.map((p) => (p.id === userId ? { ...p, group_id: newGroupId } : p)));
    }

    setSavingId(null);
  }

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

  if (authError) {
    return (
      <Container>
        <PageFade>
          <Card>
            <Title>Error</Title>
            <Subtitle>{authError}</Subtitle>
          </Card>
        </PageFade>
      </Container>
    );
  }

  if (!profile || profile.role !== "admin") {
    return (
      <Container>
        <PageFade>
          <Card>
            <Title>Acceso restringido</Title>
            <Subtitle>Esta página es solo para administradores.</Subtitle>
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
              <Title>Panel de administrador</Title>
              <Subtitle>Jóvenes y líderes separados.</Subtitle>
            </div>

            <Button onClick={cargarTodo} className="bg-white/90 hover:bg-white text-zinc-900 inline-flex gap-2">
              <RefreshCw size={16} /> Actualizar
            </Button>
          </div>

          {msg && <div className={msg.startsWith("✅") ? "text-green-300 text-sm" : "text-red-300 text-sm"}>{msg}</div>}

          <Card>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <BarChart3 size={18} className="opacity-80" />
                  <div className="text-sm font-semibold">Comparación por grupos</div>
                </div>
                <Subtitle>Modo y semana seleccionables.</Subtitle>
              </div>

              <div className="flex gap-3 flex-wrap">
                <div className="w-full sm:w-48">
                  <div className="text-xs text-white/60 mb-1">Ver</div>
                  <Select value={whoMode} onChange={(e) => setWhoMode(e.target.value as any)}>
                    <option value="youth">Jóvenes</option>
                    <option value="leaders">Líderes</option>
                  </Select>
                </div>

                <div className="w-full sm:w-48">
                  <div className="text-xs text-white/60 mb-1">Semana</div>
                  <Select value={selectedWeek} onChange={(e) => setSelectedWeek(e.target.value)}>
                    {availableWeeks.map((w) => (
                      <option key={w} value={w}>
                        {w}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </div>

            {activeWeekRows.length === 0 ? (
              <div className="mt-4 text-sm text-white/70">No hay datos para esa semana.</div>
            ) : (
              <>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Stat label={whoMode === "youth" ? "Activos (jóvenes)" : "Activos (líderes)"} value={globalWeek.active} />
                  <Stat label="Lectura total" value={formatearMinutos(globalWeek.bible)} />
                  <Stat label="Oración total" value={formatearMinutos(globalWeek.prayer)} />
                  <Stat label="Reportes" value={globalWeek.reports} />
                </div>

                <div className="mt-4">
                  <GroupCompareBars data={chartData} />
                </div>
              </>
            )}
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Trophy size={18} className="opacity-80" />
                  <div className="text-sm font-semibold">{topTitle}</div>
                </div>
                <Subtitle>Totales individuales (separados por rol).</Subtitle>
              </div>

              <div className="w-full sm:w-56">
                <div className="text-xs text-white/60 mb-1">Ordenar Top 10 por</div>
                <Select value={topMetric} onChange={(e) => setTopMetric(e.target.value as any)}>
                  <option value="bible">Lectura</option>
                  <option value="prayer">Oración</option>
                  <option value="reports">Reportes</option>
                </Select>
              </div>
            </div>

            <div className="mt-4">
              {topData.length === 0 ? <EmptyState title="Aún no hay datos" description="Cuando haya reportes, verás el ranking aquí." /> : <TopYouthBars data={topData as any} />}
            </div>

            {topMetric === "reports" && (
              <div className="text-xs text-white/50 mt-2">
                Nota: este Top está por cantidad de reportes, no por minutos.
              </div>
            )}
          </Card>

          <Card>
            <div className="flex items-center gap-2 mb-2">
              <Users size={18} className="opacity-80" />
              <div className="text-sm font-semibold">
                {whoMode === "youth" ? "Totales de jóvenes (individual)" : "Totales de líderes (individual)"}
              </div>
            </div>
            <Subtitle>
              {whoMode === "youth" ? "Incluye solo jóvenes." : "Incluye solo líderes."}
            </Subtitle>

            <div className="mt-4 overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-white/70">
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 pr-3">Nombre</th>
                    <th className="text-left py-3 pr-3">Grupo</th>
                    <th className="text-left py-3 pr-3">Lectura</th>
                    <th className="text-left py-3 pr-3">Oración</th>
                    <th className="text-left py-3 pr-3">Reportes</th>
                  </tr>
                </thead>
                <tbody>
                  {people.map((p) => (
                    <tr key={p.user_id} className="border-b border-white/5">
                      <td className="py-3 pr-3 font-medium">{p.name}</td>
                      <td className="py-3 pr-3">{p.group_id ? groupMap.get(p.group_id) ?? "—" : "—"}</td>
                      <td className="py-3 pr-3">{formatearMinutos(p.total_bible_minutes)}</td>
                      <td className="py-3 pr-3">{formatearMinutos(p.total_prayer_minutes)}</td>
                      <td className="py-3 pr-3">{Number(p.total_reports ?? 0)}</td>
                    </tr>
                  ))}

                  {people.length === 0 && (
                    <tr>
                      <td className="py-4 text-white/70" colSpan={5}>
                        No hay datos aún.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Gestión: grupos / usuarios / asignación */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <div className="flex items-center gap-2 mb-2">
                <Layers3 size={18} className="opacity-80" />
                <div className="text-sm font-semibold">Grupos</div>
              </div>
              <Subtitle>Crea grupos para organizar a los jóvenes.</Subtitle>

              <div className="mt-4 grid gap-3">
                <Input placeholder="Ej: Grupo 1" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} />
                <Button onClick={crearGrupo}>Crear grupo</Button>
              </div>

              <div className="mt-5">
                <div className="text-xs text-white/60 mb-2">Grupos existentes</div>
                <div className="grid gap-2">
                  {groups.length === 0 ? (
                    <div className="text-sm text-white/70">Aún no hay grupos.</div>
                  ) : (
                    groups.map((g) => (
                      <div key={g.id} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm">
                        {g.name}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-2 mb-2">
                <UserPlus size={18} className="opacity-80" />
                <div className="text-sm font-semibold">Crear cuenta</div>
              </div>
              <Subtitle>El admin crea cuentas de jóvenes y líderes.</Subtitle>

              <div className="mt-4 grid gap-3">
                <div>
                  <div className="text-xs text-white/60 mb-1">Correo</div>
                  <Input value={uEmail} onChange={(e) => setUEmail(e.target.value)} placeholder="correo@ejemplo.com" />
                </div>

                <div>
                  <div className="text-xs text-white/60 mb-1">Contraseña temporal</div>
                  <Input value={uPass} onChange={(e) => setUPass(e.target.value)} placeholder="Ej: Jovenes2026!" />
                </div>

                <div>
                  <div className="text-xs text-white/60 mb-1">Nombre</div>
                  <Input value={uName} onChange={(e) => setUName(e.target.value)} placeholder="Nombre y apellido" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-white/60 mb-1">Rol</div>
                    <Select value={uRole} onChange={(e) => setURole(e.target.value as any)}>
                      <option value="youth">Joven</option>
                      <option value="leader">Líder</option>
                    </Select>
                  </div>

                  <div>
                    <div className="text-xs text-white/60 mb-1">Grupo (opcional)</div>
                    <Select value={uGroup} onChange={(e) => setUGroup(e.target.value)}>
                      <option value="">— Sin asignar —</option>
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

                <Button onClick={crearUsuario}>Crear cuenta</Button>
              </div>
            </Card>
          </div>

          <Card>
            <div className="flex items-center gap-2 mb-2">
              <Users size={18} className="opacity-80" />
              <div className="text-sm font-semibold">Personas registradas</div>
            </div>
            <Subtitle>Asignación de grupo (para jóvenes y líderes).</Subtitle>

            <div className="mt-4 overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-white/70">
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 pr-3">Nombre</th>
                    <th className="text-left py-3 pr-3">Rol</th>
                    <th className="text-left py-3 pr-3">Grupo</th>
                    <th className="text-left py-3 pr-3">Detalle</th>
                    <th className="text-left py-3 pr-3">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((p) => {
                    const rolBonito = p.role === "admin" ? "Admin" : p.role === "leader" ? "Líder" : "Joven";
                    const currentGroupName = p.group_id ? groupMap.get(p.group_id) : "— Sin asignar —";

                    return (
                      <tr key={p.id} className="border-b border-white/5">
                        <td className="py-3 pr-3">
                          <div className="font-medium">{p.name}</div>
                          <div className="text-xs text-white/50">{p.id.slice(0, 8)}…</div>
                        </td>
                        <td className="py-3 pr-3">{rolBonito}</td>
                        <td className="py-3 pr-3">
                          <Select
                            value={p.group_id ?? ""}
                            disabled={savingId === p.id}
                            onChange={(e) => actualizarGrupoUsuario(p.id, e.target.value ? e.target.value : null)}
                          >
                            <option value="">— Sin asignar —</option>
                            {groups.map((g) => (
                              <option key={g.id} value={g.id}>
                                {g.name}
                              </option>
                            ))}
                          </Select>
                          <div className="text-xs text-white/50 mt-1">Actual: {currentGroupName}</div>
                        </td>
                        
<td className="py-3 pr-3">
  {p.role === "admin" ? (
    <span className="text-xs text-white/40">—</span>
  ) : (
    <Link href={`/admin/persona/${p.id}`} className="inline-flex">
      <span className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/15 transition">
        Ver
      </span>
    </Link>
  )}
</td>
                        <td className="py-3 pr-3">
                          {savingId === p.id ? (
                            <span className="text-xs text-white/60">Guardando…</span>
                          ) : (
                            <span className="text-xs text-white/40">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {profiles.length === 0 && (
                    <tr>
                      <td className="py-4 text-white/70" colSpan={5}>
                        Aún no hay personas registradas.
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