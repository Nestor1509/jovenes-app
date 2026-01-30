"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Container, Card, Title, Subtitle, Button, Input, PageFade } from "@/components/ui";
import { Clock3, BookOpen, HeartHandshake, PencilLine, CheckCircle2 } from "lucide-react";

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
  if (m.includes("permission denied") || m.includes("not allowed"))
    return "No tienes permisos para realizar esta acción.";
  if (m.includes("duplicate key") || m.includes("unique"))
    return "Ya existe un reporte para esa fecha.";
  if (m.includes("stack depth"))
    return "Error de seguridad/roles. Recarga la página (si continúa, avísame).";
  return "Ocurrió un error. Intenta de nuevo.";
}

type ExistingReport = {
  bible_minutes: number;
  prayer_minutes: number;
};

type Mode = "loading" | "new" | "askEdit" | "editing" | "done";

export default function ReportePage() {
  const today = useMemo(() => todayISO(), []);
  const dateKey = today;

  const [mode, setMode] = useState<Mode>("loading");
  const [existing, setExisting] = useState<ExistingReport | null>(null);

  // UX: por defecto mostramos 0 (limpio)
  const [bibleH, setBibleH] = useState<string>("0");
  const [bibleM, setBibleM] = useState<string>("0");
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
        .select("bible_minutes, prayer_minutes")
        .eq("user_id", sess.session.user.id)
        .eq("report_date", dateKey)
        .maybeSingle();

      if (!error && data) {
        setExisting({
          bible_minutes: data.bible_minutes ?? 0,
          prayer_minutes: data.prayer_minutes ?? 0,
        });
        // Preguntamos si quiere editar; mientras tanto no mostramos el formulario.
        setMode("askEdit");
        // form limpio por si decide crear/editar luego
        setBibleH("0");
        setBibleM("0");
        setPrayerH("0");
        setPrayerM("0");
      } else {
        // No hay reporte hoy: formulario limpio (0)
        setExisting(null);
        setMode("new");
        setBibleH("0");
        setBibleM("0");
        setPrayerH("0");
        setPrayerM("0");
      }
    })();
  }, [dateKey]);

  const onlyDigits = (v: string) => v.replace(/[^\d]/g, "");

  function loadExistingIntoForm() {
    const b = fromMinutes(existing?.bible_minutes ?? 0);
    const p = fromMinutes(existing?.prayer_minutes ?? 0);
    setBibleH(String(b.h));
    setBibleM(String(b.m));
    setPrayerH(String(p.h));
    setPrayerM(String(p.m));
  }

  async function save() {
    setMsg("");

    const { data: sess } = await supabase.auth.getSession();
    const user = sess.session?.user;
    if (!user) return;

    const bible_minutes = toMinutes(bibleH, bibleM);
    const prayer_minutes = toMinutes(prayerH, prayerM);

    const { error } = await supabase.from("reports").upsert(
      {
        user_id: user.id,
        report_date: today,
        bible_minutes,
        prayer_minutes,
      },
      { onConflict: "user_id,report_date" }
    );

    if (error) {
      setMsg(traducirError(error.message));
      return;
    }

    setExisting({ bible_minutes, prayer_minutes });
    setMode("done");
    setMsg("✅ Guardado correctamente");
  }

  const Summary = () => {
    const b = fromMinutes(existing?.bible_minutes ?? 0);
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
              <BookOpen size={16} className="opacity-80" /> Lectura bíblica
            </span>
            <span className="font-semibold text-white">
              {b.h}h {b.m}m
            </span>
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

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Button
            variant="ghost"
            onClick={() => {
              loadExistingIntoForm();
              setMode("editing");
              setMsg("");
            }}
          >
            <PencilLine size={16} />
            Editar reporte
          </Button>
        </div>

        <div className="text-xs text-white/50">
          Si quieres, puedes editarlo durante el día. (Siempre se guarda <b>solo</b> para la fecha de hoy.)
        </div>
      </div>
    );
  };

  return (
    <Container>
      <PageFade>
        <div className="grid gap-6">
          <div>
            <Title>Mi reporte</Title>
            <Subtitle>Registra tu lectura bíblica y tu tiempo de oración (en horas y minutos).</Subtitle>
          </div>

          <Card>
            {mode === "loading" ? (
              <div className="text-sm text-white/70">Cargando…</div>
            ) : mode === "askEdit" ? (
              <div className="grid gap-4">
                <div className="text-sm text-white/80">
                  Ya existe un reporte para hoy. ¿Quieres <b>editarlo</b>?
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    onClick={() => {
                      loadExistingIntoForm();
                      setMode("editing");
                    }}
                  >
                    <PencilLine size={16} />
                    Sí, editar
                  </Button>

                  <Button
                    variant="ghost"
                    onClick={() => {
                      // No mostramos el formulario si ya reportó (pero puede editar luego desde el resumen).
                      setMode("done");
                      setMsg("");
                    }}
                  >
                    No, gracias
                  </Button>
                </div>

                <div className="text-xs text-white/50">
                  Nota: si eliges “No, gracias”, no verás el formulario. Podrás entrar a editar desde el resumen.
                </div>
              </div>
            ) : mode === "done" ? (
              <Summary />
            ) : (
              // new | editing
              <div className="grid gap-5">
                <div className="flex items-center gap-2 text-sm text-white/70">
                  <Clock3 size={16} />
                  <span>Fecha</span>
                </div>

                <Input type="date" value={today} disabled className="max-w-xs opacity-70 cursor-not-allowed" />

                <div className="text-xs text-white/50">
                  Solo puedes reportar el día de hoy. (La base de datos también lo valida.)
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-center gap-2 font-medium">
                      <BookOpen size={18} className="opacity-80" />
                      Lectura bíblica
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs text-white/60 mb-1">Horas</div>
                        <Input
                          inputMode="numeric"
                          placeholder="0"
                          value={bibleH}
                          onChange={(e) => setBibleH(onlyDigits(e.target.value))}
                          onBlur={() => {
                            if (bibleH.trim() === "") return setBibleH("0");
                            const n = clampInt(Number(bibleH), 0, 24);
                            setBibleH(String(n));
                          }}
                        />
                      </div>
                      <div>
                        <div className="text-xs text-white/60 mb-1">Minutos</div>
                        <Input
                          inputMode="numeric"
                          placeholder="0"
                          value={bibleM}
                          onChange={(e) => setBibleM(onlyDigits(e.target.value))}
                          onBlur={() => {
                            if (bibleM.trim() === "") return setBibleM("0");
                            const n = clampInt(Number(bibleM), 0, 59);
                            setBibleM(String(n));
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-center gap-2 font-medium">
                      <HeartHandshake size={18} className="opacity-80" />
                      Tiempo de oración
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs text-white/60 mb-1">Horas</div>
                        <Input
                          inputMode="numeric"
                          placeholder="0"
                          value={prayerH}
                          onChange={(e) => setPrayerH(onlyDigits(e.target.value))}
                          onBlur={() => {
                            if (prayerH.trim() === "") return setPrayerH("0");
                            const n = clampInt(Number(prayerH), 0, 24);
                            setPrayerH(String(n));
                          }}
                        />
                      </div>
                      <div>
                        <div className="text-xs text-white/60 mb-1">Minutos</div>
                        <Input
                          inputMode="numeric"
                          placeholder="0"
                          value={prayerM}
                          onChange={(e) => setPrayerM(onlyDigits(e.target.value))}
                          onBlur={() => {
                            if (prayerM.trim() === "") return setPrayerM("0");
                            const n = clampInt(Number(prayerM), 0, 59);
                            setPrayerM(String(n));
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button onClick={save}>{mode === "editing" ? "Guardar cambios" : "Guardar"}</Button>

                  {mode === "editing" && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setMode("done");
                        setMsg("");
                      }}
                    >
                      Cancelar
                    </Button>
                  )}

                  {msg && (
                    <span className={msg.startsWith("✅") ? "text-green-300 text-sm" : "text-red-300 text-sm"}>
                      {msg}
                    </span>
                  )}
                </div>

                <div className="text-xs text-white/50">
                  Tip: si borras un campo, se guarda como 0.
                </div>
              </div>
            )}
          </Card>
        </div>
      </PageFade>
    </Container>
  );
}
