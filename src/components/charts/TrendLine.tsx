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
        <LineChart data={data} margin={{ top: 10, right: 18, left: 0, bottom: 18 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.12} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.10)" }}
            interval="preserveStartEnd"
            minTickGap={12}
            height={36}
          />
          <YAxis
            tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.10)" }}
            width={46}
            domain={[0, (max: number) => Math.ceil((Number(max) || 0) / 30) * 30]}
            tickFormatter={(v) => fmtMinutes(Number(v))}
          />
          <Tooltip
            formatter={(v: any, name: any) => [fmtMinutes(Number(v)), name === "bible" ? "Lectura" : "Oración"]}
            labelFormatter={(l) => `Periodo: ${l}`}
            contentStyle={{
              background: "rgba(10,10,10,0.92)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 14,
              boxShadow: "0 18px 40px rgba(0,0,0,0.55)",
            }}
            itemStyle={{ color: "rgba(255,255,255,0.88)" }}
            labelStyle={{ color: "rgba(255,255,255,0.7)" }}
            cursor={{ stroke: "rgba(255,255,255,0.08)" }}
          />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            wrapperStyle={{ color: "rgba(255,255,255,0.75)", fontSize: 12 }}
            formatter={(v: any) => (v === "bible" ? "Lectura" : v === "prayer" ? "Oración" : v)}
          />
          <Line type="monotone" dataKey="bible" stroke="rgba(245,158,11,0.95)" strokeWidth={2.5} dot={false} />
          <Line type="monotone" dataKey="prayer" stroke="rgba(99,102,241,0.95)" strokeWidth={2.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
