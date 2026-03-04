"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useMyProfile } from "@/lib/useMyProfile";
import { Container, Card, Title, Subtitle, Button, PageFade, Input, Badge } from "@/components/ui";
import { Trophy, BookOpen, HeartHandshake, CalendarDays, Users } from "lucide-react";
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

export default function RankingPage() {
  const { loading: authLoading, session, profile } = useMyProfile();

  const [metric, setMetric] = useState<Metric>("chapters");
  const [period, setPeriod] = useState<Period>("day");
  const [limit, setLimit] = useState<number>(10);

  // Admin: permite ver cualquier grupo o global
  const isAdmin = profile?.role === "admin";
  const [adminGroup, setAdminGroup] = useState<string>(""); // uuid o vacío => global
  const effectiveGroupId = useMemo(() => {
    if (!isAdmin) return null; // server fuerza el grupo del usuario
    const t = adminGroup.trim();
    return t === "" ? null : t;
  }, [isAdmin, adminGroup]);

  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function load() {
    setMsg("");
    if (!session) return;

    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("get_group_ranking", {
        p_period: period,
        p_metric: metric,
        p_group_id: effectiveGroupId,
        p_limit: limit,
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
  }, [authLoading, session?.user?.id, metric, period, limit, effectiveGroupId]);

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

  const MetricIcon = metric === "chapters" ? BookOpen : HeartHandshake;

  return (
    <Container>
      <PageFade>
        <div className="grid gap-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2">
                <Trophy size={18} className="opacity-80" />
                <Title>Ranking</Title>
              </div>
              <Subtitle>
                {isAdmin ? "Vista de ranking (Admin)." : "Top de tu grupo para motivarnos 💪"}
              </Subtitle>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge className="gap-2">
                  <Users size={14} className="opacity-80" />
                  <span className="truncate">
                    {isAdmin ? "Admin: puedes ver cualquier grupo" : `Grupo: ${profile?.group_id ?? "—"}`}
                  </span>
                </Badge>

                <Badge className="gap-2">
                  <CalendarDays size={14} className="opacity-80" />
                  <span>{periodLabel(period)}</span>
                </Badge>
              </div>
            </div>

            <Card className="p-4 min-w-[320px]">
              <div className="grid gap-3">
                {/* Metric toggle */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    className={
                      metric === "chapters"
                        ? "bg-white/10 text-white border border-white/15 hover:bg-white/15"
                        : "bg-white/5 text-white border border-white/10 hover:bg-white/10"
                    }
                    onClick={() => setMetric("chapters")}
                  >
                    <BookOpen size={16} className="mr-2" />
                    Capítulos
                  </Button>
                  <Button
                    className={
                      metric === "prayer"
                        ? "bg-white/10 text-white border border-white/15 hover:bg-white/15"
                        : "bg-white/5 text-white border border-white/10 hover:bg-white/10"
                    }
                    onClick={() => setMetric("prayer")}
                  >
                    <HeartHandshake size={16} className="mr-2" />
                    Oración
                  </Button>
                </div>

                {/* Period toggle */}
                <div className="grid grid-cols-4 gap-2">
                  {(["day", "week", "month", "all"] as Period[]).map((p) => (
                    <Button
                      key={p}
                      className={
                        period === p
                          ? "bg-white/10 text-white border border-white/15 hover:bg-white/15"
                          : "bg-white/5 text-white border border-white/10 hover:bg-white/10"
                      }
                      onClick={() => setPeriod(p)}
                    >
                      {periodLabel(p)}
                    </Button>
                  ))}
                </div>

                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <div className="text-xs text-white/60 mb-1">Top</div>
                    <div className="flex gap-2">
                      <Button
                        className={
                          limit === 10
                            ? "bg-white/10 text-white border border-white/15 hover:bg-white/15"
                            : "bg-white/5 text-white border border-white/10 hover:bg-white/10"
                        }
                        onClick={() => setLimit(10)}
                      >
                        10
                      </Button>
                      <Button
                        className={
                          limit === 15
                            ? "bg-white/10 text-white border border-white/15 hover:bg-white/15"
                            : "bg-white/5 text-white border border-white/10 hover:bg-white/10"
                        }
                        onClick={() => setLimit(15)}
                      >
                        15
                      </Button>
                    </div>
                  </div>

                  <Button
                    className="bg-white/10 text-white border border-white/10 hover:bg-white/15"
                    onClick={load}
                    disabled={busy}
                    title="Actualizar"
                  >
                    {busy ? "Actualizando…" : "Actualizar"}
                  </Button>
                </div>

                {isAdmin && (
                  <div className="pt-2 border-t border-white/10">
                    <div className="text-xs text-white/60 mb-1">
                      Admin: Group ID (vacío = Global / todos)
                    </div>
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

                {msg && <div className="text-sm text-amber-200">{msg}</div>}
              </div>
            </Card>
          </div>

          <Card>
            <div className="flex items-center gap-2 mb-3">
              <MetricIcon size={18} className="opacity-80" />
              <div className="text-sm font-semibold">
                Top {limit} — {metric === "chapters" ? "Capítulos" : "Tiempo de oración"}
              </div>
            </div>

            {busy && rows.length === 0 ? (
              <div className="text-sm text-white/70">Cargando ranking…</div>
            ) : rows.length === 0 ? (
              <div className="text-sm text-white/70">Aún no hay datos para este periodo.</div>
            ) : (
              <div className="grid gap-2">
                <AnimatePresence initial={false}>
                  {rows.map((r, idx) => {
                    const pos = idx + 1;
                    const isMe = session?.user?.id === r.user_id;
                    const value =
                      metric === "chapters" ? String(Number(r.total ?? 0)) : fmtPrayerMinutes(Number(r.total ?? 0));

                    return (
                      <motion.div
                        key={r.user_id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.16 }}
                        className={[
                          "flex items-center justify-between gap-3 rounded-2xl border px-4 py-3",
                          isMe
                            ? "border-emerald-400/25 bg-emerald-500/10"
                            : "border-white/10 bg-black/20",
                        ].join(" ")}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={[
                              "h-9 w-9 rounded-2xl grid place-items-center text-sm font-semibold border",
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
                            {pos}
                          </div>

                          <div className="min-w-0">
                            <div className="font-medium truncate">{r.name || "—"}</div>
                            <div className="text-xs text-white/55 truncate">
                              {isMe ? "Tú" : " "}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-base font-semibold">{value}</div>
                          <div className="text-[11px] text-white/50">
                            {metric === "chapters" ? "capítulos" : "total"}
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
      </PageFade>
    </Container>
  );
}

// "use client";

// import { useEffect, useMemo, useState } from "react";
// import { useRouter } from "next/navigation";
// import { useMyProfile } from "@/lib/useMyProfile";
// import { supabase } from "@/lib/supabaseClient";
// import { Container, Card, Title, Subtitle, PageFade, Button } from "@/components/ui";
// import { Trophy, BookOpen, HeartHandshake, RefreshCw } from "lucide-react";
// import { AnimatePresence, motion } from "framer-motion";

// type Period = "day" | "week" | "month" | "all";

// type RankRow = {
//   rank: number;
//   user_id: string;
//   name: string;
//   score: number;
// };

// function fmtPrayerMinutes(total: number) {
//   const t = Math.max(0, Math.floor(Number(total || 0)));
//   const h = Math.floor(t / 60);
//   const m = t % 60;
//   if (h <= 0) return `${m} min`;
//   if (m === 0) return `${h} h`;
//   return `${h} h ${m} min`;
// }

// function periodLabel(p: Period) {
//   if (p === "day") return "Diario";
//   if (p === "week") return "Semana";
//   if (p === "month") return "Mes";
//   return "Global";
// }

// export default function RankingPage() {
//   const router = useRouter();
//   const { loading: authLoading, session, profile, error } = useMyProfile();

//   const [period, setPeriod] = useState<Period>("day");
//   const [limit, setLimit] = useState<number>(10);

//   const [loading, setLoading] = useState(true);
//   const [msg, setMsg] = useState("");
//   const [chapters, setChapters] = useState<RankRow[]>([]);
//   const [prayer, setPrayer] = useState<RankRow[]>([]);

//   const canView = !!session?.user?.id && !!profile?.group_id;

//   const periods: Period[] = useMemo(() => ["day", "week", "month", "all"], []);

//   async function load() {
//     if (!session?.user?.id) return;
//     setLoading(true);
//     setMsg("");

//     try {
//       // TOP por capítulos
//       const a = await supabase.rpc("group_ranking", {
//         metric: "chapters",
//         period,
//         limit_count: limit,
//       });

//       // TOP por oración
//       const b = await supabase.rpc("group_ranking", {
//         metric: "prayer",
//         period,
//         limit_count: limit,
//       });

//       if (a.error) throw new Error(a.error.message);
//       if (b.error) throw new Error(b.error.message);

//       setChapters((a.data ?? []) as any);
//       setPrayer((b.data ?? []) as any);
//     } catch (e: any) {
//       setChapters([]);
//       setPrayer([]);
//       setMsg(e?.message ? String(e.message) : "No se pudo cargar el ranking.");
//     } finally {
//       setLoading(false);
//     }
//   }

//   useEffect(() => {
//     if (authLoading) return;
//     if (!session) return;
//     load();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [authLoading, session?.user?.id, period, limit]);

//   if (authLoading) {
//     return (
//       <Container>
//         <PageFade>
//           <Card>
//             <Title>Ranking</Title>
//             <Subtitle>Cargando sesión…</Subtitle>
//           </Card>
//         </PageFade>
//       </Container>
//     );
//   }

//   if (!session) {
//     return (
//       <Container>
//         <PageFade>
//           <Card>
//             <Title>Ranking</Title>
//             <Subtitle>Inicia sesión para ver el ranking.</Subtitle>
//             <div className="mt-4">
//               <Button onClick={() => router.push("/")}>Ir a inicio</Button>
//             </div>
//           </Card>
//         </PageFade>
//       </Container>
//     );
//   }

//   if (!canView) {
//     return (
//       <Container>
//         <PageFade>
//           <Card>
//             <Title>Ranking</Title>
//             <Subtitle>Tu usuario no tiene grupo asignado todavía.</Subtitle>
//             <div className="text-sm text-white/70 mt-3">
//               Pídele a un líder/admin que te asigne un <b>group_id</b>.
//             </div>
//           </Card>
//         </PageFade>
//       </Container>
//     );
//   }

//   return (
//     <Container>
//       <PageFade>
//         <div className="grid gap-6">
//           <div className="flex items-start justify-between gap-4 flex-wrap">
//             <div>
//               <div className="flex items-center gap-2">
//                 <Trophy size={18} className="opacity-80" />
//                 <Title>Ranking</Title>
//               </div>
//               <Subtitle>
//                 Top del grupo · {periodLabel(period)} · Motívate con tu equipo 💪
//               </Subtitle>
//               {error && <div className="text-amber-200 text-sm mt-2">{error}</div>}
//               {msg && <div className="text-amber-200 text-sm mt-2">{msg}</div>}
//             </div>

//             <Card className="p-4 min-w-[280px]">
//               <div className="text-sm font-semibold mb-2">Filtro</div>

//               <div className="flex flex-wrap gap-2">
//                 {periods.map((p) => (
//                   <Button
//                     key={p}
//                     className={[
//                       "border",
//                       period === p
//                         ? "bg-white/15 text-white border-white/15"
//                         : "bg-white/10 text-white border-white/10 hover:bg-white/15",
//                     ].join(" ")}
//                     onClick={() => setPeriod(p)}
//                     disabled={loading}
//                   >
//                     {periodLabel(p)}
//                   </Button>
//                 ))}
//               </div>

//               <div className="mt-3 flex flex-wrap items-center gap-2">
//                 <Button
//                   className="bg-white/10 text-white border border-white/10 hover:bg-white/15"
//                   onClick={() => setLimit(10)}
//                   disabled={loading}
//                 >
//                   Top 10
//                 </Button>
//                 <Button
//                   className="bg-white/10 text-white border border-white/10 hover:bg-white/15"
//                   onClick={() => setLimit(15)}
//                   disabled={loading}
//                 >
//                   Top 15
//                 </Button>

//                 <Button
//                   className="bg-white/10 text-white border border-white/10 hover:bg-white/15"
//                   onClick={load}
//                   disabled={loading}
//                   title="Actualizar"
//                 >
//                   <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
//                 </Button>
//               </div>
//             </Card>
//           </div>

//           <div className="grid gap-4 md:grid-cols-2">
//             <Card>
//               <div className="flex items-center justify-between gap-3">
//                 <div className="flex items-center gap-2 font-semibold">
//                   <BookOpen size={18} className="opacity-80" />
//                   Capítulos
//                 </div>
//                 <div className="text-xs text-white/50">Suma de capítulos</div>
//               </div>

//               <div className="mt-4">
//                 <AnimatePresence mode="wait">
//                   <motion.div
//                     key={`chap-${period}-${limit}-${loading ? "loading" : "ok"}`}
//                     initial={{ opacity: 0, y: 6 }}
//                     animate={{ opacity: 1, y: 0 }}
//                     exit={{ opacity: 0, y: -6 }}
//                     transition={{ duration: 0.18 }}
//                     className="grid gap-2"
//                   >
//                     {loading ? (
//                       <div className="text-sm text-white/70">Cargando…</div>
//                     ) : chapters.length === 0 ? (
//                       <div className="text-sm text-white/70">Aún no hay datos para este período.</div>
//                     ) : (
//                       chapters.map((r) => (
//                         <div
//                           key={r.user_id}
//                           className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
//                         >
//                           <div className="flex items-center gap-3 min-w-0">
//                             <div className="h-8 w-8 rounded-xl bg-white/5 border border-white/10 grid place-items-center text-sm font-semibold">
//                               {r.rank}
//                             </div>
//                             <div className="truncate">
//                               <div className="text-sm font-medium truncate">{r.name}</div>
//                             </div>
//                           </div>
//                           <div className="text-sm font-semibold text-white">{Number(r.score ?? 0)}</div>
//                         </div>
//                       ))
//                     )}
//                   </motion.div>
//                 </AnimatePresence>
//               </div>
//             </Card>

//             <Card>
//               <div className="flex items-center justify-between gap-3">
//                 <div className="flex items-center gap-2 font-semibold">
//                   <HeartHandshake size={18} className="opacity-80" />
//                   Oración
//                 </div>
//                 <div className="text-xs text-white/50">Suma de minutos</div>
//               </div>

//               <div className="mt-4">
//                 <AnimatePresence mode="wait">
//                   <motion.div
//                     key={`pray-${period}-${limit}-${loading ? "loading" : "ok"}`}
//                     initial={{ opacity: 0, y: 6 }}
//                     animate={{ opacity: 1, y: 0 }}
//                     exit={{ opacity: 0, y: -6 }}
//                     transition={{ duration: 0.18 }}
//                     className="grid gap-2"
//                   >
//                     {loading ? (
//                       <div className="text-sm text-white/70">Cargando…</div>
//                     ) : prayer.length === 0 ? (
//                       <div className="text-sm text-white/70">Aún no hay datos para este período.</div>
//                     ) : (
//                       prayer.map((r) => (
//                         <div
//                           key={r.user_id}
//                           className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
//                         >
//                           <div className="flex items-center gap-3 min-w-0">
//                             <div className="h-8 w-8 rounded-xl bg-white/5 border border-white/10 grid place-items-center text-sm font-semibold">
//                               {r.rank}
//                             </div>
//                             <div className="truncate">
//                               <div className="text-sm font-medium truncate">{r.name}</div>
//                             </div>
//                           </div>
//                           <div className="text-sm font-semibold text-white">{fmtPrayerMinutes(Number(r.score ?? 0))}</div>
//                         </div>
//                       ))
//                     )}
//                   </motion.div>
//                 </AnimatePresence>
//               </div>
//             </Card>
//           </div>
//         </div>
//       </PageFade>
//     </Container>
//   );
// }
