"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

type Item = {
  name: string;
  lectura_min: number;
  oracion_min: number;
};

function fmtDurationTick(v: number) {
  const n = Math.max(0, Number(v || 0));
  if (n < 60) return `${Math.round(n)}m`;
  const h = n / 60;
  if (Math.abs(h - Math.round(h)) < 1e-6) return `${Math.round(h)}h`;
  return `${h.toFixed(1)}h`;
}

function niceMax(dataMax: number) {
  const m = Math.max(0, Number(dataMax || 0));
  const step = m <= 60 ? 10 : m <= 180 ? 30 : 60;
  return Math.ceil(m / step) * step;
}

function fmt(min: number) {
  const t = Math.max(0, Math.floor(min || 0));
  const h = Math.floor(t / 60);
  const m = t % 60;
  if (h <= 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

export default function GroupBars({ data }: { data: Item[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 22 }}>
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12, fill: "rgba(255,255,255,0.75)" }}
            tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.10)" }}
            interval={0}
            angle={-18}
            textAnchor="end"
            height={44}
          />
          <YAxis
            width={46}
            tick={{ fontSize: 12, fill: "rgba(255,255,255,0.75)" }}
            tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.10)" }}
            domain={[0, (max: number) => niceMax(Number(max))]}
            tickFormatter={(v) => fmtDurationTick(Number(v))}
          />
          <Tooltip
            formatter={(value: any, name: any) => [fmt(Number(value)), name === "lectura_min" ? "Lectura" : "Oración"]}
            contentStyle={{
              background: "rgba(10,10,10,0.92)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 14,
            }}
            itemStyle={{ color: "rgba(255,255,255,0.88)" }}
            labelStyle={{ color: "rgba(255,255,255,0.7)" }}
          />
          <Bar dataKey="lectura_min" fill="rgba(245,158,11,0.85)" radius={[10, 10, 0, 0]} isAnimationActive animationDuration={650} />
          <Bar dataKey="oracion_min" fill="rgba(99,102,241,0.85)" radius={[10, 10, 0, 0]} isAnimationActive animationDuration={650} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
