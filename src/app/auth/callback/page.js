"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    const go = (path) => {
      if (!cancelled) router.replace(path);
    };

    (async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        // 1) Exchange si hay code (PKCE)
        if (code) {
          await supabase.auth.exchangeCodeForSession(code);
          url.searchParams.delete("code");
          window.history.replaceState({}, document.title, url.toString());
        }

        // 2) Si ya hay sesión, redirige INMEDIATO
        const { data } = await supabase.auth.getSession();
        if (data?.session) return go("/"); // pon tu home real si no es "/"

        // 3) fallback: igual intenta home, tu guard decidirá
        return go("/");
      } catch {
        return go("/");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  // UI mínima (o null)
  return null;
}
