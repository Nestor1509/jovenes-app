"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Container, Card, Title, Subtitle, Button, PageFade } from "@/components/ui";
import { Sparkles, ShieldCheck, ArrowRight } from "lucide-react";

function traducirError(msg: string) {
  const m = (msg ?? "").toLowerCase();
  if (m.includes("invalid login")) return "Correo o contraseña incorrectos.";
  if (m.includes("email not confirmed")) return "Tu correo no está confirmado (revisa tu email).";
  if (m.includes("jwt")) return "Tu sesión expiró. Inicia sesión de nuevo.";
  if (m.includes("rate limit")) return "Demasiados intentos. Espera un momento y vuelve a intentar.";
  return "Ocurrió un error. Intenta de nuevo.";
}

export default function Home() {
  const [busy, setBusy] = useState(false);

  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSessionEmail(data.session?.user.email ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionEmail(session?.user.email ?? null);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function signInGoogle() {
    setMsg("");
    try {
      setBusy(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + "/auth/callback",
        },
      });
      if (error) setMsg(traducirError(error.message));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Container>
      <div className="mb-6 flex items-center gap-4">
        <div className="h-14 w-14 rounded-3xl bg-white/5 border border-white/10 grid place-items-center text-lg font-semibold">MA</div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Ministerio Águilas</h1>
          <p className="text-sm text-white/70">Casa de Dios Cruzada Cristiana</p>
        </div>
      </div>

      <PageFade>
        <div className="grid gap-6 md:grid-cols-2 items-start">
          <Card className="relative overflow-hidden">
            <div className="absolute -top-24 -right-24 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-white/10 blur-2xl" />

            <div className="flex items-center gap-2">
              <Sparkles size={18} className="opacity-80" />
              <Title>Bienvenido</Title>
            </div>
            <Subtitle>
              Lleva un registro sencillo de tu lectura bíblica y tu tiempo de oración.
            </Subtitle>

            <div className="mt-5 grid gap-3 text-sm text-white/80">
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                ✅ Reporte diario
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                📊 Estadísticas personales
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                🔒 Acceso por roles
              </div>
            </div>

            {sessionEmail && (
              <div className="mt-5 text-sm text-white/70">
                Sesión iniciada: <strong className="text-white">{sessionEmail}</strong>
              </div>
            )}
          </Card>

          <Card>
            <Title>{sessionEmail ? "Listo para continuar" : "Iniciar sesión"}</Title>
            <Subtitle>
              {sessionEmail
                ? "Usa el menú superior para Reporte, Mis estadísticas, Público, etc."
                : "Solo se permite iniciar sesión con Google."}
            </Subtitle>

            {!sessionEmail ? (
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

                {msg && (
                  <p className={msg.startsWith("✅") ? "text-sm text-green-300" : "text-sm text-red-300"}>
                    {msg}
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-5 text-sm text-white/70">
                Navega con el menú superior.
              </div>
            )}
          </Card>
        </div>
      </PageFade>
    </Container>
  );
}
