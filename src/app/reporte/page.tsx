"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { invalidate } from "@/lib/cache";
import { Container, Card, Title, Subtitle, Button, Input, PageFade } from "@/components/ui";
import { Clock3, BookOpen, HeartHandshake } from "lucide-react";

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

export default function ReportePage() {
  const [loading, setLoading] = useState(true);
  const [reportDate, setReportDate] = useState(todayISO());

  // 👇 ahora son strings para UX (se pueden borrar)
  const [bibleH, setBibleH] = useState<string>("");
  const [bibleM, setBibleM] = useState<string>("");
  const [prayerH, setPrayerH] = useState<string>("");
  const [prayerM, setPrayerM] = useState<string>("");

  const [msg, setMsg] = useState("");

  const dateKey = useMemo(() => reportDate, [reportDate]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setMsg("");

      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        window.location.href = "/";
        return;
      }

      const { data, error } = await supabase
        .from("reports")
        .select("bible_minutes, prayer_minutes")
        .eq("report_date", dateKey)
        .maybeSingle();

      if (!error && data) {
        const b = fromMinutes(data.bible_minutes ?? 0);
        const p = fromMinutes(data.prayer_minutes ?? 0);

        // si es 0, dejamos vacío para que sea agradable
        setBibleH(b.h === 0 ? "" : String(b.h));
        setBibleM(b.m === 0 ? "" : String(b.m));
        setPrayerH(p.h === 0 ? "" : String(p.h));
        setPrayerM(p.m === 0 ? "" : String(p.m));
      } else {
        setBibleH("");
        setBibleM("");
        setPrayerH("");
        setPrayerM("");
      }

      setLoading(false);
    })();
  }, [dateKey]);

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
        report_date: reportDate,
        bible_minutes,
        prayer_minutes,
      },
      { onConflict: "user_id,report_date" }
    );

    if (error) setMsg(traducirError(error.message));
    else setMsg("✅ Guardado correctamente");
  }

  // helpers para que solo entren números
  const onlyDigits = (v: string) => v.replace(/[^\d]/g, "");

  return (
    <Container>
      <PageFade>
        <div className="grid gap-6">
          <div>
            <Title>Mi reporte</Title>
            <Subtitle>Registra tu lectura bíblica y tu tiempo de oración (en horas y minutos).</Subtitle>
          </div>

          <Card>
            {loading ? (
              <div className="text-sm text-white/70">Cargando…</div>
            ) : (
              <div className="grid gap-5">
                <div className="flex items-center gap-2 text-sm text-white/70">
                  <Clock3 size={16} />
                  <span>Fecha</span>
                </div>

                <Input
                  type="date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  className="max-w-xs"
                />

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
                            if (bibleH.trim() === "") return;
                            const n = clampInt(Number(bibleH), 0, 24);
                            setBibleH(n === 0 ? "" : String(n));
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
                            if (bibleM.trim() === "") return;
                            const n = clampInt(Number(bibleM), 0, 59);
                            setBibleM(n === 0 ? "" : String(n));
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
                            if (prayerH.trim() === "") return;
                            const n = clampInt(Number(prayerH), 0, 24);
                            setPrayerH(n === 0 ? "" : String(n));
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
                            if (prayerM.trim() === "") return;
                            const n = clampInt(Number(prayerM), 0, 59);
                            setPrayerM(n === 0 ? "" : String(n));
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button onClick={save}>Guardar</Button>
                  {msg && (
                    <span className={msg.startsWith("✅") ? "text-green-300 text-sm" : "text-red-300 text-sm"}>
                      {msg}
                    </span>
                  )}
                </div>

                <div className="text-xs text-white/50">
                  Tip: Puedes dejar campos vacíos y se guardan como 0.
                </div>
              </div>
            )}
          </Card>
        </div>
      </PageFade>
    </Container>
  );
}
