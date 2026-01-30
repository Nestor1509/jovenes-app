export type ExportRow = {
  created_at: string;
  week: number;
  month: string;
  lectura: number;
  oracion: number;
  observaciones: string | null;
  user_id: string;
  profiles?: { name?: string | null; group_id?: string | null } | null;
  groups?: { name?: string | null } | null;
};

function esc(v: any) {
  const s = String(v ?? "");
  if (s.includes(",") || s.includes("\n") || s.includes('"')) {
    return `"${s.replaceAll('"', '""')}"`;
  }
  return s;
}

export function buildCSV(rows: ExportRow[]) {
  const header = [
    "Fecha",
    "Semana",
    "Mes",
    "Nombre",
    "Grupo",
    "Lectura",
    "Oración",
    "Observaciones",
  ];

  const lines = [header.join(",")];

  for (const r of rows) {
    lines.push(
      [
        new Date(r.created_at).toLocaleString(),
        r.week,
        r.month,
        r.profiles?.name ?? "",
        r.groups?.name ?? "",
        r.lectura,
        r.oracion,
        r.observaciones ?? "",
      ].map(esc).join(",")
    );
  }

  return lines.join("\n");
}
