"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Container, Card, Title, Subtitle, Button, PageFade, Badge, Skeleton } from "@/components/ui";
import {
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Trophy,
  ClipboardList,
  BarChart3,
  Flame,
  CalendarCheck2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

type Profile = {
  name: string | null;
  role: string | null;
  group_id: string | null;
};

type ReportRow = {
  report_date: string; // YYYY-MM-DD
  bible_minutes: number | null; // (en tu app = capítulos)
  prayer_minutes: number | null;
};

type RankRow = {
  user_id: string;
  total: number;
};

function traducirError(msg: string) {
  const m = (msg ?? "").toLowerCase();
  if (m.includes("invalid login")) return "Correo o contraseña incorrectos.";
  if (m.includes("email not confirmed")) return "Tu correo no está confirmado (revisa tu email).";
  if (m.includes("jwt")) return "Tu sesión expiró. Inicia sesión de nuevo.";
  if (m.includes("rate limit")) return "Demasiados intentos. Espera un momento y vuelve a intentar.";
  return "Ocurrió un error. Intenta de nuevo.";
}

/** Fecha local YYYY-MM-DD (evita bugs UTC) */
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

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function shortEmail(email?: string | null) {
  if (!email) return "";
  const [u, d] = email.split("@");
  return u.length > 16 ? `${u.slice(0, 8)}…@${d}` : email;
}

function MiniBadge({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <div className="max-w-full">
      <Badge title={title} className="max-w-full truncate">
        {children}
      </Badge>
    </div>
  );
}

/**
 * ✅ QuickAction FIX responsive:
 * - En móvil: se apila (texto arriba + acciones abajo)
 * - Evita overflow con max-w + truncate
 */
function QuickAction({
  href,
  title,
  subtitle,
  icon,
  rightNode,
  disabled,
}: {
  href: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  rightNode?: React.ReactNode;
  disabled?: boolean;
}) {
  const cls =
    "rounded-2xl border px-4 py-4 transition " +
    (disabled
      ? "border-white/10 bg-black/20 opacity-50 cursor-not-allowed"
      : "border-white/10 bg-black/20 hover:bg-white/5 hover:border-white/15 active:scale-[0.99]");

  const content = (
    <div className={cls} aria-disabled={disabled}>
      {/* Layout */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Left */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-2xl border border-white/10 bg-white/5 grid place-items-center shrink-0">
            {icon}
          </div>
          <div className="min-w-0">
            <div className="font-medium text-white/90 truncate">{title}</div>
            {subtitle ? <div className="text-[12px] text-white/55 truncate">{subtitle}</div> : null}
          </div>
        </div>

        {/* Right (en móvil abajo a la derecha) */}
        <div className="flex items-center justify-end gap-2 sm:justify-start">
          <div className="min-w-0 max-w-full">{rightNode}</div>
          <ArrowRight size={18} className="opacity-60 shrink-0" />
        </div>
      </div>
    </div>
  );

  if (disabled) return content;

  return (
    <Link href={href} prefetch className="block">
      {content}
    </Link>
  );
}

export default function Home() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const [loading, setLoading] = useState(true);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [reports, setReports] = useState<ReportRow[]>([]);

  const [rankPosWeek, setRankPosWeek] = useState<number | null>(null);

  const today = useMemo(() => hoyISO(), []);
  const weekStart = useMemo(() => inicioSemanaISO(today), [today]);

  const hasSession = useMemo(() => !!sessionEmail && !!userId, [sessionEmail, userId]);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      setLoading(true);
      setMsg("");

      const { data } = await supabase.auth.getSession();
      const sess = data.session;

      if (!mounted) return;

      setSessionEmail(sess?.user?.email ?? null);
      setUserId(sess?.user?.id ?? null);

      if (!sess?.user?.id) {
        setProfile(null);
        setReports([]);
        setRankPosWeek(null);
        setLoading(false);
        return;
      }

      const uid = sess.user.id;

      const { data: p, error: pErr } = await supabase
        .from("profiles")
        .select("name, role, group_id")
        .eq("id", uid)
        .single();

      if (!mounted) return;

      if (pErr) setProfile(null);
      else setProfile((p ?? null) as Profile);

      const { data: rRows, error: rErr } = await supabase
        .from("reports")
        .select("report_date, bible_minutes, prayer_minutes")
        .eq("user_id", uid)
        .order("report_date", { ascending: false })
        .limit(180);

      if (!mounted) return;

      if (rErr) setReports([]);
      else setReports((rRows ?? []) as ReportRow[]);

      setLoading(false);
    }

    bootstrap();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      bootstrap();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const setDates = useMemo(() => new Set(reports.map((r) => r.report_date)), [reports]);
  const hasTodayReport = useMemo(() => setDates.has(today), [setDates, today]);

  const streakDays = useMemo(() => {
    if (reports.length === 0) return 0;
    let cur = today;
    let streak = 0;
    while (setDates.has(cur)) {
      streak += 1;
      cur = addDaysISO(cur, -1);
      if (streak > 365) break;
    }
    return streak;
  }, [setDates, reports.length, today]);

  const weekRows = useMemo(() => {
    return reports.filter((r) => r.report_date >= weekStart && r.report_date <= today);
  }, [reports, weekStart, today]);

  const weekTotals = useMemo(() => {
    let bible = 0;
    let prayer = 0;
    let count = 0;
    for (const r of weekRows) {
      bible += Number(r.bible_minutes ?? 0);
      prayer += Number(r.prayer_minutes ?? 0);
      count += 1;
    }
    return { bible, prayer, count };
  }, [weekRows]);

  const prevWeekTotals = useMemo(() => {
    const prevStart = addDaysISO(weekStart, -7);
    const prevEnd = addDaysISO(weekStart, -1);
    const prevRows = reports.filter((r) => r.report_date >= prevStart && r.report_date <= prevEnd);
    let bible = 0;
    let prayer = 0;
    let count = 0;
    for (const r of prevRows) {
      bible += Number(r.bible_minutes ?? 0);
      prayer += Number(r.prayer_minutes ?? 0);
      count += 1;
    }
    return { bible, prayer, count };
  }, [reports, weekStart]);

  const weekDelta = useMemo(() => {
    return {
      bible: weekTotals.bible - prevWeekTotals.bible,
      prayer: weekTotals.prayer - prevWeekTotals.prayer,
      count: weekTotals.count - prevWeekTotals.count,
    };
  }, [weekTotals, prevWeekTotals]);

  const displayName = useMemo(() => {
    const n = profile?.name?.trim();
    if (n) return n;
    if (sessionEmail) return sessionEmail.split("@")[0];
    return "—";
  }, [profile?.name, sessionEmail]);

  const rolePretty = useMemo(() => {
    const r = profile?.role;
    if (r === "admin") return "Admin";
    if (r === "leader") return "Líder";
    return "Joven";
  }, [profile?.role]);

  useEffect(() => {
    let mounted = true;

    async function loadRankPos() {
      if (!userId) return;
      if (!profile?.group_id) return;

      try {
        const { data, error } = await supabase.rpc("get_group_ranking", {
          p_period: "week",
          p_metric: "chapters",
          p_group_id: profile.group_id,
          p_limit: 50,
          p_start_date: null,
          p_end_date: null,
        });

        if (!mounted) return;
        if (error) {
          setRankPosWeek(null);
          return;
        }

        const rows = (data ?? []) as RankRow[];
        const idx = rows.findIndex((r) => r.user_id === userId);
        setRankPosWeek(idx >= 0 ? idx + 1 : null);
      } catch {
        if (!mounted) return;
        setRankPosWeek(null);
      }
    }

    loadRankPos();
    return () => {
      mounted = false;
    };
  }, [userId, profile?.group_id]);

  async function signInGoogle() {
    setMsg("");
    try {
      setBusy(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin + "/auth/callback" },
      });
      if (error) setMsg(traducirError(error.message));
    } finally {
      setBusy(false);
    }
  }

  const primaryCTA = hasTodayReport ? (
    <Link href="/reporte" className="w-full">
      <Button className="w-full justify-center py-3 text-base bg-white/10 text-white border border-white/10 hover:bg-white/15">
        Editar reporte de hoy
        <ArrowRight size={18} />
      </Button>
    </Link>
  ) : (
    <Link href="/reporte" className="w-full">
      <Button type="button" className="w-full justify-center py-3 text-base" variant="primary">
        Registrar reporte de hoy
        <ArrowRight size={18} />
      </Button>
    </Link>
  );

  return (
    <Container>
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <div className="h-14 w-14 rounded-3xl bg-white/5 border border-white/10 grid place-items-center text-lg font-semibold shrink-0">
          MA
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight truncate">Ministerio Águilas</h1>
          <p className="text-sm text-white/70 truncate">Casa de Dios Cruzada Cristiana</p>
        </div>
      </div>

      <PageFade>
        {loading ? (
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <Skeleton className="h-7 w-40" />
              <Skeleton className="mt-2 h-4 w-72" />
              <div className="mt-5 grid gap-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            </Card>
            <Card>
              <Skeleton className="h-7 w-48" />
              <Skeleton className="mt-2 h-4 w-72" />
              <Skeleton className="mt-5 h-24 w-full" />
              <Skeleton className="mt-3 h-12 w-full" />
            </Card>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 items-start">
            {/* LEFT */}
            <Card className="relative overflow-hidden">
              <div className="absolute -top-24 -right-24 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
              <div className="absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-white/10 blur-2xl" />

              <div className="flex items-center gap-2">
                <Sparkles size={18} className="opacity-80" />
                <Title className="truncate">{hasSession ? `Hola, ${displayName}` : "Bienvenido"}</Title>
              </div>

              <Subtitle className="break-words">
                {hasSession
                  ? `Tu panel rápido — ${rolePretty}${profile?.group_id ? " · Grupo activo" : ""}`
                  : "Lleva un registro sencillo de tu lectura bíblica y tu tiempo de oración."}
              </Subtitle>

              {hasSession ? (
                <div className="mt-5 grid gap-3">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    {/* ✅ En móvil apilado SIEMPRE */}
                    <div className="flex flex-col gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CalendarCheck2 size={16} className="opacity-80" />
                          <div className="text-sm font-semibold">Acción de hoy</div>

                          {hasTodayReport ? (
                            <MiniBadge title="Ya registraste tu reporte de hoy">
                              <span className="inline-flex items-center gap-1.5">
                                <CheckCircle2 size={12} className="opacity-80" /> Hecho
                              </span>
                            </MiniBadge>
                          ) : (
                            <MiniBadge title="Te falta registrar el reporte de hoy">
                              <span className="inline-flex items-center gap-1.5">
                                <AlertCircle size={12} className="opacity-80" /> Pendiente
                              </span>
                            </MiniBadge>
                          )}
                        </div>

                        <div className="mt-2 text-sm text-white/70">
                          {hasTodayReport
                            ? "¡Bien! Ya registraste tu reporte hoy. Si necesitas, puedes editarlo."
                            : "Aún no has registrado tu reporte de hoy. Toma 30 segundos y suma a tu racha 🔥"}
                        </div>

                        {/* badges: scroll horizontal suave en móvil si hay muchos */}
                        <div className="mt-3 -mx-1 px-1 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                          <MiniBadge>
                            <span className="inline-flex items-center gap-1.5">
                              <Flame size={12} className="opacity-80" />
                              <span className="text-white/80">Racha:</span>
                              <span className="font-semibold text-white">{streakDays}</span>
                              <span className="text-white/60">día(s)</span>
                            </span>
                          </MiniBadge>

                          <MiniBadge>
                            <span className="inline-flex items-center gap-1.5">
                              <span className="text-white/80">Semana:</span>
                              <span className="font-semibold text-white">
                                {formatearCapitulos(weekTotals.bible)} cap · {formatearMinutos(weekTotals.prayer)}
                              </span>
                            </span>
                          </MiniBadge>

                          {typeof rankPosWeek === "number" ? (
                            <MiniBadge>
                              <span className="inline-flex items-center gap-1.5">
                                <Trophy size={12} className="opacity-80" />
                                <span className="text-white/80">Puesto:</span>
                                <span className="font-semibold text-white">#{rankPosWeek}</span>
                              </span>
                            </MiniBadge>
                          ) : null}
                        </div>
                      </div>

                      {/* CTA full en móvil */}
                      <div className="w-full">{primaryCTA}</div>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    <QuickAction
                      href="/reporte"
                      title="Reporte diario"
                      subtitle={hasTodayReport ? "Reporte de hoy registrado" : "Te falta el reporte de hoy"}
                      icon={<ClipboardList size={18} className="opacity-85" />}
                      rightNode={
                        <MiniBadge title={today}>
                          <span className="inline-flex items-center gap-1.5">
                            {hasTodayReport ? "✅" : "⏳"} <span className="truncate">{today}</span>
                          </span>
                        </MiniBadge>
                      }
                    />

                    <QuickAction
                      href="/mis-estadisticas"
                      title="Mis estadísticas"
                      subtitle={`Semana desde ${weekStart}`}
                      icon={<BarChart3 size={18} className="opacity-85" />}
                      rightNode={
                        <MiniBadge title="Reportes de la semana">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="text-white/75">Reportes:</span>
                            <span className="font-semibold text-white">{weekTotals.count}</span>
                          </span>
                        </MiniBadge>
                      }
                    />

                    <QuickAction
                      href="/ranking"
                      title="Ranking del grupo"
                      subtitle="Mira tu puesto y el top del grupo"
                      icon={<Trophy size={18} className="opacity-85" />}
                      rightNode={
                        typeof rankPosWeek === "number" ? (
                          <MiniBadge title="Tu puesto semanal">
                            <span className="inline-flex items-center gap-1.5">
                              <span className="text-white/75">Tu puesto:</span>
                              <span className="font-semibold text-white">#{rankPosWeek}</span>
                            </span>
                          </MiniBadge>
                        ) : (
                          <MiniBadge title="Ranking semanal">
                            <span className="text-white/70">Semana</span>
                          </MiniBadge>
                        )
                      }
                    />
                  </div>

                  <div className="mt-1 text-[12px] text-white/45">
                    Tip: registra aunque sea poco. La constancia es lo que más suma.
                  </div>
                </div>
              ) : (
                <div className="mt-5 grid gap-3 text-sm text-white/80">
                  <QuickAction
                    href="/reporte"
                    title="Reporte diario"
                    subtitle="Registra tu lectura y oración cada día"
                    icon={<ClipboardList size={18} className="opacity-85" />}
                    disabled
                  />
                  <QuickAction
                    href="/mis-estadisticas"
                    title="Estadísticas personales"
                    subtitle="Mira tu progreso y tendencia"
                    icon={<BarChart3 size={18} className="opacity-85" />}
                    disabled
                  />
                  <QuickAction
                    href="/ranking"
                    title="Ranking del grupo"
                    subtitle="Comparte el avance con tu grupo"
                    icon={<Trophy size={18} className="opacity-85" />}
                    disabled
                  />
                </div>
              )}
            </Card>

            {/* RIGHT */}
            <Card>
              <Title>{hasSession ? "Resumen rápido" : "Iniciar sesión"}</Title>
              <Subtitle>{hasSession ? "Lo esencial para hoy y tu progreso de la semana." : "Solo se permite iniciar sesión con Google."}</Subtitle>

              {!hasSession ? (
                <div className="mt-5 grid gap-4">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/75">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={16} className="opacity-80" />
                      <span className="font-medium text-white">Acceso seguro</span>
                    </div>
                    <div className="mt-1 text-xs text-white/60">
                      Tu cuenta queda registrada automáticamente como <b>Joven</b>.
                    </div>
                  </div>

                  <Button type="button" onClick={signInGoogle} disabled={busy} className="w-full justify-center py-3 text-base">
                    {busy ? "Conectando…" : "Entrar con Google"}
                    <ArrowRight size={18} />
                  </Button>

                  {msg && <p className={msg.startsWith("✅") ? "text-sm text-green-300" : "text-sm text-red-300"}>{msg}</p>}
                </div>
              ) : (
                <div className="mt-5 grid gap-3">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="text-xs text-white/60">Sesión</div>
                    <div className="mt-1 text-sm text-white/85 font-medium truncate">{shortEmail(sessionEmail)}</div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="text-xs text-white/60">Semana (vs anterior)</div>

                    {/* ✅ En móvil: badges con scroll horizontal (no se montan) */}
                    <div className="mt-2 -mx-1 px-1 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      <MiniBadge title="Capítulos">
                        <span className="inline-flex items-center gap-2">
                          <span className="text-white/70">Cap:</span>
                          <span className="font-semibold text-white">{formatearCapitulos(weekTotals.bible)}</span>
                          <span className={weekDelta.bible >= 0 ? "text-emerald-300" : "text-rose-300"}>
                            {weekDelta.bible >= 0 ? `+${weekDelta.bible}` : `${weekDelta.bible}`}
                          </span>
                        </span>
                      </MiniBadge>

                      <MiniBadge title="Oración">
                        <span className="inline-flex items-center gap-2">
                          <span className="text-white/70">Oración:</span>
                          <span className="font-semibold text-white">{formatearMinutos(weekTotals.prayer)}</span>
                          <span className={weekDelta.prayer >= 0 ? "text-emerald-300" : "text-rose-300"}>
                            {weekDelta.prayer >= 0 ? `+${weekDelta.prayer}m` : `${weekDelta.prayer}m`}
                          </span>
                        </span>
                      </MiniBadge>

                      <MiniBadge title="Reportes">
                        <span className="inline-flex items-center gap-2">
                          <span className="text-white/70">Reportes:</span>
                          <span className="font-semibold text-white">{weekTotals.count}</span>
                          <span className={weekDelta.count >= 0 ? "text-emerald-300" : "text-rose-300"}>
                            {weekDelta.count >= 0 ? `+${weekDelta.count}` : `${weekDelta.count}`}
                          </span>
                        </span>
                      </MiniBadge>
                    </div>

                    <div className="mt-3 text-[12px] text-white/55">
                      Tu racha actual es <span className="text-white/85 font-semibold">{streakDays}</span> día(s).
                    </div>

                    <div className="mt-3">
                      {(() => {
                        const daysActive = new Set(weekRows.map((r) => r.report_date)).size;
                        const pct = clamp((daysActive / 7) * 100, 0, 100);
                        return (
                          <>
                            <div className="flex items-center justify-between text-[12px] text-white/55">
                              <span>Días activos</span>
                              <span className="text-white/75">{daysActive}/7</span>
                            </div>
                            <div className="mt-2 h-2 w-full rounded-full bg-white/5 border border-white/10 overflow-hidden">
                              <div className="h-full rounded-full bg-white/30" style={{ width: `${pct}%` }} />
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <Link href="/mis-estadisticas" className="block">
                      <Button className="w-full bg-white/10 text-white border border-white/10 hover:bg-white/15">
                        Ver estadísticas
                      </Button>
                    </Link>
                    <Link href="/ranking" className="block">
                      <Button className="w-full bg-white/10 text-white border border-white/10 hover:bg-white/15">
                        Ver ranking
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}
      </PageFade>
    </Container>
  );
}
