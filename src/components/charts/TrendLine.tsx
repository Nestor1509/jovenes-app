"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

function fmtMinutes(min: number) {
  const t = Math.max(0, Math.floor(Number(min || 0)));
  const h = Math.floor(t / 60);
  const m = t % 60;
  if (h <= 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function fmtChapters(v: number) {
  const n = Math.max(0, Math.floor(Number(v || 0)));
  return String(n);
}

function isISODateDay(s: string) {
  // YYYY-MM-DD
  return /^\d{4}-\d{2}-\d{2}$/.test(String(s));
}

function isISODateMonth(s: string) {
  // YYYY-MM
  return /^\d{4}-\d{2}$/.test(String(s));
}

function safeParseISOToDate(label: string) {
  // label puede ser YYYY-MM-DD o YYYY-MM
  if (isISODateDay(label)) return new Date(label + "T00:00:00");
  if (isISODateMonth(label)) return new Date(label + "-01T00:00:00");
  // fallback (no debería pasar)
  return new Date(label);
}

function fmtTickLabel(label: string) {
  if (isISODateDay(label)) {
    const dd = label.slice(8, 10);
    const mm = label.slice(5, 7);
    return `${dd}/${mm}`;
  }
  if (isISODateMonth(label)) {
    const d = safeParseISOToDate(label);
    // "Mar 26"
    const month = d.toLocaleDateString("es-MX", { month: "short" }); // ej: "mar"
    const yy = String(d.getFullYear()).slice(2);
    return `${month.charAt(0).toUpperCase()}${month.slice(1)} ${yy}`;
  }
  return String(label);
}

function fmtTooltipLabel(label: string) {
  if (isISODateDay(label)) {
    const d = safeParseISOToDate(label);
    return d.toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" });
  }
  if (isISODateMonth(label)) {
    const d = safeParseISOToDate(label);
    return d.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
  }
  return String(label);
}

export function TrendLine({
  data,
  height = 240,
}: {
  // lectura = capítulos (acumulado), oracion = minutos (acumulado)
  data: Array<{ label: string; lectura: number; oracion: number }>;
  height?: number;
}) {
  // Para controlar cuántos ticks mostrar en diario vs mensual (sin saturar)
  const firstLabel = data?.[0]?.label ?? "";
  const isDaily = isISODateDay(firstLabel);

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%" minHeight={height}>
        <LineChart data={data} margin={{ top: 10, right: 18, left: 0, bottom: 18 }}>
          <defs>
            <linearGradient id="tl_read" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(245,158,11,0.85)" />
              <stop offset="100%" stopColor="rgba(245,158,11,0.35)" />
            </linearGradient>
            <linearGradient id="tl_prayer" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(99,102,241,0.85)" />
              <stop offset="100%" stopColor="rgba(99,102,241,0.35)" />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" opacity={0.12} vertical={false} />

          <XAxis
            dataKey="label"
            tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.10)" }}
            interval="preserveStartEnd"
            minTickGap={12}
            height={36}
            tickFormatter={(v) => fmtTickLabel(String(v))}
            // En diario, si hay 30 puntos, Recharts a veces satura: permitimos omitir ticks
            // (pero conserva inicio/fin por preserveStartEnd)
            // Si quisieras aún menos, podríamos usar interval={isDaily ? "preserveStartEnd" : 0}
          />

          {/* Izquierda: capítulos */}
          <YAxis
            yAxisId="chapters"
            tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.10)" }}
            width={46}
            tickFormatter={(v) => fmtChapters(Number(v))}
          />

          {/* Derecha: minutos de oración */}
          <YAxis
            yAxisId="minutes"
            orientation="right"
            tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.10)" }}
            width={46}
            tickFormatter={(v) => fmtMinutes(Number(v))}
          />

          <Tooltip
            contentStyle={{
              background: "rgba(10,10,12,0.80)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 14,
              backdropFilter: "blur(10px)",
              color: "white",
            }}
            labelStyle={{ color: "rgba(255,255,255,0.85)" }}
            labelFormatter={(label) => fmtTooltipLabel(String(label))}
            formatter={(value: any, name) => {
              if (name === "lectura" || name === "Capítulos") return [fmtChapters(Number(value)), "Capítulos"];
              return [fmtMinutes(Number(value)), "Oración"];
            }}
          />

          <Legend
            verticalAlign="top"
            height={28}
            formatter={(value) => <span style={{ color: "rgba(255,255,255,0.75)", fontSize: 12 }}>{value}</span>}
          />

          <Line
            type="monotone"
            dataKey="lectura"
            name="Capítulos"
            yAxisId="chapters"
            stroke="url(#tl_read)"
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="oracion"
            name="Oración"
            yAxisId="minutes"
            stroke="url(#tl_prayer)"
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default TrendLine;
