import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token) return NextResponse.json({ error: "Falta token." }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const userId = String(body?.userId || "");
    const name = typeof body?.name === "string" ? body.name.trim() : null;
    const password = typeof body?.password === "string" ? body.password : null;

    if (!userId) return NextResponse.json({ error: "Falta userId." }, { status: 400 });
    if (!name && !password) return NextResponse.json({ error: "Nada que actualizar." }, { status: 400 });

    const { data: userRes, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userRes?.user) return NextResponse.json({ error: "Token inválido." }, { status: 401 });

    const callerId = userRes.user.id;

    const { data: callerProfile, error: profErr } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", callerId)
      .maybeSingle();

    if (profErr) return NextResponse.json({ error: profErr.message }, { status: 500 });
    if ((callerProfile as any)?.role !== "admin") return NextResponse.json({ error: "No autorizado." }, { status: 403 });

    if (name) {
      const { error } = await supabaseAdmin.from("profiles").update({ name }).eq("id", userId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (password) {
      if (password.length < 6)
        return NextResponse.json({ error: "La contraseña debe tener mínimo 6 caracteres." }, { status: 400 });
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error" }, { status: 500 });
  }
}
