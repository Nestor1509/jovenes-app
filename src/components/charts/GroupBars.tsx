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
  const max = niceMax(
    Math.max(
      ...data.map((d) => Math.max(Number(d.lectura_min || 0), Number(d.oracion_min || 0)))
    )
  );

  return (
    <div className="w-full" style={{ height: 288 }}>
      <ResponsiveContainer width="100%" height="100%" minHeight={288}>
        <BarChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 22 }}>
          <defs>
            <linearGradient id="gb_read" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(245,158,11,0.95)" />
              <stop offset="100%" stopColor="rgba(245,158,11,0.25)" />
            </linearGradient>
            <linearGradient id="gb_pray" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(99,102,241,0.95)" />
              <stop offset="100%" stopColor="rgba(99,102,241,0.25)" />
            </linearGradient>
          </defs>

          <XAxis
            dataKey="name"
            tick={{ fontSize: 12, fill: "rgba(255,255,255,0.75)" }}
            tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.10)" }}
            interval="preserveStartEnd"
            minTickGap={10}
            height={36}
          />
          <YAxis
            domain={[0, max || 0]}
            tickFormatter={fmtDurationTick}
            tick={{ fontSize: 12, fill: "rgba(255,255,255,0.65)" }}
            tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.10)" }}
            width={40}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.06)" }}
            contentStyle={{
              background: "rgba(10,10,12,0.80)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 14,
              backdropFilter: "blur(10px)",
              color: "white",
            }}
            labelStyle={{ color: "rgba(255,255,255,0.85)" }}
            formatter={(value: any, name) => [fmt(Number(value)), name === "lectura_min" ? "Lectura" : "Oración"]}
          />
          <Bar
            dataKey="lectura_min"
            name="Lectura"
            fill="url(#gb_read)"
            radius={[12, 12, 6, 6]}
            maxBarSize={52}
          />
          <Bar
            dataKey="oracion_min"
            name="Oración"
            fill="url(#gb_pray)"
            radius={[12, 12, 6, 6]}
            maxBarSize={52}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
