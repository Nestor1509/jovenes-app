import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Body = {
  email: string;
  password: string;
  name: string;
  role: "youth" | "leader" | "admin";
  group_id: string | null;
};

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: "Sesión inválida." }, { status: 401 });
    }

    const callerId = userData.user.id;

    const { data: callerProfile, error: profErr } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", callerId)
      .single();

    if (profErr || !callerProfile || callerProfile.role !== "admin") {
      return NextResponse.json({ error: "No tienes permisos de administrador." }, { status: 403 });
    }

    const body = (await req.json()) as Body;

    if (!body.email || !body.password || !body.name || !body.role) {
      return NextResponse.json({ error: "Faltan campos obligatorios." }, { status: 400 });
    }

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
    });

    if (createErr || !created.user) {
      return NextResponse.json({ error: createErr?.message ?? "No se pudo crear el usuario." }, { status: 400 });
    }

    const newUserId = created.user.id;

    const { error: insertErr } = await supabaseAdmin.from("profiles").insert({
      id: newUserId,
      name: body.name,
      role: body.role,
      group_id: body.group_id,
    });

    if (insertErr) {
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return NextResponse.json({ error: "No se pudo crear el perfil del usuario." }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      user_id: newUserId,
      message: "Usuario creado correctamente.",
    });
  } catch {
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
