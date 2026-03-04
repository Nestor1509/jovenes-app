"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Container, Card, Title, Subtitle } from "@/components/ui";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [msg, setMsg] = useState("Procesando inicio de sesión…");

  useEffect(() => {
    let cancelled = false;

    async function finishSuccess() {
      if (cancelled) return;
      setMsg("✅ Listo. Redirigiendo…");
      // pequeño delay para que el usuario vea el OK (opcional)
      setTimeout(() => {
        if (!cancelled) router.replace("/");
      }, 300);
    }

    async function finishError() {
      if (cancelled) return;
      setMsg("No se pudo completar el inicio de sesión. Intenta de nuevo.");
    }

    async function run() {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        // Si viene "code", intentamos el exchange (PKCE)
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);

          // Limpia la URL para evitar re-ejecutar el exchange en refresh/back
          url.searchParams.delete("code");
          window.history.replaceState({}, document.title, url.toString());

          // OJO: aunque haya error, a veces la sesión ya quedó lista.
          if (error) {
            const { data } = await supabase.auth.getSession();
            if (data?.session) return finishSuccess();
            throw error;
          }
        }

        // Si no hay code (o ya fue procesado), igual verificamos sesión
        const { data } = await supabase.auth.getSession();
        if (data?.session) return finishSuccess();

        // No hay sesión => error real
        return finishError();
      } catch (_e) {
        // Incluso si hubo excepción, re-verificamos sesión por si ya se guardó
        try {
          const { data } = await supabase.auth.getSession();
          if (data?.session) return finishSuccess();
        } catch {}

        return finishError();
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
        <Title>Autenticación</Title>
        <Subtitle>{msg}</Subtitle>
      </Card>
    </Container>
  );
}
