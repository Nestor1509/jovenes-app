"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getCache, setCache } from "@/lib/cache";
import { cached } from "@/lib/cache";
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

  const ensureProfile = useCallback(async (user: SbUser) => {
    const userId = user.id;
    const cachedProfile = getCache<Profile>(`profile:${userId}`);
    if (cachedProfile) return cachedProfile;
    if (!cached) throw new Error("Cache function is not available.");

    // 1) Try to load
    const { data: p, error: pErr } = await cached(
      `profile:${userId}`,
      () =>
        withTimeout(
          supabase
            .from("profiles")
            .select("id,name,role,group_id")
            .eq("id", userId)
            .maybeSingle(),
          8000
        ),
      60_000
    );
    if (pErr) throw new Error(pErr.message);

    const existing = (p as Profile) ?? null;
    if (existing) {
      setCache(`profile:${userId}`, existing, 60_000);
      return existing;
    }

    // 2) If missing, auto-create as "youth" (Joven)
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

    // If insert fails (e.g., RLS not applied yet), we still try to read and continue.
    if (insErr) {
      // eslint-disable-next-line no-console
      console.warn("No se pudo crear perfil automáticamente:", insErr.message);
    }

    const { data: p2, error: p2Err } = await withTimeout(
      supabase.from("profiles").select("id,name,role,group_id").eq("id", userId).maybeSingle(),
      8000
    );
    if (p2Err) throw new Error(p2Err.message);
    const created = (p2 as Profile) ?? null;
    if (created) setCache(`profile:${userId}`, created, 60_000);
    return created;
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: sess, error: sErr } = await withTimeout(supabase.auth.getSession(), 8000);
      if (sErr) throw new Error(sErr.message);

      const s = sess.session ?? null;
      setSession(s);

      if (!s?.user?.id) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const p = await ensureProfile(s.user as SbUser);
      setProfile(p);
      setLoading(false);
    } catch (e: any) {
      setProfile(null);
      setError(e?.message ? String(e.message) : "No se pudo cargar tu perfil.");
      setLoading(false);
    }
  }, [ensureProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    // state will update via listener
  }, []);

  useEffect(() => {
    // 1) initial load
    refresh();

    // 2) keep in sync without refetching on every page
    const { data: sub } = supabase.auth.onAuthStateChange(async (_evt, sess) => {
      setSession(sess);
      if (!sess?.user?.id) {
        setProfile(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const p = await ensureProfile(sess.user as SbUser);
        setProfile(p);
      } catch (e: any) {
        setProfile(null);
        setError(e?.message ? String(e.message) : "No se pudo cargar tu perfil.");
      } finally {
        setLoading(false);
      }
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, [refresh, ensureProfile]);

  const value = useMemo<AuthCtx>(
    () => ({ loading, session, profile, error, refresh, signOut }),
    [loading, session, profile, error, refresh, signOut]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth debe usarse dentro de <AuthProvider />");
  return v;
}
