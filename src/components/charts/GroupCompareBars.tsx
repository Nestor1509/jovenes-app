"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";

type Item = {
  group: string;
  lectura: number; // minutos
  oracion: number; // minutos
};

function fmt(min: number) {
  const t = Math.max(0, Math.floor(min || 0));
  const h = Math.floor(t / 60);
  const m = t % 60;
  if (h <= 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

export default function GroupCompareBars({ data }: { data: Item[] }) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis dataKey="group" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={(v) => `${Math.round(Number(v) / 60)}h`} />
          <Tooltip formatter={(value: any) => fmt(Number(value))} />
          <Legend />
          <Bar dataKey="lectura" isAnimationActive animationDuration={700} />
          <Bar dataKey="oracion" isAnimationActive animationDuration={700} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
