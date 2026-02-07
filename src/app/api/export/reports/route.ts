import { NextResponse } from "next/server";

// Compat: antes se exportaba desde /api/export/reports
// Ahora el export es solo Excel y vive en /api/export/reports/xlsx
export async function GET(req: Request) {
  const url = new URL(req.url);
  url.pathname = url.pathname.replace(/\/api\/export\/reports\/?$/, "/api/export/reports/xlsx");
  return NextResponse.redirect(url, 302);
}
