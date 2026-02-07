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

    async function run() {
      try {
        // Supabase OAuth (PKCE): el parámetro "code" viene en la URL.
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        if (!cancelled) {
          setMsg("✅ Listo. Redirigiendo…");
          router.replace("/");
        }
      } catch (e) {
        if (!cancelled) {
          setMsg("No se pudo completar el inicio de sesión. Intenta de nuevo.");
        }
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
