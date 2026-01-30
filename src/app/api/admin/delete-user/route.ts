import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { logAuditEvent } from "@/lib/audit";

type Body = { user_id: string };

/**
 * Elimina una persona (auth + perfil + reportes).
 * - Solo admin
 * - Bloquea borrar admins y bloquear auto-borrado por seguridad.
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
    if (!userId) return NextResponse.json({ error: "Falta user_id." }, { status: 400 });

    if (userId === callerId) {
      return NextResponse.json({ error: "No puedes eliminar tu propia cuenta desde aquí." }, { status: 400 });
    }

    // Evitar que un admin elimine a otro admin por accidente.
    const { data: targetProfile, error: targetErr } = await supabaseAdmin
      .from("profiles")
      .select("role,name")
      .eq("id", userId)
      .maybeSingle();

    if (targetErr) {
      return NextResponse.json({ error: targetErr.message ?? "No se pudo validar el usuario." }, { status: 400 });
    }

    if (targetProfile?.role === "admin") {
      return NextResponse.json({ error: "Por seguridad, no se permite eliminar cuentas admin." }, { status: 400 });
    }

    // Borrar reportes (si existe FK con cascade igual es OK)
    const { error: repErr } = await supabaseAdmin.from("reports").delete().eq("user_id", userId);
    if (repErr) {
      return NextResponse.json({ error: repErr.message ?? "No se pudieron eliminar los reportes." }, { status: 400 });
    }

    // Borrar perfil (si existe FK al auth.users con cascade, igual es OK)
    await supabaseAdmin.from("profiles").delete().eq("id", userId);

    const { error: delAuthErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (delAuthErr) {
      return NextResponse.json({ error: delAuthErr.message ?? "No se pudo eliminar la cuenta." }, { status: 400 });
    }

    await logAuditEvent({
      actor_id: callerId,
      actor_name: (callerProfile as any)?.name ?? null,
      action: "DELETE_USER",
      target_type: "user",
      target_id: userId,
      target_name: (targetProfile as any)?.name ?? null,
      details: { safe: true },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
