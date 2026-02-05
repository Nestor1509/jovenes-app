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
  chapters_count?: number | null;
  bible_chapters?: string | null;
  prayer_topic?: string | null;
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

  // UX: por defecto mostramos 0 (limpio)
  const [bibleH, setBibleH] = useState<string>("");
  const [bibleM, setBibleM] = useState<string>("");
  const [prayerH, setPrayerH] = useState<string>("");
  const [prayerM, setPrayerM] = useState<string>("");

  // Campos extra (opcionales)
  const [chaptersCount, setChaptersCount] = useState<string>("");
  const [bibleChapters, setBibleChapters] = useState<string>("");
  const [prayerTopic, setPrayerTopic] = useState<string>("");

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

      // Cargamos el reporte del día. Primero intentamos con el esquema nuevo (chapters_detail),
// si falla porque la columna no existe, hacemos fallback al esquema viejo (bible_chapters).
let data: any = null;
let error: any = null;

const primary = await supabase
  .from("reports")
  .select("bible_minutes, prayer_minutes, chapters_count, chapters_detail, prayer_topic")
  .eq("user_id", sess.session.user.id)
  .eq("report_date", dateKey)
  .maybeSingle();

data = primary.data;
error = primary.error;

if (error && String(error.message || "").includes("chapters_detail")) {
  const fallback = await supabase
    .from("reports")
    .select("bible_minutes, prayer_minutes, chapters_count, bible_chapters, prayer_topic")
    .eq("user_id", sess.session.user.id)
    .eq("report_date", dateKey)
    .maybeSingle();
  data = fallback.data;
  error = fallback.error;
}

      if (!error && data) {
        setExisting({
          bible_minutes: data.bible_minutes ?? 0,
          prayer_minutes: data.prayer_minutes ?? 0,
          chapters_count: (data as any).chapters_count ?? null,
          bible_chapters: (data as any).chapters_detail ?? (data as any).bible_chapters ?? null,
          prayer_topic: (data as any).prayer_topic ?? null,
        });
        // Si el usuario ya dijo que NO quiere editar hoy, no volvemos a preguntar
        // y tampoco mostramos la opción de editar.
        const locked = (() => {
          try {
            return localStorage.getItem(lockKey(dateKey)) === "1";
          } catch {
            return false;
          }
        })();

        // Preguntamos si quiere editar; mientras tanto no mostramos el formulario.
        setMode(locked ? "doneLocked" : "askEdit");
        // form limpio por si decide crear/editar luego
        setBibleH("");
        setBibleM("");
        setPrayerH("");
        setPrayerM("");
        setChaptersCount("");
        setBibleChapters("");
        setPrayerTopic("");
      } else {
        // No hay reporte hoy: formulario limpio (0)
        setExisting(null);
        setMode("new");
        // Si no hay reporte hoy, quitamos el lock de hoy por si quedó de antes.
        try {
          localStorage.removeItem(lockKey(dateKey));
        } catch {}
        notifyLockChanged();
        setBibleH("");
        setBibleM("");
        setPrayerH("");
        setPrayerM("");
        setChaptersCount("");
        setBibleChapters("");
        setPrayerTopic("");
      }
    })();
  }, [dateKey]);

  const onlyDigits = (v: string) => v.replace(/[^\d]/g, "");

  function loadExistingIntoForm() {
    const b = fromMinutes(existing?.bible_minutes ?? 0);
    const p = fromMinutes(existing?.prayer_minutes ?? 0);

    // UX: si el valor es 0, mostramos el input vacío (se ve más limpio que un "0" fijo)
    setBibleH(b.h === 0 ? "" : String(b.h));
    setBibleM(b.m === 0 ? "" : String(b.m));
    setPrayerH(p.h === 0 ? "" : String(p.h));
    setPrayerM(p.m === 0 ? "" : String(p.m));

    // Extra
    const cc = existing?.chapters_count;
    setChaptersCount(cc === null || cc === undefined || !Number.isFinite(Number(cc)) ? "" : String(cc));
    setBibleChapters((existing?.bible_chapters ?? "").toString());
    setPrayerTopic((existing?.prayer_topic ?? "").toString());
  }

  async function save() {
    setMsg("");

    const { data: sess } = await supabase.auth.getSession();
    const user = sess.session?.user;
    if (!user) return;

    const bible_minutes = toMinutes(bibleH, bibleM);
    const prayer_minutes = toMinutes(prayerH, prayerM);

    const chapters_count = chaptersCount.trim() === "" ? null : clampInt(Number(chaptersCount), 0, 500);
    const bible_chapters = bibleChapters.trim() === "" ? null : bibleChapters.trim();
    const prayer_topic = prayerTopic.trim() === "" ? null : prayerTopic.trim();

    let upsertError: any = null;
// Intentamos guardar con la columna "chapters_detail" (nuevo esquema).
// Si en tu BD todavía existe "bible_chapters", hacemos fallback automático.
const primary = await supabase.from("reports").upsert(
  {
    user_id: user.id,
    report_date: today,
    bible_minutes,
    prayer_minutes,
    chapters_count,
    bible_chapters,
    prayer_topic,
  },
  { onConflict: "user_id,report_date" }
);

upsertError = primary.error;

if (upsertError && String(upsertError.message || "").includes('chapters_detail')) {
  const fallback = await supabase.from("reports").upsert(
    {
      user_id: user.id,
      report_date: today,
      bible_minutes,
      prayer_minutes,
      chapters_count,
      bible_chapters,
      prayer_topic,
    } as any,
    { onConflict: "user_id,report_date" }
  );
  upsertError = fallback.error;
}

if (upsertError) {
      setMsg(traducirError(upsertError.message));
      return;
    }

    setExisting({ bible_minutes, prayer_minutes, chapters_count, bible_chapters, prayer_topic });
    try {
      localStorage.removeItem(lockKey(dateKey));
    } catch {}
    notifyLockChanged();
    setMode("done");
    setMsg("✅ Guardado correctamente");
  }

  const Summary = ({ allowEdit }: { allowEdit: boolean }) => {
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

          {(existing?.chapters_count || existing?.bible_chapters || existing?.prayer_topic) ? (
            <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
              <div className="grid gap-2">
                {existing?.chapters_count ? (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-white/70">Capítulos leídos</span>
                    <span className="font-semibold text-white">{existing.chapters_count}</span>
                  </div>
                ) : null}
                {existing?.bible_chapters ? (
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-white/70">Capítulos (detalle)</span>
                    <span className="font-semibold text-white text-right break-words max-w-[60%]">{existing.bible_chapters}</span>
                  </div>
                ) : null}
                {existing?.prayer_topic ? (
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-white/70">Tema de oración</span>
                    <span className="font-semibold text-white text-right break-words max-w-[60%]">{existing.prayer_topic}</span>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
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
          </>
        ) : (
          <div className="text-xs text-white/50">
            Ya reportaste hoy. (Elegiste no editar.)
          </div>
        )}
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
                      try {
                        localStorage.removeItem(lockKey(dateKey));
                      } catch {}
                      notifyLockChanged();
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
                      // Si elige no editar, guardamos un "lock" (solo hoy) para
                      // que la app no muestre la opción de reporte/editar otra vez.
                      try {
                        localStorage.setItem(lockKey(dateKey), "1");
                      } catch {}
                      notifyLockChanged();
                      setMode("doneLocked");
                      setMsg("");
                    }}
                  >
                    No, gracias
                  </Button>
                </div>

                <div className="text-xs text-white/50">
                  Nota: si eliges “No, gracias”, la opción de <b>Reporte</b> se oculta por hoy.
                </div>
              </div>
            ) : mode === "done" ? (
              <Summary allowEdit />
            ) : mode === "doneLocked" ? (
              <Summary allowEdit={false} />
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
                          onFocus={(e) => {
                            if (bibleH === "0") setBibleH("");
                            try { (e.target as HTMLInputElement).select(); } catch {}
                          }}
                          onChange={(e) => setBibleH(onlyDigits(e.target.value))}
                          onBlur={() => {
                            if (bibleH.trim() === "") return;
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
                          onFocus={(e) => {
                            if (bibleM === "0") setBibleM("");
                            try { (e.target as HTMLInputElement).select(); } catch {}
                          }}
                          onChange={(e) => setBibleM(onlyDigits(e.target.value))}
                          onBlur={() => {
                            if (bibleM.trim() === "") return;
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
                          onFocus={(e) => {
                            if (prayerH === "0") setPrayerH("");
                            try { (e.target as HTMLInputElement).select(); } catch {}
                          }}
                          onChange={(e) => setPrayerH(onlyDigits(e.target.value))}
                          onBlur={() => {
                            if (prayerH.trim() === "") return;
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
                          onFocus={(e) => {
                            if (prayerM === "0") setPrayerM("");
                            try { (e.target as HTMLInputElement).select(); } catch {}
                          }}
                          onChange={(e) => setPrayerM(onlyDigits(e.target.value))}
                          onBlur={() => {
                            if (prayerM.trim() === "") return;
                            const n = clampInt(Number(prayerM), 0, 59);
                            setPrayerM(String(n));
                          }}
                        />
                      </div>
                    </div>
                  </div>

                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-sm font-medium">Detalles opcionales</div>
                  <div className="mt-1 text-xs text-white/60">(No cambia nada de lo existente: solo agrega información extra.)</div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div>
                      <div className="text-xs text-white/60 mb-1">Capítulos leídos (cantidad)</div>
                      <Input
                        inputMode="numeric"
                        placeholder="Opcional"
                        value={chaptersCount}
                        onChange={(e) => setChaptersCount(onlyDigits(e.target.value))}
                        onBlur={() => {
                          if (chaptersCount.trim() === "") return;
                          const n = clampInt(Number(chaptersCount), 0, 500);
                          setChaptersCount(String(n));
                        }}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <div className="text-xs text-white/60 mb-1">Capítulos (detalle)</div>
                      <Input
                        placeholder="Opcional (ej: Juan 3-4, Salmo 23)"
                        value={bibleChapters}
                        onChange={(e) => setBibleChapters(e.target.value)}
                      />
                    </div>

                    <div className="md:col-span-3">
                      <div className="text-xs text-white/60 mb-1">Tema de oración</div>
                      <Input
                        placeholder="Opcional (ej: familia, salud, trabajo, dirección)"
                        value={prayerTopic}
                        onChange={(e) => setPrayerTopic(e.target.value)}
                      />
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
