import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createUserSupabase, getBearerToken } from "@/lib/supabaseServer";

type Row = {
  report_date: string;
  chapters_count: number;
  prayer_minutes: number;
  profiles?: {
    name?: string | null;
    role?: string | null;
    group_id?: string | null;
    groups?: { name?: string | null } | null;
  } | null;
};

function safeFileName(s: string) {
  return s.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function toInt(v: any) {
  const n = Math.floor(Number(v ?? 0));
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

export async function GET(req: Request) {
  try {
    const token = getBearerToken(req);
    if (!token) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

    const su = createUserSupabase(token);
    const { data: meRes, error: meErr } = await su.auth.getUser();
    if (meErr || !meRes?.user) return NextResponse.json({ error: "Sesión inválida." }, { status: 401 });

    const url = new URL(req.url);
    const from = url.searchParams.get("from") || "";
    const to = url.searchParams.get("to") || "";
    const groupIdParam = url.searchParams.get("group_id");

    if (!from || !to) return NextResponse.json({ error: "Faltan fechas (from/to)." }, { status: 400 });

    const { data: meProfile, error: pErr } = await su
      .from("profiles")
      .select("id,role,group_id,name,groups(name)")
      .eq("id", meRes.user.id)
      .maybeSingle();

    if (pErr || !meProfile) return NextResponse.json({ error: "No se pudo validar el rol." }, { status: 403 });
    const role = (meProfile as any).role as string;
    if (role !== "admin" && role !== "leader") return NextResponse.json({ error: "No autorizado." }, { status: 403 });

    let groupId: string | null = groupIdParam ? String(groupIdParam) : null;
    if (role === "leader") groupId = (meProfile as any).group_id ?? null;

    let query = su
      .from("reports")
      .select("report_date,chapters_count,prayer_minutes,profiles(name,role,group_id,groups(name))")
      .gte("report_date", from)
      .lte("report_date", to)
      .order("report_date", { ascending: true });

    if (groupId) {
      // Filtrar por grupo via relación profiles
      query = query.eq("profiles.group_id", groupId);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = (data ?? []) as Row[];

    const wb = new ExcelJS.Workbook();
    wb.creator = "Ministerio Jóvenes";
    wb.created = new Date();
    const ws = wb.addWorksheet("Reportes");

    ws.columns = [
      { header: "Fecha", key: "date", width: 12 },
      { header: "Nombre", key: "name", width: 28 },
      { header: "Rol", key: "role", width: 10 },
      { header: "Grupo", key: "group", width: 22 },
      { header: "Capítulos", key: "chapters", width: 12 },
      { header: "Oración (min)", key: "prayer", width: 14 },
    ];

    ws.getRow(1).font = { bold: true };
    ws.getRow(1).alignment = { vertical: "middle" };
    ws.autoFilter = "A1:F1";

    let totalChapters = 0;
    let totalPrayer = 0;

    for (const r of rows) {
      const chapters = toInt(r.chapters_count);
      const prayer = toInt(r.prayer_minutes);
      totalChapters += chapters;
      totalPrayer += prayer;
      ws.addRow({
        date: r.report_date,
        name: r.profiles?.name ?? "—",
        role: r.profiles?.role ?? "—",
        group: r.profiles?.groups?.name ?? "Sin grupo",
        chapters,
        prayer,
      });
    }

    // Resumen arriba (2 filas)
    ws.spliceRows(1, 0, [], []);
    ws.mergeCells("A1:F1");
    ws.getCell("A1").value = "Reporte de actividades";
    ws.getCell("A1").font = { bold: true, size: 14 };
    ws.getCell("A1").alignment = { vertical: "middle", horizontal: "center" };

    ws.mergeCells("A2:F2");
    const scope = groupId ? `Grupo: ${(meProfile as any)?.groups?.name ?? ""}` : "Todos";
    ws.getCell("A2").value = `Rango: ${from} a ${to} · Alcance: ${scope}`;
    ws.getCell("A2").font = { size: 11 };
    ws.getCell("A2").alignment = { vertical: "middle", horizontal: "center" };

    // Reaplica estilo a headers ahora en fila 3
    ws.getRow(3).font = { bold: true };
    ws.getRow(3).alignment = { vertical: "middle" };
    ws.autoFilter = "A3:F3";

    // Totales al final
    ws.addRow({});
    const tRow = ws.addRow({
      date: "",
      name: "Totales",
      role: "",
      group: "",
      chapters: totalChapters,
      prayer: totalPrayer,
    });
    tRow.font = { bold: true };

    // Promedios (sobre TOTAL del grupo / sistema, incluidos los que no reportaron)
    const youthQ = su.from("profiles").select("id", { count: "exact", head: true }).eq("role", "youth");
    const youthCountRes = groupId ? await youthQ.eq("group_id", groupId) : await youthQ;
    const youthCount = Math.max(0, Number((youthCountRes as any).count ?? 0));
    const avgChapters = youthCount ? Number((totalChapters / youthCount).toFixed(2)) : 0;
    const avgPrayer = youthCount ? Number((totalPrayer / youthCount).toFixed(2)) : 0;

    const aRow = ws.addRow({
      date: "",
      name: `Promedio por joven (n=${youthCount || 0})`,
      role: "",
      group: "",
      chapters: avgChapters,
      prayer: avgPrayer,
    });
    aRow.font = { italic: true };

    const buf = await wb.xlsx.writeBuffer();
    const filename = safeFileName(`reportes-${from}-a-${to}${groupId ? "-grupo" : ""}.xlsx`);

    return new NextResponse(Buffer.from(buf), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
