"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

type Item = {
  name: string;
  lectura_min: number;
  oracion_min: number;
};

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
        <BarChart data={data}>
          <XAxis dataKey="name" />
          <YAxis tickFormatter={(v) => `${Math.round(v / 60)}h`} />
          <Tooltip formatter={(value: any) => fmt(Number(value))} />
          <Bar dataKey="lectura_min" />
          <Bar dataKey="oracion_min" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
