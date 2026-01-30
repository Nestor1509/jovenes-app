"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { buildCSV, type ExportRow } from "@/lib/exporters";
import { buildReportsPDF } from "@/lib/pdfReport";
import { Button } from "@/components/ui";
import { Download, FileText } from "lucide-react";

type Props = {
  week?: number | null;
  month?: string | null; // YYYY-MM
  group_id?: string | null;
  label?: string;
};

function fileNameBase(params: { week?: number | null; month?: string | null }) {
  if (params.week !== null && params.week !== undefined) return `reportes-semana-${String(params.week).padStart(2, "0")}`;
  if (params.month) return `reportes-mes-${params.month}`;
  return `reportes`;
}

async function fetchRows(params: { week?: number | null; month?: string | null; group_id?: string | null }) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("No hay sesión");

  const url = new URL("/api/export/reports", window.location.origin);
  if (params.week !== null && params.week !== undefined) url.searchParams.set("week", String(params.week));
  if (params.month) url.searchParams.set("month", params.month);
  if (params.group_id) url.searchParams.set("group_id", params.group_id);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || "Error exportando");
  return (json.data || []) as ExportRow[];
}

export default function ExportReportsButtons({ week = null, month = null, group_id = null, label = "Exportar" }: Props) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const base = useMemo(() => fileNameBase({ week, month }), [week, month]);

  async function exportCSV() {
    try {
      setMsg("");
      setLoading(true);
      const rows = await fetchRows({ week, month, group_id });
      if (!rows.length) {
        setMsg("No hay datos para exportar.");
        return;
      }
      const csv = buildCSV(rows);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${base}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e: any) {
      setMsg(e?.message || "Error exportando");
    } finally {
      setLoading(false);
    }
  }

  async function exportPDF() {
    try {
      setMsg("");
      setLoading(true);
      const rows = await fetchRows({ week, month, group_id });
      if (!rows.length) {
        setMsg("No hay datos para exportar.");
        return;
      }

      const bytes = await buildReportsPDF({
        title: "Reporte de jóvenes",
        subtitle:
          week !== null && week !== undefined
            ? `Semana ${week}`
            : month
              ? `Mes ${month}`
              : "",
        rows,
      });

      const blob = new Blob([bytes], { type: "application/pdf" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${base}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e: any) {
      setMsg(e?.message || "Error exportando");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Button onClick={exportCSV} disabled={loading} className="gap-2">
        <Download size={16} /> {label} Excel
      </Button>
      <Button onClick={exportPDF} disabled={loading} variant="ghost" className="gap-2">
        <FileText size={16} /> {label} PDF
      </Button>
      {msg ? <div className="text-xs text-white/60">{msg}</div> : null}
    </div>
  );
}
