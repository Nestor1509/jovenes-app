import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * Admin-only endpoint to update a user's profile fields and/or reset password.
 * Client must send: Authorization: Bearer <access_token>
 * Body: { userId: string; name?: string; password?: string }
 */
export async function POST(req: Request) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    // Validate caller session
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: "Sesión inválida." }, { status: 401 });
    }

    const callerId = userData.user.id;

    // Check caller role = admin
    const roleRes = await supabaseAdmin.from("profiles").select("role").eq("id", callerId).maybeSingle();
    const role = (roleRes.data as any)?.role;
    if (roleRes.error || role !== "admin") {
      return NextResponse.json({ error: "Acceso restringido." }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const userId = String(body.userId || "");
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!userId) {
      return NextResponse.json({ error: "Falta userId." }, { status: 400 });
    }

    // Apply updates
    if (name) {
      const up = await supabaseAdmin.from("profiles").update({ name }).eq("id", userId);
      if (up.error) {
        return NextResponse.json({ error: up.error.message }, { status: 400 });
      }
    }

    if (password) {
      if (password.length < 6) {
        return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres." }, { status: 400 });
      }
      const pw = await supabaseAdmin.auth.admin.updateUserById(userId, { password });
      if (pw.error) {
        return NextResponse.json({ error: pw.error.message }, { status: 400 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Error." }, { status: 500 });
  }
}
