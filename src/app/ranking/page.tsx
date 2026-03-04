"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useMyProfile } from "@/lib/useMyProfile";
import { Container, Card, Title, Subtitle, Button, PageFade, Input, Badge } from "@/components/ui";
import {
  Trophy,
  BookOpen,
  HeartHandshake,
  CalendarDays,
  Users,
  RefreshCw,
  Sparkles,
  Crown,
  ArrowRight,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

type Period = "day" | "week" | "month" | "all";
type Metric = "chapters" | "prayer";

type Row = {
  user_id: string;
  name: string;
  role: string;
  group_id: string | null;
  total: number;
};

function fmtPrayerMinutes(min: number) {
  const t = Math.max(0, Math.floor(Number(min || 0)));
  const h = Math.floor(t / 60);
  const m = t % 60;
  if (h <= 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

function periodLabel(p: Period) {
  if (p === "day") return "Diario";
  if (p === "week") return "Semana";
  if (p === "month") return "Mes";
  return "Global";
}

function shortGroupId(gid?: string | null) {
  if (!gid) return "—";
  const s = String(gid);
  return s.length <= 10 ? s : `${s.slice(0, 8)}…`;
}

function medal(pos: number) {
  if (pos === 1) return "🥇";
  if (pos === 2) return "🥈";
  if (pos === 3) return "🥉";
  return String(pos);
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function Segmented({
  value,
  onChange,
  options,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; icon?: React.ReactNode }[];
  className?: string;
}) {
  return (
    <div
      className={[
        "grid grid-cols-2 gap-1 rounded-2xl border border-white/10 bg-black/20 p-1",
        className,
      ].join(" ")}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={[
              "rounded-xl px-3 py-2 text-sm font-medium transition flex items-center justify-center gap-2",
              active ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5",
            ].join(" ")}
          >
            {opt.icon}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function Pills({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={[
              "shrink-0 rounded-2xl px-4 py-2 text-sm border transition",
              active
                ? "bg-white/10 border-white/15 text-white"
                : "bg-white/5 border-white/10 text-white/75 hover:bg-white/10",
            ].join(" ")}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export default function RankingPage() {
  const { loading: authLoading, session, profile } = useMyProfile();

  const [metric, setMetric] = useState<Metric>("chapters");
  const [period, setPeriod] = useState<Period>("week");
  const [limit, setLimit] = useState<number>(10);

  // rango opcional
  const [startDate, setStartDate] = useState<string>(""); // YYYY-MM-DD
  const [endDate, setEndDate] = useState<string>(""); // YYYY-MM-DD
  const rangeActive = useMemo(() => !!startDate && !!endDate, [startDate, endDate]);

  const dateError = useMemo(() => {
    if (!startDate || !endDate) return "";
    return startDate > endDate ? "La fecha 'Desde' no puede ser mayor que 'Hasta'." : "";
  }, [startDate, endDate]);

  const isAdmin = profile?.role === "admin";
  const [adminGroup, setAdminGroup] = useState<string>("");

  const effectiveGroupId = useMemo(() => {
    if (!isAdmin) return null;
    const t = adminGroup.trim();
    return t === "" ? null : t;
  }, [isAdmin, adminGroup]);

  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const [filtersOpen, setFiltersOpen] = useState(false);

  function setRangePreset(daysBack: number) {
    const d = new Date();
    const end = d.toISOString().slice(0, 10);
    d.setDate(d.getDate() - (daysBack - 1));
    const start = d.toISOString().slice(0, 10);
    setStartDate(start);
    setEndDate(end);
  }

  function clearDates() {
    setStartDate("");
    setEndDate("");
  }

  async function load() {
    setMsg("");
    if (!session) return;

    if (startDate && endDate && startDate > endDate) {
      setRows([]);
      setMsg("La fecha 'Desde' no puede ser mayor que 'Hasta'.");
      return;
    }

    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("get_group_ranking", {
        p_period: period,
        p_metric: metric,
        p_group_id: effectiveGroupId,
        p_limit: limit,
        p_start_date: startDate || null,
        p_end_date: endDate || null,
      });

      if (error) {
        setRows([]);
        setMsg(error.message || "No se pudo cargar el ranking.");
        return;
      }

      setRows((data ?? []) as Row[]);
    } catch {
      setRows([]);
      setMsg("No se pudo cargar el ranking.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (authLoading) return;
    if (!session) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, session?.user?.id, metric, period, limit, effectiveGroupId, startDate, endDate]);

  if (authLoading) {
    return (
      <Container>
        <PageFade>
          <Card>
            <Title>Ranking</Title>
            <div className="text-sm text-white/70 mt-2">Cargando sesión…</div>
          </Card>
        </PageFade>
      </Container>
    );
  }

  if (!session) {
    return (
      <Container>
        <PageFade>
          <Card>
            <Title>Ranking</Title>
            <Subtitle>Inicia sesión para ver el ranking de tu grupo.</Subtitle>
            <div className="mt-4">
              <Button onClick={() => (window.location.href = "/")}>Ir a inicio</Button>
            </div>
          </Card>
        </PageFade>
      </Container>
    );
  }

  const topValue = Math.max(...rows.map((r) => Number(r.total ?? 0)), 0);
  const meRow = rows.find((r) => r.user_id === session.user.id) || null;
  const mePos = meRow ? rows.findIndex((r) => r.user_id === session.user.id) + 1 : null;

  const MetricIcon = metric === "chapters" ? BookOpen : HeartHandshake;

  const top1 = rows[0] || null;
  const top2 = rows[1] || null;
  const top3 = rows[2] || null;

  const top1Value =
    metric === "chapters"
      ? String(Number(top1?.total ?? 0))
      : fmtPrayerMinutes(Number(top1?.total ?? 0));

  const meValue =
    metric === "chapters"
      ? String(Number(meRow?.total ?? 0))
      : fmtPrayerMinutes(Number(meRow?.total ?? 0));

  return (
    <Container>
      <PageFade>
        <div className="relative">
          {/* Fondo decorativo */}
          <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 w-[900px] h-[260px] rounded-full blur-3xl opacity-[0.12] bg-white/20" />

          {/* ======= MOBILE: barra sticky para evitar “bajar muchísimo” ======= */}
          <div className="lg:hidden sticky top-2 z-40">
            <Card className="p-3 bg-black/50 backdrop-blur border border-white/10">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Trophy size={16} className="opacity-80" />
                    <div className="text-sm font-semibold truncate">Ranking</div>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <Badge className="gap-1.5">
                      <Users size={12} className="opacity-80" />
                      <span className="truncate">
                        {isAdmin ? "Admin" : shortGroupId(profile?.group_id)}
                      </span>
                    </Badge>
                    <Badge className="gap-1.5">
                      <CalendarDays size={12} className="opacity-80" />
                      <span>{rangeActive ? "Rango" : periodLabel(period)}</span>
                    </Badge>
                    {mePos && (
                      <Badge className="gap-1.5">
                        <span className="text-white/80">#{mePos}</span>
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFiltersOpen(true)}
                    className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10 transition flex items-center gap-2"
                  >
                    <SlidersHorizontal size={16} />
                    <span>Filtros</span>
                  </button>

                  <button
                    type="button"
                    onClick={load}
                    disabled={busy || !!dateError}
                    className={[
                      "rounded-2xl border px-3 py-2 text-sm transition flex items-center gap-2",
                      busy || !!dateError
                        ? "border-white/10 bg-white/5 text-white/40"
                        : "border-white/10 bg-white/10 text-white hover:bg-white/15",
                    ].join(" ")}
                    title="Actualizar"
                  >
                    <RefreshCw size={16} className={busy ? "animate-spin" : ""} />
                  </button>
                </div>
              </div>

              <div className="mt-3 grid gap-2">
                <Segmented
                  value={metric}
                  onChange={(v) => setMetric(v as Metric)}
                  options={[
                    { value: "chapters", label: "Capítulos", icon: <BookOpen size={16} className="opacity-85" /> },
                    { value: "prayer", label: "Oración", icon: <HeartHandshake size={16} className="opacity-85" /> },
                  ]}
                />

                <div className={rangeActive ? "opacity-50 pointer-events-none" : ""}>
                  <Pills
                    value={period}
                    onChange={(v) => setPeriod(v as Period)}
                    options={[
                      { value: "day", label: "Diario" },
                      { value: "week", label: "Semana" },
                      { value: "month", label: "Mes" },
                      { value: "all", label: "Global" },
                    ]}
                  />
                </div>
              </div>

              {msg && <div className="text-sm text-amber-200 mt-2">{msg}</div>}
            </Card>
          </div>

          {/* ======= DESKTOP: sidebar sticky + content ======= */}
          <div className="grid gap-6 mt-4 lg:grid-cols-[420px_1fr] items-start">
            {/* SIDEBAR (desktop only) */}
            <div className="hidden lg:block">
              <Card className="p-4 bg-black/20 border border-white/10 sticky top-6">
                {/* Header */}
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-2xl border border-white/10 bg-white/5 grid place-items-center">
                    <Trophy size={18} className="opacity-85" />
                  </div>
                  <div className="min-w-0">
                    <Title>Ranking</Title>
                    <Subtitle className="mt-0.5">{isAdmin ? "Vista (Admin)" : "Top de tu grupo 💪"}</Subtitle>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge className="gap-2 max-w-full">
                    <Users size={14} className="opacity-80 shrink-0" />
                    <span className="truncate">
                      {isAdmin ? "Admin: cualquier grupo" : `Grupo: ${shortGroupId(profile?.group_id)}`}
                    </span>
                  </Badge>

                  <Badge className="gap-2">
                    <CalendarDays size={14} className="opacity-80" />
                    <span>{rangeActive ? "Rango" : periodLabel(period)}</span>
                  </Badge>

                  {mePos && (
                    <Badge className="gap-2">
                      <span className="text-white/80">Tu puesto:</span>
                      <span className="font-semibold text-white">#{mePos}</span>
                    </Badge>
                  )}
                </div>

                {rangeActive && (
                  <div className="mt-2">
                    <Badge className="gap-2">
                      <span className="text-white/80">Fechas:</span>
                      <span className="font-semibold text-white">
                        {startDate} <ArrowRight size={14} className="inline opacity-70" /> {endDate}
                      </span>
                    </Badge>
                  </div>
                )}

                {msg && <div className="text-sm text-amber-200 mt-3">{msg}</div>}

                {/* Resumen mini para “rellenar” */}
                <div className="mt-4 grid gap-3">
                  <Card className="p-4 bg-black/20 border border-white/10">
                    <div className="flex items-center gap-2 text-xs text-white/60">
                      <Crown size={14} className="opacity-80" />
                      <span>Top 1</span>
                    </div>
                    <div className="mt-1 font-semibold truncate">{top1?.name ?? "—"}</div>
                    <div className="mt-1 text-sm text-white/70">
                      {metric === "chapters" ? `${top1Value} capítulos` : `${top1Value}`}
                    </div>
                  </Card>

                  <Card className="p-4 bg-black/20 border border-white/10">
                    <div className="flex items-center gap-2 text-xs text-white/60">
                      <Sparkles size={14} className="opacity-80" />
                      <span>Tú</span>
                    </div>
                    <div className="mt-1 font-semibold truncate">{meRow?.name ?? "—"}</div>
                    <div className="mt-1 text-sm text-white/70">
                      {meRow ? (metric === "chapters" ? `${meValue} capítulos` : `${meValue}`) : "Sin datos"}
                    </div>
                  </Card>
                </div>

                {/* Controls */}
                <div className="mt-4 grid gap-3">
                  <Segmented
                    value={metric}
                    onChange={(v) => setMetric(v as Metric)}
                    options={[
                      { value: "chapters", label: "Capítulos", icon: <BookOpen size={16} className="opacity-85" /> },
                      { value: "prayer", label: "Oración", icon: <HeartHandshake size={16} className="opacity-85" /> },
                    ]}
                  />

                  <div className={rangeActive ? "opacity-50 pointer-events-none" : ""}>
                    <div className="text-xs text-white/60 mb-1">Periodo</div>
                    <Pills
                      value={period}
                      onChange={(v) => setPeriod(v as Period)}
                      options={[
                        { value: "day", label: "Diario" },
                        { value: "week", label: "Semana" },
                        { value: "month", label: "Mes" },
                        { value: "all", label: "Global" },
                      ]}
                    />
                    {rangeActive && (
                      <div className="text-[11px] text-white/55 mt-1">Rango activo: el periodo se ignora.</div>
                    )}
                  </div>

                  {/* Rango */}
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="text-xs font-medium text-white/70">Rango de fechas</div>
                      <button
                        type="button"
                        onClick={clearDates}
                        disabled={busy || (!startDate && !endDate)}
                        className={[
                          "text-xs px-2 py-1 rounded-xl border transition",
                          busy || (!startDate && !endDate)
                            ? "border-white/10 text-white/30"
                            : "border-white/10 text-white/70 hover:bg-white/5",
                        ].join(" ")}
                        title="Limpiar"
                      >
                        Limpiar
                      </button>
                    </div>

                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                      <div className="relative">
                        <CalendarDays size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
                        <Input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="pl-9"
                        />
                        <div className="mt-1 text-[11px] text-white/45">Desde</div>
                      </div>

                      <div className="text-white/40 text-sm font-semibold select-none">→</div>

                      <div className="relative">
                        <CalendarDays size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
                        <Input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="pl-9"
                        />
                        <div className="mt-1 text-[11px] text-white/45">Hasta</div>
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="text-xs px-3 py-1.5 rounded-2xl border border-white/10 bg-black/20 text-white/70 hover:bg-white/5 transition"
                        onClick={() => setRangePreset(1)}
                        disabled={busy}
                      >
                        Hoy
                      </button>
                      <button
                        type="button"
                        className="text-xs px-3 py-1.5 rounded-2xl border border-white/10 bg-black/20 text-white/70 hover:bg-white/5 transition"
                        onClick={() => setRangePreset(7)}
                        disabled={busy}
                      >
                        7 días
                      </button>
                      <button
                        type="button"
                        className="text-xs px-3 py-1.5 rounded-2xl border border-white/10 bg-black/20 text-white/70 hover:bg-white/5 transition"
                        onClick={() => setRangePreset(30)}
                        disabled={busy}
                      >
                        30 días
                      </button>

                      {dateError && <div className="text-xs text-amber-200 mt-1">{dateError}</div>}
                    </div>

                    <div className="mt-2 text-[11px] text-white/45">
                      Si defines el rango completo, el ranking se filtra solo en esas fechas.
                    </div>
                  </div>

                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <div className="text-xs text-white/60 mb-1">Top</div>
                      <Segmented
                        value={String(limit)}
                        onChange={(v) => setLimit(Number(v))}
                        options={[
                          { value: "10", label: "10" },
                          { value: "15", label: "15" },
                        ]}
                        className="grid-cols-2"
                      />
                    </div>

                    <Button
                      className="bg-white/10 text-white border border-white/10 hover:bg-white/15"
                      onClick={load}
                      disabled={busy || !!dateError}
                      title="Actualizar"
                    >
                      <RefreshCw size={16} className={busy ? "animate-spin mr-2" : "mr-2"} />
                      {busy ? "Actualizando…" : "Actualizar"}
                    </Button>
                  </div>

                  {isAdmin && (
                    <div className="pt-2 border-t border-white/10">
                      <div className="text-xs text-white/60 mb-1">Admin: Group ID (vacío = Global)</div>
                      <Input
                        placeholder="uuid del group_id (opcional)"
                        value={adminGroup}
                        onChange={(e) => setAdminGroup(e.target.value)}
                      />
                      <div className="text-[11px] text-white/50 mt-1">
                        Tip: copia el <b>group_id</b> desde el perfil de un joven.
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* CONTENT */}
            <div className="min-w-0">
              <Card className="bg-black/20 border border-white/10 p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <MetricIcon size={18} className="opacity-80" />
                    <div className="text-sm font-semibold">
                      Top {limit} — {metric === "chapters" ? "Capítulos" : "Tiempo de oración"}
                    </div>
                  </div>

                  <div className="text-xs text-white/60 text-right">
                    <div>{rangeActive ? "Filtrado por rango" : `Periodo: ${periodLabel(period)}`}</div>
                    {meRow && (
                      <div className="hidden sm:block">
                        Tú:{" "}
                        <span className="text-white font-semibold">
                          {metric === "chapters"
                            ? Number(meRow.total ?? 0)
                            : fmtPrayerMinutes(Number(meRow.total ?? 0))}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {busy && rows.length === 0 ? (
                  <div className="text-sm text-white/70">Cargando ranking…</div>
                ) : rows.length === 0 ? (
                  <div className="text-sm text-white/70">
                    Aún no hay datos para {rangeActive ? "este rango" : "este periodo"}.
                  </div>
                ) : (
                  <div className="grid gap-2">
                    <AnimatePresence initial={false}>
                      {rows.map((r, idx) => {
                        const pos = idx + 1;
                        const isMe = session?.user?.id === r.user_id;
                        const raw = Number(r.total ?? 0);
                        const value = metric === "chapters" ? String(raw) : fmtPrayerMinutes(raw);
                        const pct = topValue <= 0 ? 0 : clamp((raw / topValue) * 100, 0, 100);

                        return (
                          <motion.div
                            key={r.user_id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            transition={{ duration: 0.18 }}
                            className={[
                              "rounded-2xl border bg-black/20 p-3 sm:p-4",
                              isMe ? "border-emerald-400/25 bg-emerald-500/10" : "border-white/10",
                            ].join(" ")}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div
                                  className={[
                                    "h-10 w-10 rounded-2xl grid place-items-center text-sm font-semibold border shrink-0",
                                    pos === 1
                                      ? "bg-yellow-500/15 border-yellow-400/20"
                                      : pos === 2
                                      ? "bg-white/10 border-white/15"
                                      : pos === 3
                                      ? "bg-orange-500/15 border-orange-400/20"
                                      : "bg-white/5 border-white/10",
                                  ].join(" ")}
                                  title={`#${pos}`}
                                >
                                  <span className="leading-none">{medal(pos)}</span>
                                </div>

                                <div className="min-w-0">
                                  <div className="font-medium truncate max-w-[200px] sm:max-w-none">
                                    {r.name || "—"}
                                  </div>
                                  <div className="text-xs text-white/55 truncate">{isMe ? "⭐ Tú" : ""}</div>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <div className="text-sm sm:text-base font-semibold">{value}</div>
                                <div className="text-[11px] text-white/50 hidden sm:block">
                                  {metric === "chapters" ? "capítulos" : "total"}
                                </div>
                              </div>
                            </div>

                            <div className="mt-3">
                              <div className="h-2 w-full rounded-full bg-white/5 border border-white/10 overflow-hidden">
                                <div
                                  className={[
                                    "h-full rounded-full",
                                    isMe ? "bg-emerald-400/70" : pos === 1 ? "bg-yellow-400/70" : "bg-white/30",
                                  ].join(" ")}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                )}
              </Card>
            </div>
          </div>

          {/* ======= MOBILE FILTERS: bottom sheet ======= */}
          <AnimatePresence>
            {filtersOpen && (
              <>
                <motion.button
                  type="button"
                  aria-label="Cerrar"
                  className="fixed inset-0 z-50 bg-black/60"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setFiltersOpen(false)}
                />
                <motion.div
                  className="fixed bottom-0 left-0 right-0 z-50"
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 30, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  <Card className="mx-2 mb-2 p-4 bg-black/70 backdrop-blur border border-white/10 rounded-3xl">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold flex items-center gap-2">
                        <SlidersHorizontal size={16} className="opacity-85" />
                        Filtros
                      </div>
                      <button
                        type="button"
                        onClick={() => setFiltersOpen(false)}
                        className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10 transition flex items-center gap-2"
                      >
                        <X size={16} />
                        Cerrar
                      </button>
                    </div>

                    <div className="mt-3 grid gap-3">
                      {/* Top */}
                      <div>
                        <div className="text-xs text-white/60 mb-1">Top</div>
                        <Segmented
                          value={String(limit)}
                          onChange={(v) => setLimit(Number(v))}
                          options={[
                            { value: "10", label: "10" },
                            { value: "15", label: "15" },
                          ]}
                          className="grid-cols-2"
                        />
                      </div>

                      {/* Rango */}
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="text-xs font-medium text-white/70">Rango de fechas</div>
                          <button
                            type="button"
                            onClick={clearDates}
                            disabled={busy || (!startDate && !endDate)}
                            className={[
                              "text-xs px-2 py-1 rounded-xl border transition",
                              busy || (!startDate && !endDate)
                                ? "border-white/10 text-white/30"
                                : "border-white/10 text-white/70 hover:bg-white/5",
                            ].join(" ")}
                          >
                            Limpiar
                          </button>
                        </div>

                        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                          <div className="relative">
                            <CalendarDays
                              size={14}
                              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50"
                            />
                            <Input
                              type="date"
                              value={startDate}
                              onChange={(e) => setStartDate(e.target.value)}
                              className="pl-9"
                            />
                            <div className="mt-1 text-[11px] text-white/45">Desde</div>
                          </div>

                          <div className="text-white/40 text-sm font-semibold select-none">→</div>

                          <div className="relative">
                            <CalendarDays
                              size={14}
                              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50"
                            />
                            <Input
                              type="date"
                              value={endDate}
                              onChange={(e) => setEndDate(e.target.value)}
                              className="pl-9"
                            />
                            <div className="mt-1 text-[11px] text-white/45">Hasta</div>
                          </div>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="text-xs px-3 py-1.5 rounded-2xl border border-white/10 bg-black/20 text-white/70 hover:bg-white/5 transition"
                            onClick={() => setRangePreset(1)}
                            disabled={busy}
                          >
                            Hoy
                          </button>
                          <button
                            type="button"
                            className="text-xs px-3 py-1.5 rounded-2xl border border-white/10 bg-black/20 text-white/70 hover:bg-white/5 transition"
                            onClick={() => setRangePreset(7)}
                            disabled={busy}
                          >
                            7 días
                          </button>
                          <button
                            type="button"
                            className="text-xs px-3 py-1.5 rounded-2xl border border-white/10 bg-black/20 text-white/70 hover:bg-white/5 transition"
                            onClick={() => setRangePreset(30)}
                            disabled={busy}
                          >
                            30 días
                          </button>
                        </div>

                        {dateError && <div className="text-xs text-amber-200 mt-2">{dateError}</div>}
                        <div className="mt-2 text-[11px] text-white/45">
                          Si defines el rango completo, el ranking se filtra solo en esas fechas.
                        </div>
                      </div>

                      {/* Admin */}
                      {isAdmin && (
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                          <div className="text-xs text-white/60 mb-1">Admin: Group ID (vacío = Global)</div>
                          <Input
                            placeholder="uuid del group_id (opcional)"
                            value={adminGroup}
                            onChange={(e) => setAdminGroup(e.target.value)}
                          />
                          <div className="text-[11px] text-white/50 mt-1">
                            Tip: copia el <b>group_id</b> desde el perfil de un joven.
                          </div>
                        </div>
                      )}

                      <Button
                        className="bg-white/10 text-white border border-white/10 hover:bg-white/15 w-full"
                        onClick={() => {
                          setFiltersOpen(false);
                          load();
                        }}
                        disabled={busy || !!dateError}
                      >
                        <RefreshCw size={16} className={busy ? "animate-spin mr-2" : "mr-2"} />
                        {busy ? "Actualizando…" : "Aplicar y actualizar"}
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </PageFade>
    </Container>
  );
}
