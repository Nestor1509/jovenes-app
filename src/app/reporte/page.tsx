"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Container, Card, Title, Subtitle, Button, Input, PageFade } from "@/components/ui";
import { BookOpen, CheckCircle2, Clock3, HeartHandshake, PencilLine } from "lucide-react";

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
  if (m.includes("duplicate key") || m.includes("unique")) return "Ya existe un reporte para esa fecha.";
  if (m.includes("stack depth"))
    return "Error de seguridad/roles. Recarga la página (si continúa, avísame).";
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

  const [chapters, setChapters] = useState<string>("" );
  const [prayerH, setPrayerH] = useState<string>("" );
  const [prayerM, setPrayerM] = useState<string>("" );

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
          chapters_count: data.chapters_count ?? 0,
          prayer_minutes: data.prayer_minutes ?? 0,
        });

        const locked = (() => {
          try {
            return localStorage.getItem(lockKey(dateKey)) === "1";
          } catch {
            return false;
          }
        })();

        setMode(locked ? "doneLocked" : "askEdit");

        setChapters("");
        setPrayerH("");
        setPrayerM("");
      } else {
        setExisting(null);
        setMode("new");
        try {
          localStorage.removeItem(lockKey(dateKey));
        } catch {}
        notifyLockChanged();

        setChapters("");
        setPrayerH("");
        setPrayerM("");
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

    const chapters_count = clampInt(Number(onlyDigits(chapters || "0")), 0, 500);
    const prayer_minutes = toMinutes(prayerH, prayerM);

    const { error } = await supabase.from("reports").upsert(
      {
        user_id: user.id,
        report_date: today,
        chapters_count,
        prayer_minutes,
      },
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
    const caps = Math.max(0, Math.floor(Number(existing?.chapters_count ?? 0)));

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
            <span className="font-semibold text-white">{caps}</span>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3">
            <span className="flex items-center gap-2">
              <Clock3 size={16} className="opacity-80" /> Oración
            </span>
            <span className="font-semibold text-white">
              {p.h}h {p.m}m
            </span>
          </div>
        </div>

        {allowEdit && (
          <Button
            variant="subtle"
            onClick={() => {
              loadExistingIntoForm();
              setMode("editing");
            }}
            className="mt-1"
          >
            <PencilLine size={16} /> Editar reporte
          </Button>
        )}
      </div>
    );
  };

  function lockNoEdit() {
    try {
      localStorage.setItem(lockKey(dateKey), "1");
    } catch {}
    notifyLockChanged();
    setMode("doneLocked");
  }

  return (
    <Container>
      <PageFade>
        <div className="grid gap-6">
          <div>
            <Title>Reporte diario</Title>
            <Subtitle>Reporta hoy tus capítulos leídos y tu tiempo de oración.</Subtitle>
          </div>

          {msg && <div className={msg.startsWith("✅") ? "text-emerald-200 text-sm" : "text-red-300 text-sm"}>{msg}</div>}

          {mode === "loading" ? (
            <Card>
              <div className="text-sm text-white/70">Cargando…</div>
            </Card>
          ) : mode === "askEdit" ? (
            <Card>
              <Summary allowEdit={false} />
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <Button
                  variant="primary"
                  onClick={() => {
                    loadExistingIntoForm();
                    setMode("editing");
                  }}
                >
                  Sí, editar
                </Button>
                <Button variant="ghost" onClick={lockNoEdit}>
                  No, dejar así
                </Button>
              </div>
            </Card>
          ) : mode === "doneLocked" ? (
            <Card>
              <Summary allowEdit={false} />
              <div className="mt-3 text-xs text-white/60">Hoy elegiste no editar este reporte.</div>
            </Card>
          ) : mode === "done" ? (
            <Card>
              <Summary allowEdit={true} />
            </Card>
          ) : (
            <Card>
              <div className="grid gap-5">
                <div className="flex items-center gap-2 text-sm text-white/70">
                  <Clock3 size={16} />
                  <span>Fecha</span>
                </div>

                <Input type="date" value={today} disabled className="max-w-xs opacity-70 cursor-not-allowed" />

                <div className="text-xs text-white/50">Solo puedes reportar el día de hoy. (La base de datos también lo valida.)</div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-center gap-2 font-medium">
                      <BookOpen size={18} className="opacity-80" />
                      Lectura bíblica
                    </div>

                    <div className="mt-3">
                      <div className="text-xs text-white/60 mb-1">Capítulos leídos</div>
                      <Input
                        inputMode="numeric"
                        placeholder="0"
                        value={chapters}
                        onFocus={(e) => {
                          if (chapters === "0") setChapters("");
                          try { (e.target as HTMLInputElement).select(); } catch {}
                        }}
                        onChange={(e) => setChapters(onlyDigits(e.target.value))}
                        onBlur={() => {
                          if (chapters.trim() === "") return;
                          const n = clampInt(Number(chapters), 0, 500);
                          setChapters(String(n));
                        }}
                      />
                    </div>

                    <div className="mt-3 text-xs text-white/50">Nota: la lectura se registra por <b>cantidad de capítulos</b>.</div>
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

                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="primary" onClick={save}>
                    {mode === "editing" ? "Guardar cambios" : "Guardar"}
                  </Button>

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
                </div>
              </div>
            </Card>
          )}
        </div>
      </PageFade>
    </Container>
  );
}
