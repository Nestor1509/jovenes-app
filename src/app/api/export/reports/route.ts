import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function serverSupabaseFromToken(token: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    }
  );
}

function asInt(v: string | null) {
  if (!v) return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
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
      .select("id,role,group_id")
      .eq("id", user.id)
      .maybeSingle();

    if (!prof || (prof.role !== "admin" && prof.role !== "leader")) {
      return NextResponse.json({ error: "Prohibido" }, { status: 403 });
    }

    const url = new URL(req.url);
    const week = asInt(url.searchParams.get("week"));
    const month = url.searchParams.get("month"); // YYYY-MM
    const groupId = url.searchParams.get("group_id");

    // leaders: por defecto limitamos al grupo del líder
    const effectiveGroupId = prof.role === "leader" ? prof.group_id : groupId || null;

    let query = supabaseAdmin
      .from("reports")
      .select(
        "id,created_at,week,month,lectura,oracion,observaciones,user_id,profiles(name,group_id),groups(name)"
      )
      .order("created_at", { ascending: false });

    if (week !== null) query = query.eq("week", week);
    if (month) query = query.eq("month", month);

    if (effectiveGroupId) {
      query = query.eq("profiles.group_id", effectiveGroupId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Error" }, { status: 500 });
  }
}
