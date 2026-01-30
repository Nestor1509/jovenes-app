import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createUserSupabase, getBearerToken } from "@/lib/supabaseServer";

// GET /api/admin/audit-logs?from=YYYY-MM-DD&to=YYYY-MM-DD&q=...&action=...&limit=50&offset=0
export async function GET(req: Request) {
  try {
    const token = getBearerToken(req);
    if (!token) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

    const su = createUserSupabase(token);
    const { data: meRes, error: meErr } = await su.auth.getUser();
    if (meErr || !meRes?.user) return NextResponse.json({ error: "Sesión inválida." }, { status: 401 });

    const meId = meRes.user.id;
    const { data: meProfile, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", meId)
      .maybeSingle();
    if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });
    if ((meProfile as any)?.role !== "admin") return NextResponse.json({ error: "No autorizado." }, { status: 403 });

    const url = new URL(req.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const q = (url.searchParams.get("q") || "").trim();
    const action = (url.searchParams.get("action") || "").trim();
    const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") || 50)));
    const offset = Math.max(0, Number(url.searchParams.get("offset") || 0));

    let query = supabaseAdmin
      .from("audit_logs")
      .select("id,created_at,actor_id,actor_name,action,target_type,target_id,target_name,details", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (from) query = query.gte("created_at", `${from}T00:00:00Z`);
    if (to) query = query.lte("created_at", `${to}T23:59:59Z`);
    if (action) query = query.eq("action", action);

    if (q) {
      // ILIKE en varios campos
      const like = `%${q.replace(/%/g, "\\%")}%`;
      query = query.or(
        `actor_name.ilike.${like},target_name.ilike.${like},action.ilike.${like},target_type.ilike.${like}`
      );
    }

    const { data, error, count } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, rows: data ?? [], count: count ?? 0 });
  } catch {
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
