"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Profile } from "@/lib/useMyProfile";

type AuthCtx = {
  loading: boolean;
  session: any | null;
  profile: Profile | null;
  error: string;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};


function withTimeout<T>(p: Promise<T>, ms = 8000, msg = "Tiempo de espera agotado. Revisa tu conexión o Supabase.") {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(msg)), ms)),
  ]);
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState("");

  const loadProfile = useCallback(async (userId: string) => {
    const { data: p, error: pErr } = await withTimeout<{ data: Profile | null; error: any }>(
      supabase
        .from("profiles")
        .select("id,name,role,group_id")
        .eq("id", userId)
        .maybeSingle() as unknown as Promise<{ data: Profile | null; error: any }>,
      8000
    );

    if (pErr) throw new Error(pErr.message);
    return (p as Profile) ?? null;
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

      const p = await loadProfile(s.user.id);
      setProfile(p);
      setLoading(false);
    } catch (e: any) {
      setProfile(null);
      setError(e?.message ? String(e.message) : "No se pudo cargar tu perfil.");
      setLoading(false);
    }
  }, [loadProfile]);

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
        const p = await loadProfile(sess.user.id);
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
  }, [refresh, loadProfile]);

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
