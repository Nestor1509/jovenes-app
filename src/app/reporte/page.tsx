"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Container, Card, Title, Subtitle, Button, Input, PageFade } from "@/components/ui";
import { BookOpen, HeartHandshake, PencilLine, CheckCircle2 } from "lucide-react";

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function clampInt(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function toMinutes(hStr: string, mStr: string) {
  const h = hStr.trim() === "" ? 0 : clampInt(Number(hStr), 0, 24);
  const m = mStr.trim() === "" ? 0 : clampInt(Number(mStr), 0, 59);
  return h * 60 + m;
}

function fromMinutes(total: number) {
  const t = Number.isFinite(total) ? Math.max(0, Math.floor(total)) : 0;
  return { h: Math.floor(t / 60), m: t % 60 };
}

function traducirError(msg: string) {
  const m = (msg ?? "").toLowerCase();
  if (m.includes("jwt")) return "Tu sesión expiró. Vuelve a iniciar sesión.";
  if (m.includes("permission denied") || m.includes("not allowed")) return "No tienes permisos para realizar esta acción.";
  if (m.includes("duplicate key") || m.includes("unique")) return "Ya existe un reporte para esa fecha.";
  return "Ocurrió un error. Intenta de nuevo.";
}

type ExistingReport = {
  chapters_count: number;
  prayer_minutes: number;
};

type Mode = "loading" | "new" | "askEdit" | "editing" | "done" | "doneLocked";

function lockKey(dateISO: string) {
  return `report_lock_${dateISO}`;
}

function notifyLockChanged() {
  try {
    window.dispatchEvent(new Event("report_lock_changed"));
  } catch {}
}

export default function ReportePage() {
  const today = useMemo(() => todayISO(), []);
  const dateKey = today;

  const [mode, setMode] = useState<Mode>("loading");
  const [existing, setExisting] = useState<ExistingReport | null>(null);

  // ✅ Nuevo: capítulos (sin tiempo de lectura)
  const [chapters, setChapters] = useState<string>("0");

  // Oración (igual que antes)
  const [prayerH, setPrayerH] = useState<string>("0");
  const [prayerM, setPrayerM] = useState<string>("0");

  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      setMode("loading");
      setMsg("");

      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        window.location.href = "/";
        return;
      }

      const { data, error } = await supabase
        .from("reports")
        .select("chapters_count, prayer_minutes")
        .eq("user_id", sess.session.user.id)
        .eq("report_date", dateKey)
        .maybeSingle();

      if (!error && data) {
        setExisting({
          chapters_count: Number((data as any).chapters_count ?? 0),
          prayer_minutes: Number((data as any).prayer_minutes ?? 0),
        });

        const locked = (() => {
          try {
            return localStorage.getItem(lockKey(dateKey)) === "1";
          } catch {
            return false;
          }
        })();

        setMode(locked ? "doneLocked" : "askEdit");
        setChapters("0");
        setPrayerH("0");
        setPrayerM("0");
      } else {
        setExisting(null);
        setMode("new");
        try {
          localStorage.removeItem(lockKey(dateKey));
        } catch {}
        notifyLockChanged();
        setChapters("0");
        setPrayerH("0");
        setPrayerM("0");
      }
    })();
  }, [dateKey]);

  const onlyDigits = (v: string) => v.replace(/[^\d]/g, "");

  function loadExistingIntoForm() {
    setChapters(String(existing?.chapters_count ?? 0));
    const p = fromMinutes(existing?.prayer_minutes ?? 0);
    setPrayerH(String(p.h));
    setPrayerM(String(p.m));
  }

  async function save() {
    setMsg("");

    const { data: sess } = await supabase.auth.getSession();
    const user = sess.session?.user;
    if (!user) return;

    const chapters_count = clampInt(Number(chapters || 0), 0, 999);
    const prayer_minutes = toMinutes(prayerH, prayerM);

    // Compatibilidad: existe bible_minutes en la tabla antigua → lo dejamos en 0
    const { error } = await supabase.from("reports").upsert(
      {
        user_id: user.id,
        report_date: today,
        chapters_count,
        bible_minutes: 0,
        prayer_minutes,
      } as any,
      { onConflict: "user_id,report_date" }
    );

    if (error) {
      setMsg(traducirError(error.message));
      return;
    }

    setExisting({ chapters_count, prayer_minutes });
    try {
      localStorage.removeItem(lockKey(dateKey));
    } catch {}
    notifyLockChanged();
    setMode("done");
    setMsg("✅ Guardado correctamente");
  }

  const Summary = ({ allowEdit }: { allowEdit: boolean }) => {
    const p = fromMinutes(existing?.prayer_minutes ?? 0);

    return (
      <div className="grid gap-3">
        <div className="flex items-center gap-2 text-emerald-200/90">
          <CheckCircle2 size={18} />
          <div className="font-semibold">Ya reportaste hoy</div>
        </div>

        <div className="grid gap-2 text-sm text-white/70">
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3">
            <span className="flex items-center gap-2">
              <BookOpen size={16} className="opacity-80" /> Capítulos leídos
            </span>
            <span className="font-semibold text-white">{existing?.chapters_count ?? 0}</span>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3">
            <span className="flex items-center gap-2">
              <HeartHandshake size={16} className="opacity-80" /> Oración
            </span>
            <span className="font-semibold text-white">
              {p.h}h {p.m}m
            </span>
          </div>
        </div>

        {allowEdit ? (
          <>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button
                variant="ghost"
                onClick={() => {
                  try {
                    localStorage.removeItem(lockKey(dateKey));
                  } catch {}
                  notifyLockChanged();
                  loadExistingIntoForm();
                  setMode("editing");
                }}
              >
                <PencilLine size={16} className="mr-2" /> Editar reporte
              </Button>

              <Button
                variant="ghost"
                onClick={() => {
                  try {
                    localStorage.setItem(lockKey(dateKey), "1");
                  } catch {}
                  notifyLockChanged();
                  setMode("doneLocked");
                }}
              >
                No, hoy no
              </Button>
            </div>

            <div className="text-xs text-white/50">
              Si eliges “No, hoy no”, no volverá a preguntarte hoy (puedes volver mañana).
            </div>
          </>
        ) : (
          <div className="text-xs text-white/50">Tu reporte de hoy está bloqueado para edición.</div>
        )}
      </div>
    );
  };

  return (
    <PageFade>
      <Container>
        <div className="mb-6">
          <Title>Reporte diario</Title>
          <Subtitle>Reporta hoy tus capítulos leídos y tu tiempo de oración.</Subtitle>
        </div>

        <Card className="p-5">
          {mode === "loading" ? (
            <div className="text-white/60">Cargando...</div>
          ) : mode === "askEdit" ? (
            <Summary allowEdit={true} />
          ) : mode === "doneLocked" ? (
            <Summary allowEdit={false} />
          ) : (
            <div className="grid gap-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* Capítulos */}
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="mb-2 flex items-center gap-2 text-white/80">
                    <BookOpen size={18} className="opacity-80" />
                    <div className="font-semibold">Lectura bíblica</div>
                  </div>

                  <div className="grid gap-2">
                    <div className="text-sm text-white/60">Capítulos leídos</div>
                    <Input
                      value={chapters}
                      inputMode="numeric"
                      onChange={(e) => setChapters(onlyDigits(e.target.value))}
                      placeholder="0"
                    />
                    <div className="text-xs text-white/45">Nota: la lectura se registra por cantidad de capítulos.</div>
                  </div>
                </div>

                {/* Oración */}
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="mb-2 flex items-center gap-2 text-white/80">
                    <HeartHandshake size={18} className="opacity-80" />
                    <div className="font-semibold">Tiempo de oración</div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-sm text-white/60">Horas</div>
                      <Input
                        value={prayerH}
                        inputMode="numeric"
                        onChange={(e) => setPrayerH(onlyDigits(e.target.value))}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <div className="text-sm text-white/60">Minutos</div>
                      <Input
                        value={prayerM}
                        inputMode="numeric"
                        onChange={(e) => setPrayerM(onlyDigits(e.target.value))}
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={save}>Guardar</Button>
                <div className="text-sm text-white/60">{msg}</div>
              </div>

              {mode === "done" ? <Summary allowEdit={true} /> : null}
            </div>
          )}
        </Card>
      </Container>
    </PageFade>
  );
}
