import { supabase } from "@/lib/supabaseClient";

export type Role = "youth" | "leader" | "admin";

export type Profile = {
  id: string;
  name: string;
  role: Role;
  group_id: string | null;
};

export async function getMyProfile() {
  const { data: sess } = await supabase.auth.getSession();
  const user = sess.session?.user;
  if (!user) return { session: null as any, profile: null as Profile | null };

  const { data: p } = await supabase
    .from("profiles")
    .select("id,name,role,group_id")
    .eq("id", user.id)
    .single();

  return { session: sess.session, profile: (p as Profile) ?? null };
}
