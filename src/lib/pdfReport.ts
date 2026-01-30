import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { ExportRow } from "@/lib/exporters";

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function safe(v: any) {
  return String(v ?? "");
}

export async function buildReportsPDF(params: {
  title: string;
  subtitle?: string;
  rows: ExportRow[];
}) {
  const { title, subtitle = "", rows } = params;

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const page = pdf.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();

  // Header
  page.drawRectangle({ x: 0, y: height - 92, width, height: 92, color: rgb(0.05, 0.05, 0.07) });
  page.drawText(title, {
    x: 32,
    y: height - 50,
    size: 18,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  if (subtitle) {
    page.drawText(subtitle, {
      x: 32,
      y: height - 72,
      size: 10,
      font,
      color: rgb(0.85, 0.85, 0.9),
    });
  }

  // Summary
  const totalLectura = rows.reduce((a, r) => a + Number(r.lectura ?? 0), 0);
  const totalOracion = rows.reduce((a, r) => a + Number(r.oracion ?? 0), 0);
  const total = rows.length;

  const summaryY = height - 120;
  page.drawText(`Registros: ${total}   |   Lectura total: ${totalLectura} min   |   Oración total: ${totalOracion} min`, {
    x: 32,
    y: summaryY,
    size: 10,
    font,
    color: rgb(0.2, 0.2, 0.25),
  });

  // Table
  const startY = summaryY - 24;
  const rowH = 16;
  const colX = [32, 120, 210, 360, 430, 500];

  const header = ["Fecha", "Nombre", "Grupo", "Lectura", "Oración", "Semana"];
  for (let i = 0; i < header.length; i++) {
    page.drawText(header[i], {
      x: colX[i],
      y: startY,
      size: 9,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.25),
    });
  }

  let y = startY - 12;
  const maxRows = Math.floor((y - 60) / rowH);
  const slice = rows.slice(0, maxRows);

  slice.forEach((r, idx) => {
    const bg = idx % 2 === 0 ? rgb(0.98, 0.98, 0.99) : rgb(0.94, 0.94, 0.96);
    page.drawRectangle({ x: 28, y: y - 2, width: width - 56, height: rowH, color: bg });

    const vals = [
      fmtDate(r.created_at).slice(0, 16),
      safe(r.profiles?.name),
      safe(r.groups?.name),
      safe(r.lectura),
      safe(r.oracion),
      safe(r.week),
    ];

    for (let i = 0; i < vals.length; i++) {
      page.drawText(vals[i].slice(0, i === 1 ? 20 : 16), {
        x: colX[i],
        y,
        size: 9,
        font,
        color: rgb(0.15, 0.15, 0.2),
      });
    }

    y -= rowH;
  });

  page.drawText("Generado por Ministerio Águilas", {
    x: 32,
    y: 24,
    size: 9,
    font,
    color: rgb(0.4, 0.4, 0.45),
  });

  const bytes = await pdf.save();
  return new Uint8Array(bytes);
}
