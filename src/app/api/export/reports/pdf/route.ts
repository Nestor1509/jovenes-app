import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { createUserSupabase, getBearerToken } from "@/lib/supabaseServer";

type Row = {
  report_date: string;
  bible_minutes: number;
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

function drawRoundedRect(doc: InstanceType<typeof PDFDocument>, x: number, y: number, w: number, h: number, r = 8) {
  doc.roundedRect(x, y, w, h, r);
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
      .select("report_date,bible_minutes,prayer_minutes,profiles(name,role,group_id,groups(name))")
      .gte("report_date", from)
      .lte("report_date", to)
      .order("report_date", { ascending: true });

    if (groupId) {
      query = query.eq("profiles.group_id", groupId);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = (data ?? []) as Row[];

    // Resumen
    let totalBible = 0;
    let totalPrayer = 0;
    for (const r of rows) {
      totalBible += toInt(r.bible_minutes);
      totalPrayer += toInt(r.prayer_minutes);
    }
    const total = totalBible + totalPrayer;

    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const chunks: Buffer[] = [];
    doc.on("data", (d) => chunks.push(Buffer.from(d)));

    // Header
    doc.fontSize(18).font("Helvetica-Bold").text("Reporte de actividades", { align: "left" });
    doc.moveDown(0.3);
    const scope = groupId ? `Grupo` : "Todos";
    doc.fontSize(10).font("Helvetica").fillColor("#666").text(`Rango: ${from} a ${to} · Alcance: ${scope}`);
    doc.fillColor("#000");
    doc.moveDown(1);

    // Cards resumen (bonitas)
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const cardGap = 10;
    const cardW = (pageWidth - cardGap * 2) / 3;
    const cardY = doc.y;
    const cardH = 58;

    const cards = [
      { label: "Reportes", value: String(rows.length) },
      { label: "Lectura (min)", value: String(totalBible) },
      { label: "Oración (min)", value: String(totalPrayer) },
    ];

    for (let i = 0; i < cards.length; i++) {
      const x = doc.page.margins.left + i * (cardW + cardGap);
      const y = cardY;
      doc.save();
      doc.lineWidth(1).strokeColor("#e6e6e6");
      drawRoundedRect(doc, x, y, cardW, cardH, 10);
      doc.stroke();
      doc.fontSize(9).fillColor("#666").text(cards[i].label, x + 12, y + 10);
      doc.fontSize(16).fillColor("#000").font("Helvetica-Bold").text(cards[i].value, x + 12, y + 26);
      doc.restore();
    }

    doc.moveDown(4.2);

    // Tabla
    const tableTop = doc.y;
    const col = {
      date: 70,
      name: 200,
      group: 140,
      bible: 55,
      prayer: 55,
    };
    const startX = doc.page.margins.left;

    const headerY = tableTop;
    doc.save();
    doc.rect(startX, headerY, pageWidth, 22).fill("#f3f4f6");
    doc.fillColor("#111").font("Helvetica-Bold").fontSize(9);
    doc.text("Fecha", startX + 8, headerY + 6, { width: col.date - 12 });
    doc.text("Nombre", startX + col.date, headerY + 6, { width: col.name - 12 });
    doc.text("Grupo", startX + col.date + col.name, headerY + 6, { width: col.group - 12 });
    doc.text("Lec", startX + col.date + col.name + col.group, headerY + 6, { width: col.bible - 10, align: "right" });
    doc.text("Ora", startX + col.date + col.name + col.group + col.bible, headerY + 6, { width: col.prayer - 10, align: "right" });
    doc.restore();

    let y = headerY + 22;
    doc.font("Helvetica").fontSize(9).fillColor("#111");

    const rowH = 18;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (y + rowH > doc.page.height - doc.page.margins.bottom - 40) {
        doc.addPage();
        y = doc.page.margins.top;
      }

      if (i % 2 === 0) {
        doc.save();
        doc.rect(startX, y, pageWidth, rowH).fill("#fafafa");
        doc.restore();
      }

      const name = r.profiles?.name ?? "—";
      const groupName = r.profiles?.groups?.name ?? "Sin grupo";
      const bible = toInt(r.bible_minutes);
      const prayer = toInt(r.prayer_minutes);

      doc.fillColor("#111").text(r.report_date, startX + 8, y + 4, { width: col.date - 12 });
      doc.text(name, startX + col.date, y + 4, { width: col.name - 12 });
      doc.fillColor("#555").text(groupName, startX + col.date + col.name, y + 4, { width: col.group - 12 });
      doc.fillColor("#111").text(String(bible), startX + col.date + col.name + col.group, y + 4, { width: col.bible - 10, align: "right" });
      doc.text(String(prayer), startX + col.date + col.name + col.group + col.bible, y + 4, { width: col.prayer - 10, align: "right" });

      y += rowH;
    }

    // Totales
    doc.moveDown(1);
    doc.font("Helvetica-Bold").fillColor("#111");
    doc.text(`Totales · Lectura: ${totalBible} min · Oración: ${totalPrayer} min · Total: ${total} min`, { align: "left" });

    // Footer
    doc.fontSize(8).font("Helvetica").fillColor("#888");
    doc.text("Generado por Ministerio Jóvenes", 40, doc.page.height - 30, { align: "center" });

    doc.end();

    const buf = await new Promise<Buffer>((resolve) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
    });

    const filename = safeFileName(`reportes-${from}-a-${to}${groupId ? "-grupo" : ""}.pdf`);
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
