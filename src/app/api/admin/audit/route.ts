import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function serverSupabaseFromToken(token: string) {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false },
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
    }
  );
}

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const sb = serverSupabaseFromToken(token);

    const {
      data: { user },
      error: uErr,
    } = await sb.auth.getUser();

    if (uErr || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("id,role")
      .eq("id", user.id)
      .maybeSingle();

    if (!prof || prof.role !== "admin") {
      return NextResponse.json({ error: "Prohibido" }, { status: 403 });
    }

    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 200);
    const action = url.searchParams.get("action") || "";
    const q = url.searchParams.get("q") || "";

    let query = supabaseAdmin
      .from("audit_logs")
      .select("id,created_at,actor_id,action,target_user_id,target_group_id,details")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (action) query = query.eq("action", action);

    // búsqueda simple por ids (actor/target) o texto dentro de details
    if (q) {
      // PostgREST OR
      query = query.or(
        `actor_id.eq.${q},target_user_id.eq.${q},target_group_id.eq.${q},details::text.ilike.%${q}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Error" }, { status: 500 });
  }
}
