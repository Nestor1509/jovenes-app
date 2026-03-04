"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMyProfile } from "@/lib/useMyProfile";
import { supabase } from "@/lib/supabaseClient";
import { Container, Card, Title, Subtitle, PageFade, Button } from "@/components/ui";
import { Trophy, BookOpen, HeartHandshake, RefreshCw } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

type Period = "day" | "week" | "month" | "all";

type RankRow = {
  rank: number;
  user_id: string;
  name: string;
  score: number;
};

function fmtPrayerMinutes(total: number) {
  const t = Math.max(0, Math.floor(Number(total || 0)));
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
  const router = useRouter();
  const { loading: authLoading, session, profile, error } = useMyProfile();

  const [period, setPeriod] = useState<Period>("day");
  const [limit, setLimit] = useState<number>(10);

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [chapters, setChapters] = useState<RankRow[]>([]);
  const [prayer, setPrayer] = useState<RankRow[]>([]);

  const canView = !!session?.user?.id && !!profile?.group_id;

  const periods: Period[] = useMemo(() => ["day", "week", "month", "all"], []);

  async function load() {
    if (!session?.user?.id) return;
    setLoading(true);
    setMsg("");

    try {
      // TOP por capítulos
      const a = await supabase.rpc("group_ranking", {
        metric: "chapters",
        period,
        limit_count: limit,
      });

      // TOP por oración
      const b = await supabase.rpc("group_ranking", {
        metric: "prayer",
        period,
        limit_count: limit,
      });

      if (a.error) throw new Error(a.error.message);
      if (b.error) throw new Error(b.error.message);

      setChapters((a.data ?? []) as any);
      setPrayer((b.data ?? []) as any);
    } catch (e: any) {
      setChapters([]);
      setPrayer([]);
      setMsg(e?.message ? String(e.message) : "No se pudo cargar el ranking.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authLoading) return;
    if (!session) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, session?.user?.id, period, limit]);

  if (authLoading) {
    return (
      <Container>
        <PageFade>
          <Card>
            <Title>Ranking</Title>
            <Subtitle>Cargando sesión…</Subtitle>
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
            <Subtitle>Inicia sesión para ver el ranking.</Subtitle>
            <div className="mt-4">
              <Button onClick={() => router.push("/")}>Ir a inicio</Button>
            </div>
          </Card>
        </PageFade>
      </Container>
    );
  }

  if (!canView) {
    return (
      <Container>
        <PageFade>
          <Card>
            <Title>Ranking</Title>
            <Subtitle>Tu usuario no tiene grupo asignado todavía.</Subtitle>
            <div className="text-sm text-white/70 mt-3">
              Pídele a un líder/admin que te asigne un <b>group_id</b>.
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
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2">
                <Trophy size={18} className="opacity-80" />
                <Title>Ranking</Title>
              </div>
              <Subtitle>
                Top del grupo · {periodLabel(period)} · Motívate con tu equipo 💪
              </Subtitle>
              {error && <div className="text-amber-200 text-sm mt-2">{error}</div>}
              {msg && <div className="text-amber-200 text-sm mt-2">{msg}</div>}
            </div>

            <Card className="p-4 min-w-[280px]">
              <div className="text-sm font-semibold mb-2">Filtro</div>

              <div className="flex flex-wrap gap-2">
                {periods.map((p) => (
                  <Button
                    key={p}
                    className={[
                      "border",
                      period === p
                        ? "bg-white/15 text-white border-white/15"
                        : "bg-white/10 text-white border-white/10 hover:bg-white/15",
                    ].join(" ")}
                    onClick={() => setPeriod(p)}
                    disabled={loading}
                  >
                    {periodLabel(p)}
                  </Button>
                ))}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  className="bg-white/10 text-white border border-white/10 hover:bg-white/15"
                  onClick={() => setLimit(10)}
                  disabled={loading}
                >
                  Top 10
                </Button>
                <Button
                  className="bg-white/10 text-white border border-white/10 hover:bg-white/15"
                  onClick={() => setLimit(15)}
                  disabled={loading}
                >
                  Top 15
                </Button>

                <Button
                  className="bg-white/10 text-white border border-white/10 hover:bg-white/15"
                  onClick={load}
                  disabled={loading}
                  title="Actualizar"
                >
                  <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                </Button>
              </div>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 font-semibold">
                  <BookOpen size={18} className="opacity-80" />
                  Capítulos
                </div>
                <div className="text-xs text-white/50">Suma de capítulos</div>
              </div>

              <div className="mt-4">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`chap-${period}-${limit}-${loading ? "loading" : "ok"}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18 }}
                    className="grid gap-2"
                  >
                    {loading ? (
                      <div className="text-sm text-white/70">Cargando…</div>
                    ) : chapters.length === 0 ? (
                      <div className="text-sm text-white/70">Aún no hay datos para este período.</div>
                    ) : (
                      chapters.map((r) => (
                        <div
                          key={r.user_id}
                          className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-8 w-8 rounded-xl bg-white/5 border border-white/10 grid place-items-center text-sm font-semibold">
                              {r.rank}
                            </div>
                            <div className="truncate">
                              <div className="text-sm font-medium truncate">{r.name}</div>
                            </div>
                          </div>
                          <div className="text-sm font-semibold text-white">{Number(r.score ?? 0)}</div>
                        </div>
                      ))
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 font-semibold">
                  <HeartHandshake size={18} className="opacity-80" />
                  Oración
                </div>
                <div className="text-xs text-white/50">Suma de minutos</div>
              </div>

              <div className="mt-4">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`pray-${period}-${limit}-${loading ? "loading" : "ok"}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18 }}
                    className="grid gap-2"
                  >
                    {loading ? (
                      <div className="text-sm text-white/70">Cargando…</div>
                    ) : prayer.length === 0 ? (
                      <div className="text-sm text-white/70">Aún no hay datos para este período.</div>
                    ) : (
                      prayer.map((r) => (
                        <div
                          key={r.user_id}
                          className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-8 w-8 rounded-xl bg-white/5 border border-white/10 grid place-items-center text-sm font-semibold">
                              {r.rank}
                            </div>
                            <div className="truncate">
                              <div className="text-sm font-medium truncate">{r.name}</div>
                            </div>
                          </div>
                          <div className="text-sm font-semibold text-white">{fmtPrayerMinutes(Number(r.score ?? 0))}</div>
                        </div>
                      ))
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </Card>
          </div>
        </div>
      </PageFade>
    </Container>
  );
}
