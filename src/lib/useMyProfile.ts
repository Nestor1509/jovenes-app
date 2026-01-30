"use client";

import type { Session } from "@supabase/supabase-js";
import { useAuth } from "@/lib/auth";

export type Role = "youth" | "leader" | "admin";
export type Profile = { id: string; name: string; role: Role; group_id: string | null };

export function useMyProfile() {
  const { loading, session, profile, error, refresh } = useAuth();
  return { loading, session: session as Session | null, profile, error, refresh };
}
