"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";

type Item = {
  group: string;
  lectura: number; // capítulos
  oracion: number; // minutos
};

function fmtMinutes(v: number) {
  const t = Math.max(0, Math.floor(Number(v || 0)));
  const h = Math.floor(t / 60);
  const m = t % 60;
  if (h <= 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

function fmtChapters(v: number) {
  const n = Math.max(0, Math.floor(Number(v || 0)));
  return String(n);
}

function niceMaxMinutes(dataMax: number) {
  const m = Math.max(0, Number(dataMax || 0));
  const step = m <= 60 ? 10 : m <= 180 ? 30 : 60;
  return Math.ceil(m / step) * step;
}

function niceMaxCount(dataMax: number) {
  const m = Math.max(0, Number(dataMax || 0));
  const step = m <= 30 ? 5 : m <= 80 ? 10 : 20;
  return Math.ceil(m / step) * step;
}

export default function GroupCompareBars({ data }: { data: Item[] }) {
  const maxCh = niceMaxCount(Math.max(...data.map((d) => Number(d.lectura || 0))));
  const maxMin = niceMaxMinutes(Math.max(...data.map((d) => Number(d.oracion || 0))));

  return (
    <div className="w-full" style={{ height: 320 }}>
      <ResponsiveContainer width="100%" height="100%" minHeight={320}>
        <BarChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 22 }}>
          <defs>
            <linearGradient id="gcb_read" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(245,158,11,0.95)" />
              <stop offset="100%" stopColor="rgba(245,158,11,0.22)" />
            </linearGradient>
            <linearGradient id="gcb_pray" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(99,102,241,0.95)" />
              <stop offset="100%" stopColor="rgba(99,102,241,0.22)" />
            </linearGradient>
          </defs>

          <XAxis
            dataKey="group"
            tick={{ fontSize: 12, fill: "rgba(255,255,255,0.75)" }}
            tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.10)" }}
            interval="preserveStartEnd"
            minTickGap={10}
            height={36}
          />

          {/* Izquierda: capítulos */}
          <YAxis
            yAxisId="chapters"
            domain={[0, maxCh || 0]}
            tickFormatter={(v) => fmtChapters(Number(v))}
            tick={{ fontSize: 12, fill: "rgba(255,255,255,0.65)" }}
            tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.10)" }}
            width={42}
          />

          {/* Derecha: minutos */}
          <YAxis
            yAxisId="minutes"
            orientation="right"
            domain={[0, maxMin || 0]}
            tickFormatter={(v) => fmtMinutes(Number(v)).replace(" min", "m").replace(" h", "h")}
            tick={{ fontSize: 12, fill: "rgba(255,255,255,0.65)" }}
            tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.10)" }}
            width={42}
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

          <Bar
            dataKey="lectura"
            name="Capítulos"
            yAxisId="chapters"
            fill="url(#gcb_read)"
            radius={[12, 12, 6, 6]}
            maxBarSize={46}
            isAnimationActive={true}
            animationDuration={650}
            animationEasing="ease-out"
          />
          <Bar
            dataKey="oracion"
            name="Oración"
            yAxisId="minutes"
            fill="url(#gcb_pray)"
            radius={[12, 12, 6, 6]}
            maxBarSize={46}
            isAnimationActive={true}
            animationDuration={650}
            animationEasing="ease-out"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
