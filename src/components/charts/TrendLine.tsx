"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

function fmtMinutes(min: number) {
  const t = Math.max(0, Math.floor(Number(min || 0)));
  const h = Math.floor(t / 60);
  const m = t % 60;
  if (h <= 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export default function TrendLine({
  data,
  height = 240,
}: {
  data: Array<{ label: string; bible: number; prayer: number }>;
  height?: number;
}) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 14, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
          <XAxis dataKey="label" tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 12 }} />
          <YAxis
            tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 12 }}
            tickFormatter={(v) => fmtMinutes(Number(v))}
          />
          <Tooltip
            formatter={(v: any, name: any) => [fmtMinutes(Number(v)), name === "bible" ? "Lectura" : "Oración"]}
            labelFormatter={(l) => `Periodo: ${l}`}
            contentStyle={{
              background: "rgba(10,10,10,0.9)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 12,
            }}
            itemStyle={{ color: "rgba(255,255,255,0.85)" }}
            labelStyle={{ color: "rgba(255,255,255,0.7)" }}
          />
          <Line type="monotone" dataKey="bible" strokeWidth={2.5} dot={false} />
          <Line type="monotone" dataKey="prayer" strokeWidth={2.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
