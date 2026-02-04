import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { logAuditEvent } from "@/lib/audit";

type Body = { user_id: string; report_date: string };

/**
 * Borra un reporte específico.
 * - Solo admin
 * - Identificación por (user_id, report_date)
 */
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: "Sesión inválida." }, { status: 401 });
    }

    const callerId = userData.user.id;
    const { data: callerProfile, error: profErr } = await supabaseAdmin
      .from("profiles")
      .select("role,name")
      .eq("id", callerId)
      .single();

    if (profErr || !callerProfile || callerProfile.role !== "admin") {
      return NextResponse.json({ error: "No tienes permisos de administrador." }, { status: 403 });
    }

    const body = (await req.json()) as Body;
    const userId = (body.user_id ?? "").trim();
    const reportDate = (body.report_date ?? "").trim();
    if (!userId || !reportDate) {
      return NextResponse.json({ error: "Faltan parámetros (user_id, report_date)." }, { status: 400 });
    }

    const { data: targetProfile } = await supabaseAdmin
      .from("profiles")
      .select("name")
      .eq("id", userId)
      .maybeSingle();

    const { error: delErr } = await supabaseAdmin.from("reports").delete().eq("user_id", userId).eq("report_date", reportDate);
    if (delErr) {
      return NextResponse.json({ error: delErr.message ?? "No se pudo borrar el reporte." }, { status: 400 });
    }

    await logAuditEvent({
      actor_id: callerId,
      actor_name: (callerProfile as any)?.name ?? null,
      action: "DELETE_REPORT",
      target_type: "report",
      target_id: `${userId}:${reportDate}`,
      target_name: (targetProfile as any)?.name ?? null,
      details: { user_id: userId, report_date: reportDate },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
