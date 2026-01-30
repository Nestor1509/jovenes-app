import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { logAuditEvent } from "@/lib/audit";

type Body = { group_id: string };

/**
 * Elimina un grupo.
 * - Solo admin
 * - Antes de borrar, desasigna a las personas (group_id -> null)
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
    const groupId = (body.group_id ?? "").trim();
    if (!groupId) return NextResponse.json({ error: "Falta group_id." }, { status: 400 });

    const { data: groupRow } = await supabaseAdmin.from("groups").select("id,name").eq("id", groupId).maybeSingle();

    // Desasignar personas del grupo antes de borrar (evita FK errors si no hay ON DELETE SET NULL)
    const { error: updErr } = await supabaseAdmin
      .from("profiles")
      .update({ group_id: null })
      .eq("group_id", groupId);

    if (updErr) {
      return NextResponse.json({ error: updErr.message ?? "No se pudo desasignar el grupo." }, { status: 400 });
    }

    const { error: delErr } = await supabaseAdmin.from("groups").delete().eq("id", groupId);
    if (delErr) {
      return NextResponse.json({ error: delErr.message ?? "No se pudo eliminar el grupo." }, { status: 400 });
    }

    await logAuditEvent({
      actor_id: callerId,
      actor_name: (callerProfile as any)?.name ?? null,
      action: "DELETE_GROUP",
      target_type: "group",
      target_id: groupId,
      target_name: (groupRow as any)?.name ?? null,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
