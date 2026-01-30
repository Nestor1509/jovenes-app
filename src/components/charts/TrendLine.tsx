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
      <ResponsiveContainer width="100%" height="100%" minHeight={height}>
        <LineChart data={data} margin={{ top: 10, right: 18, left: 0, bottom: 18 }}>
          <defs>
            <linearGradient id="tl_bible" x1="0" y1="0" x2="1" y2="0">
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
          />
          <YAxis
            tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.10)" }}
            width={40}
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
            formatter={(value: any, name) => [fmtMinutes(Number(value)), name === "bible" ? "Lectura" : "Oración"]}
          />
          <Legend
            verticalAlign="top"
            height={28}
            formatter={(value) => <span style={{ color: "rgba(255,255,255,0.75)", fontSize: 12 }}>{value}</span>}
          />
          <Line
            type="monotone"
            dataKey="bible"
            name="Lectura"
            stroke="url(#tl_bible)"
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="prayer"
            name="Oración"
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
