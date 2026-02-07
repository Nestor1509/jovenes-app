"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Container, Card, Title, Subtitle } from "@/components/ui";

export default function AuthCallback() {
  const router = useRouter();
  const [msg, setMsg] = useState("Procesando inicio de sesión…");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        // Si Supabase ya detectó la sesión automáticamente, no hacemos nada extra.
        const { data: sess } = await supabase.auth.getSession();
        if (sess.session) {
          if (!cancelled) router.replace("/");
          return;
        }

        // Forzamos el intercambio del "code" por una sesión (evita loops de recarga en algunos entornos).
        const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
        if (error) throw error;

        if (!cancelled) router.replace("/");
      } catch (e: any) {
        const m = e?.message ? String(e.message) : "No se pudo completar el inicio de sesión.";
        if (!cancelled) setMsg(m);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <Container>
      <Card>
        <Title>Iniciando sesión…</Title>
        <Subtitle>{msg}</Subtitle>
        <div className="mt-4 text-sm text-white/60">
          Si esto tarda demasiado, vuelve a <a className="underline" href="/">Inicio</a> e intenta de nuevo.
        </div>
      </Card>
    </Container>
  );
}
