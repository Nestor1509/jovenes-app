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
import { getCache, setCache, cached } from "@/lib/cache";
import type { Profile } from "@/lib/useMyProfile";

type AuthCtx = {
  loading: boolean;
  session: any | null;
  profile: Profile | null;
  error: string;
  refresh: () => Promise<void>;
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
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState("");

  const refreshingRef = useRef(false);

  /**
   * Carga o crea el perfil del usuario
   */
  const ensureProfile = useCallback(async (user: SbUser) => {
    const userId = user.id;

    const cachedProfile = getCache<Profile>(`profile:${userId}`);
    if (cachedProfile) return cachedProfile;

    const { data: p, error: pErr } = await cached(
      `profile:${userId}`,
      () =>
        withTimeout(
          supabase
            .from("profiles")
            .select("id,name,role,group_id")
            .eq("id", userId)
            .maybeSingle()
        ),
      60_000
    );

    if (pErr) throw new Error(pErr.message);

    const existing = (p as Profile) ?? null;

    if (existing) {
      setCache(`profile:${userId}`, existing, 60_000);
      return existing;
    }

    // Crear perfil automáticamente si no existe
    const md = user.user_metadata ?? {};
    const fallbackName =
      (md?.full_name as string | undefined) ||
      (md?.name as string | undefined) ||
      (user.email ? user.email.split("@")[0] : "Joven");

    const { error: insErr } = await withTimeout(
      supabase.from("profiles").insert({
        id: userId,
        name: String(fallbackName).trim() || "Joven",
        role: "youth",
        group_id: null,
      })
    );

    if (insErr) {
      console.warn("No se pudo crear perfil automáticamente:", insErr.message);
    }

    const { data: p2, error: p2Err } = await withTimeout(
      supabase
        .from("profiles")
        .select("id,name,role,group_id")
        .eq("id", userId)
        .maybeSingle()
    );

    if (p2Err) throw new Error(p2Err.message);

    const created = (p2 as Profile) ?? null;

    if (created) setCache(`profile:${userId}`, created, 60_000);

    return created;
  }, []);

  /**
   * Carga fuerte (inicio de app o acción manual)
   */
  const refresh = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;

    setLoading(true);
    setError("");

    try {
      const { data: sess, error: sErr } = await withTimeout(
        supabase.auth.getSession()
      );

      if (sErr) throw new Error(sErr.message);

      const s = sess.session ?? null;
      setSession(s);

      if (!s?.user?.id) {
        setProfile(null);
        setLoading(false);
        refreshingRef.current = false;
        return;
      }

      const p = await ensureProfile(s.user as SbUser);
      setProfile(p);

      setLoading(false);
    } catch (e: any) {
      setProfile(null);
      setError(e?.message || "No se pudo cargar tu perfil.");
      setLoading(false);
    }

    refreshingRef.current = false;
  }, [ensureProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  useEffect(() => {
    refresh();

    /**
     * Listener de cambios de auth
     */
    const { data: sub } = supabase.auth.onAuthStateChange(async (_evt, sess) => {
      setSession(sess);

      if (!sess?.user?.id) {
        setProfile(null);
        setError("");
        setLoading(false);
        return;
      }

      // No bloquear UI
      setLoading(false);

      try {
        const p = await ensureProfile(sess.user as SbUser);
        setProfile(p);
        setError("");
      } catch (e: any) {
        setProfile(null);
        setError(e?.message || "No se pudo cargar tu perfil.");
      }
    });

    /**
     * Rehidratar sesión al volver a la pestaña
     */
    const rehydrate = async () => {
      if (refreshingRef.current) return;
      refreshingRef.current = true;

      try {
        const { data } = await supabase.auth.getSession();
        const s = data.session ?? null;

        if (!s?.user?.id) {
          setSession(null);
          setProfile(null);
          refreshingRef.current = false;
          return;
        }

        setSession(s);

        if (profile?.id !== s.user.id) {
          try {
            const p = await ensureProfile(s.user as SbUser);
            setProfile(p);
          } catch {}
        }
      } catch {
        // silencioso
      }

      refreshingRef.current = false;
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        rehydrate();
      }
    };

    window.addEventListener("focus", rehydrate);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      sub.subscription.unsubscribe();
      window.removeEventListener("focus", rehydrate);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh, ensureProfile, profile?.id]);

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
