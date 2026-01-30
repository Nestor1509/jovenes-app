"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

type Item = {
  name: string;
  fullName?: string;
  value: number; // minutos o cantidad (si usas reportes)
};

function fmtValue(v: number, isCount?: boolean) {
  if (isCount) return `${Math.max(0, Math.floor(v || 0))} reportes`;
  const t = Math.max(0, Math.floor(v || 0));
  const h = Math.floor(t / 60);
  const m = t % 60;
  if (h <= 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}


export default function TopYouthBars({ data }: { data: Item[] }) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={(v) => `${Math.round(Number(v) / 60)}h`} />
          <Tooltip
            formatter={(value: any, _name: any, props: any) => fmtValue(Number(value), props?.payload?.isCount)}
            labelFormatter={(_, payload) => (payload?.[0]?.payload?.fullName ?? "")}
          />
          <Bar dataKey="value" isAnimationActive animationDuration={700} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
