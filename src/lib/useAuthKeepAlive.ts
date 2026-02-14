"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export function useAuthKeepAlive() {
  useEffect(() => {
    let mounted = true;

    async function syncSession() {
      // fuerza a supabase a re-leer storage y refrescar si aplica
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      // Si quieres: cuando no hay session aquí, puedes intentar getUser() también.
      // await supabase.auth.getUser();
    }

    const onVisible = () => {
      if (document.visibilityState === "visible") syncSession();
    };

    window.addEventListener("focus", syncSession);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      mounted = false;
      window.removeEventListener("focus", syncSession);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
}
