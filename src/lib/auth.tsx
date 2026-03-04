// "use client";

// import React, {
//   createContext,
//   useCallback,
//   useContext,
//   useEffect,
//   useMemo,
//   useRef,
//   useState,
// } from "react";
// import { supabase } from "@/lib/supabaseClient";
// import { getCache, setCache, cached } from "@/lib/cache";
// import type { Profile } from "@/lib/useMyProfile";

// type AuthCtx = {
//   loading: boolean;
//   session: any | null;
//   profile: Profile | null;
//   error: string;
//   refresh: (opts?: { hard?: boolean }) => Promise<void>;
//   signOut: () => Promise<void>;
// };

// type SbUser = {
//   id: string;
//   email?: string | null;
//   user_metadata?: Record<string, any> | null;
// };

// function withTimeout<T>(
//   p: PromiseLike<T>,
//   ms = 8000,
//   msg = "Tiempo de espera agotado. Revisa tu conexión o Supabase."
// ): Promise<T> {
//   return Promise.race([
//     Promise.resolve(p),
//     new Promise<T>((_, reject) => setTimeout(() => reject(new Error(msg)), ms)),
//   ]);
// }

// const Ctx = createContext<AuthCtx | null>(null);

// export function AuthProvider({ children }: { children: React.ReactNode }) {
//   const [loading, setLoading] = useState(true);
//   const [session, setSession] = useState<any | null>(null);
//   const [profile, setProfile] = useState<Profile | null>(null);
//   const [error, setError] = useState("");

//   // Evita ejecuciones concurrentes (focus + interval + auth events)
//   const inFlightRef = useRef(false);
//   // Para evitar setState después de un unmount
//   const mountedRef = useRef(true);

//   const safeSet = useCallback(<T,>(setter: (v: T) => void, v: T) => {
//     if (!mountedRef.current) return;
//     setter(v);
//   }, []);

//   /**
//    * Carga o crea el perfil (con cache) - NO toca loading global por sí sola.
//    */
//   const ensureProfile = useCallback(async (user: SbUser) => {
//     const userId = user.id;

//     const cachedProfile = getCache<Profile>(`profile:${userId}`);
//     if (cachedProfile) return cachedProfile;

//     const { data: p, error: pErr } = await cached(
//       `profile:${userId}`,
//       () =>
//         withTimeout(
//           supabase
//             .from("profiles")
//             .select("id,name,role,group_id")
//             .eq("id", userId)
//             .maybeSingle(),
//           8000
//         ),
//       60_000
//     );

//     if (pErr) throw new Error(pErr.message);

//     const existing = (p as Profile) ?? null;
//     if (existing) {
//       setCache(`profile:${userId}`, existing, 60_000);
//       return existing;
//     }

//     // Auto-create si no existe (role youth)
//     const md = (user.user_metadata ?? {}) as any;
//     const fallbackName =
//       (md?.full_name as string | undefined) ||
//       (md?.name as string | undefined) ||
//       (user.email ? String(user.email).split("@")[0] : "Joven");

//     const { error: insErr } = await withTimeout(
//       supabase.from("profiles").insert({
//         id: userId,
//         name: String(fallbackName).trim() || "Joven",
//         role: "youth",
//         group_id: null,
//       }),
//       8000
//     );

//     if (insErr) {
//       // No rompemos el flujo: intentamos leer igual
//       // eslint-disable-next-line no-console
//       console.warn("No se pudo crear perfil automáticamente:", insErr.message);
//     }

//     const { data: p2, error: p2Err } = await withTimeout(
//       supabase
//         .from("profiles")
//         .select("id,name,role,group_id")
//         .eq("id", userId)
//         .maybeSingle(),
//       8000
//     );

//     if (p2Err) throw new Error(p2Err.message);

//     const created = (p2 as Profile) ?? null;
//     if (created) setCache(`profile:${userId}`, created, 60_000);

//     return created;
//   }, []);

//   /**
//    * Refresca sesión si expira pronto. NO pone loading=true.
//    * Útil para focus/visibility/interval.
//    */
//   const refreshIfExpiringSoonSoft = useCallback(async () => {
//     if (inFlightRef.current) return;
//     inFlightRef.current = true;

//     try {
//       const { data: sess, error: sErr } = await withTimeout(
//         supabase.auth.getSession(),
//         8000
//       );
//       if (sErr) throw new Error(sErr.message);

//       const s = sess.session ?? null;

//       // No session
//       if (!s?.user?.id) {
//         safeSet(setSession, null);
//         safeSet(setProfile, null);
//         safeSet(setError, "");
//         return;
//       }

//       safeSet(setSession, s);

//       const expMs = (s.expires_at ?? 0) * 1000;
//       const msLeft = expMs - Date.now();

//       // Si faltan <5 min, forzamos refresh del token
//       if (msLeft < 5 * 60 * 1000) {
//         const { data: refreshed, error: rErr } = await withTimeout(
//           supabase.auth.refreshSession(),
//           8000
//         );
//         if (rErr) throw new Error(rErr.message);

//         const s2 = refreshed.session ?? null;
//         safeSet(setSession, s2);

//         if (!s2?.user?.id) {
//           safeSet(setProfile, null);
//           safeSet(setError, "");
//           return;
//         }

//         // Si no tengo profile o cambió usuario, lo aseguro
//         if (!profile || profile.id !== s2.user.id) {
//           try {
//             const p = await ensureProfile(s2.user as SbUser);
//             safeSet(setProfile, p);
//             safeSet(setError, "");
//           } catch (e: any) {
//             safeSet(setProfile, null);
//             safeSet(setError, e?.message ? String(e.message) : "No se pudo cargar tu perfil.");
//           }
//         }
//       } else {
//         // Si no expira pronto: solo asegurar profile si falta
//         if (s.user?.id && (!profile || profile.id !== s.user.id)) {
//           try {
//             const p = await ensureProfile(s.user as SbUser);
//             safeSet(setProfile, p);
//             safeSet(setError, "");
//           } catch {
//             // silencioso
//           }
//         }
//       }
//     } catch {
//       // silencioso (no bloquea UI)
//     } finally {
//       inFlightRef.current = false;
//     }
//   }, [ensureProfile, profile, safeSet]);

//   /**
//    * Refresh "duro": usado para carga inicial y acciones manuales.
//    * hard=true => loading=true
//    */
//   const refresh = useCallback(
//     async (opts?: { hard?: boolean }) => {
//       const hard = opts?.hard !== false; // default true

//       if (inFlightRef.current) return;
//       inFlightRef.current = true;

//       if (hard) safeSet(setLoading, true);
//       safeSet(setError, "");

//       try {
//         const { data: sess, error: sErr } = await withTimeout(
//           supabase.auth.getSession(),
//           8000
//         );
//         if (sErr) throw new Error(sErr.message);

//         const s = sess.session ?? null;
//         safeSet(setSession, s);

//         if (!s?.user?.id) {
//           safeSet(setProfile, null);
//           safeSet(setLoading, false);
//           return;
//         }

//         const p = await ensureProfile(s.user as SbUser);
//         safeSet(setProfile, p);
//         safeSet(setLoading, false);
//       } catch (e: any) {
//         const msg = e?.message ? String(e.message) : "No se pudo cargar tu perfil.";

//         // Caso típico de OAuth state inválido al volver atrás/abrir otra pestaña
//         if (msg.toLowerCase().includes("bad_oauth_state")) {
//           try {
//             await supabase.auth.signOut();
//           } catch {}
//         }

//         safeSet(setProfile, null);
//         safeSet(setError, msg);
//         safeSet(setLoading, false);
//       } finally {
//         inFlightRef.current = false;
//       }
//     },
//     [ensureProfile, safeSet]
//   );

//   const signOut = useCallback(async () => {
//     await supabase.auth.signOut();
//     // state se actualizará por el listener
//   }, []);

//   useEffect(() => {
//     mountedRef.current = true;

//     // 1) carga inicial fuerte
//     refresh({ hard: true });

//     // 2) escuchar cambios de auth (login/logout/refresh interno)
//     const { data: sub } = supabase.auth.onAuthStateChange(async (_evt, sess) => {
//   setSession(sess);

//   // ✅ Si hay sesión, NO muestres error de "login fallido"
//   if (sess?.user?.id) {
//     setError("");
//   }

//   if (!sess?.user?.id) {
//     setProfile(null);
//     setLoading(false);
//     return;
//   }

//   // No bloquear UI
//   setLoading(false);

//   try {
//     const p = await ensureProfile(sess.user as SbUser);
//     setProfile(p);
//     setError(""); // ✅ mantiene limpio si el perfil cargó bien
//   } catch (e: any) {
//     // ⚠️ Este error es de PERFIL, no de LOGIN.
//     // Si quieres, muestra algo distinto en la UI.
//     setProfile(null);
//     setError(e?.message ? String(e.message) : "No se pudo cargar tu perfil.");
//   }
// });
//     // 3) rehidratar + refresh proactivo al volver a pestaña
//     const onVisible = () => {
//       if (document.visibilityState === "visible") refreshIfExpiringSoonSoft();
//     };

//     window.addEventListener("focus", refreshIfExpiringSoonSoft);
//     document.addEventListener("visibilitychange", onVisible);

//     // 4) tick cada 2 minutos para evitar expiración silenciosa en móviles/segundo plano
//     const t = window.setInterval(refreshIfExpiringSoonSoft, 2 * 60 * 1000);

//     return () => {
//       mountedRef.current = false;
//       sub.subscription.unsubscribe();
//       window.removeEventListener("focus", refreshIfExpiringSoonSoft);
//       document.removeEventListener("visibilitychange", onVisible);
//       clearInterval(t);
//     };
//   }, [ensureProfile, refresh, refreshIfExpiringSoonSoft, safeSet]);

//   const value = useMemo<AuthCtx>(
//     () => ({
//       loading,
//       session,
//       profile,
//       error,
//       refresh,
//       signOut,
//     }),
//     [loading, session, profile, error, refresh, signOut]
//   );

//   return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
// }

// export function useAuth() {
//   const v = useContext(Ctx);
//   if (!v) throw new Error("useAuth debe usarse dentro de <AuthProvider />");
//   return v;
// }

"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { supabase } from "@/lib/supabaseClient";
import { getCache, setCache } from "@/lib/cache";
import type { Profile } from "@/lib/useMyProfile";

type AuthCtx = {
  /**
   * loading = “ya determiné si hay sesión”
   * (NO bloquea por cargar profile)
   */
  loading: boolean;
  session: any | null;
  profile: Profile | null;

  /**
   * error = errores “de auth” (sesión)
   * (si falla profile, no debería bloquear login)
   */
  error: string;

  /**
   * refresh = recarga sesión + profile (modo “duro”)
   * Úsalo si el usuario toca un botón “Reintentar” o similar.
   */
  refresh: (opts?: { hard?: boolean }) => Promise<void>;
  signOut: () => Promise<void>;
};

type SbUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, any> | null;
};

function withTimeout<T>(
  p: PromiseLike<T>,
  ms = 8000,
  msg = "Tiempo de espera agotado. Revisa tu conexión o Supabase."
): Promise<T> {
  return Promise.race([
    Promise.resolve(p),
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(msg)), ms)),
  ]);
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true); // solo sesión
  const [session, setSession] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState("");

  const mountedRef = useRef(true);

  // Evita “carreras” (focus + auth events + refresh manual)
  const inFlightProfileRef = useRef<Promise<Profile | null> | null>(null);

  const safe = useCallback(<T,>(fn: (v: T) => void, v: T) => {
    if (!mountedRef.current) return;
    fn(v);
  }, []);

  /**
   * Carga/crea profile con cache. NO toca loading global.
   */
  const ensureProfile = useCallback(async (user: SbUser): Promise<Profile | null> => {
    const userId = user.id;

    // 1) Cache local
    const cachedProfile = getCache<Profile>(`profile:${userId}`);
    if (cachedProfile) return cachedProfile;

    // 2) Si ya hay una carga en curso, reusa
    if (inFlightProfileRef.current) return inFlightProfileRef.current;

    const run = (async () => {
      // 2.1) Intentar leer
      const { data: p, error: pErr } = await withTimeout(
        supabase
          .from("profiles")
          .select("id,name,role,group_id")
          .eq("id", userId)
          .maybeSingle(),
        8000
      );

      if (pErr) throw new Error(pErr.message);

      const existing = (p as Profile) ?? null;
      if (existing) {
        setCache(`profile:${userId}`, existing, 60_000);
        return existing;
      }

      // 2.2) Si no existe, intentar crear (youth)
      const md = (user.user_metadata ?? {}) as any;
      const fallbackName =
        (md?.full_name as string | undefined) ||
        (md?.name as string | undefined) ||
        (user.email ? String(user.email).split("@")[0] : "Joven");

      const { error: insErr } = await withTimeout(
        supabase.from("profiles").insert({
          id: userId,
          name: String(fallbackName).trim() || "Joven",
          role: "youth",
          group_id: null,
        }),
        8000
      );

      // Si falla (RLS, etc.), seguimos e intentamos leer otra vez
      if (insErr) {
        // eslint-disable-next-line no-console
        console.warn("No se pudo crear perfil automáticamente:", insErr.message);
      }

      const { data: p2, error: p2Err } = await withTimeout(
        supabase
          .from("profiles")
          .select("id,name,role,group_id")
          .eq("id", userId)
          .maybeSingle(),
        8000
      );
      if (p2Err) throw new Error(p2Err.message);

      const created = (p2 as Profile) ?? null;
      if (created) setCache(`profile:${userId}`, created, 60_000);
      return created;
    })();

    inFlightProfileRef.current = run;

    try {
      const res = await run;
      return res;
    } finally {
      // libera el candado
      inFlightProfileRef.current = null;
    }
  }, []);

  /**
   * Refresh “duro” (opcional): recarga sesión y profile, y puede mostrar loading global.
   */
  const refresh = useCallback(
    async (opts?: { hard?: boolean }) => {
      const hard = opts?.hard !== false; // default true
      if (hard) safe(setLoading, true);
      safe(setError, "");

      try {
        // getSession normalmente es instantáneo (rehidrata de storage)
        const { data: sess, error: sErr } = await withTimeout(supabase.auth.getSession(), 8000);
        if (sErr) throw new Error(sErr.message);

        const s = sess.session ?? null;
        safe(setSession, s);

        // ✅ ya sabemos si hay sesión: no bloqueamos más la UI
        safe(setLoading, false);

        if (!s?.user?.id) {
          safe(setProfile, null);
          return;
        }

        // profile en background (sin volver loading)
        try {
          const p = await ensureProfile(s.user as SbUser);
          safe(setProfile, p);
        } catch (e: any) {
          // Esto NO debe “romper el login”
          safe(setProfile, null);
          // Si quieres, puedes mostrar este error en una sección “Perfil”
          // pero no lo metas como error global de auth si te molesta.
          // safe(setError, e?.message ? String(e.message) : "No se pudo cargar tu perfil.");
        }
      } catch (e: any) {
        const msg = e?.message ? String(e.message) : "No se pudo cargar tu sesión.";
        // caso típico al volver atrás/varias pestañas con OAuth
        if (msg.toLowerCase().includes("bad_oauth_state")) {
          try {
            await supabase.auth.signOut();
          } catch {}
        }
        safe(setSession, null);
        safe(setProfile, null);
        safe(setError, msg);
        safe(setLoading, false);
      }
    },
    [ensureProfile, safe]
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    // El listener onAuthStateChange se encarga de limpiar estado
  }, []);

  /**
   * Re-sync “suave” al volver a la pestaña:
   * - NO pone loading global
   * - refresca token solo si expira pronto
   */
  const resyncOnFocus = useCallback(async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const s = data?.session ?? null;

      // rehidrata UI
      safe(setSession, s);

      if (!s?.user?.id) {
        safe(setProfile, null);
        safe(setError, "");
        return;
      }

      // refresca si expira pronto
      const expMs = (s.expires_at ?? 0) * 1000;
      const msLeft = expMs - Date.now();
      const shouldRefresh = msLeft < 2 * 60 * 1000; // 2 min

      if (shouldRefresh) {
        const { data: refreshed, error: rErr } = await supabase.auth.refreshSession();
        if (!rErr) {
          const s2 = refreshed.session ?? null;
          safe(setSession, s2);
        }
      }

      // si falta profile, cargar (sin bloquear)
      if (!profile || profile.id !== s.user.id) {
        try {
          const p = await ensureProfile(s.user as SbUser);
          safe(setProfile, p);
        } catch {
          // silencioso
        }
      }
    } catch {
      // silencioso
    }
  }, [ensureProfile, profile, safe]);

  useEffect(() => {
    mountedRef.current = true;

    // 1) Carga inicial (duro, pero soltamos loading apenas sabemos si hay sesión)
    refresh({ hard: true });

    // 2) Listener oficial supabase: login/logout/refresh internos
    const { data: sub } = supabase.auth.onAuthStateChange(async (_evt, sess) => {
      safe(setSession, sess ?? null);

      // ✅ sesión determinada => no bloquees UI
      safe(setLoading, false);

      if (!sess?.user?.id) {
        safe(setProfile, null);
        safe(setError, "");
        return;
      }

      // profile en background
      try {
        const p = await ensureProfile(sess.user as SbUser);
        safe(setProfile, p);
        safe(setError, ""); // limpia error auth si ya está OK
      } catch {
        // no tumbes la sesión por un fallo del profile
        safe(setProfile, null);
      }
    });

    // 3) Al volver a pestaña / focus
    const onVisible = () => {
      if (document.visibilityState === "visible") resyncOnFocus();
    };
    window.addEventListener("focus", resyncOnFocus);
    document.addEventListener("visibilitychange", onVisible);

    // 4) “Keep-alive” liviano (evita expiración silenciosa en móvil/background)
    const t = window.setInterval(resyncOnFocus, 2 * 60 * 1000);

    return () => {
      mountedRef.current = false;
      sub.subscription.unsubscribe();
      window.removeEventListener("focus", resyncOnFocus);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(t);
    };
  }, [ensureProfile, refresh, resyncOnFocus, safe]);

  const value = useMemo<AuthCtx>(
    () => ({
      loading,
      session,
      profile,
      error,
      refresh,
      signOut,
    }),
    [loading, session, profile, error, refresh, signOut]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth debe usarse dentro de <AuthProvider />");
  return v;
}
