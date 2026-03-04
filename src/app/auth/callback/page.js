// "use client";

// import { useEffect } from "react";
// import { useRouter } from "next/navigation";
// import { supabase } from "@/lib/supabaseClient";

// export default function AuthCallbackPage() {
//   const router = useRouter();

//   useEffect(() => {
//     let cancelled = false;

//     const go = (path) => {
//       if (!cancelled) router.replace(path);
//     };

//     (async () => {
//       try {
//         const url = new URL(window.location.href);
//         const code = url.searchParams.get("code");

//         // 1) Exchange si hay code (PKCE)
//         if (code) {
//           await supabase.auth.exchangeCodeForSession(code);
//           url.searchParams.delete("code");
//           window.history.replaceState({}, document.title, url.toString());
//         }

//         // 2) Si ya hay sesión, redirige INMEDIATO
//         const { data } = await supabase.auth.getSession();
//         if (data?.session) return go("/"); // pon tu home real si no es "/"

//         // 3) fallback: igual intenta home, tu guard decidirá
//         return go("/");
//       } catch {
//         return go("/");
//       }
//     })();

//     return () => {
//       cancelled = true;
//     };
//   }, [router]);

//   // UI mínima (o null)
//   return null;
// }


"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    const go = (to) => !cancelled && router.replace(to);

    (async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        // Intercambio PKCE (si viene code)
        if (code) {
          await supabase.auth.exchangeCodeForSession(code);

          // Limpia el code para que no se reintente
          url.searchParams.delete("code");
          window.history.replaceState({}, document.title, url.toString());
        }

        // Redirige ya. El AuthProvider terminará de cargar profile en background.
        go("/");
      } catch {
        // Aunque falle el exchange, intenta ir al home; si hay sesión, quedará logueado
        go("/");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return null;
}
