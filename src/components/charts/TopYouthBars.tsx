"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

type Item = {
  name: string;
  fullName?: string;
  value: number; // minutos o cantidad
  isCount?: boolean;
};

function fmtDurationTick(v: number, isCount?: boolean) {
  const n = Math.max(0, Number(v || 0));
  if (isCount) return `${Math.round(n)}`;
  if (n < 60) return `${Math.round(n)}m`;
  const h = n / 60;
  if (Math.abs(h - Math.round(h)) < 1e-6) return `${Math.round(h)}h`;
  return `${h.toFixed(1)}h`;
}

function niceMax(dataMax: number) {
  const m = Math.max(0, Number(dataMax || 0));
  const step = m <= 10 ? 2 : m <= 60 ? 10 : m <= 180 ? 30 : 60;
  return Math.ceil(m / step) * step;
}

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
  const isCount = !!data?.[0]?.isCount;
  const max = niceMax(Math.max(...data.map((d) => Number(d.value || 0))));

  return (
    <div className="w-full" style={{ height: 320 }}>
      <ResponsiveContainer width="100%" height="100%" minHeight={320}>
        <BarChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 22 }}>
          <defs>
            <linearGradient id="tyb_value" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(16,185,129,0.95)" />
              <stop offset="100%" stopColor="rgba(16,185,129,0.22)" />
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
            tickFormatter={(v) => fmtDurationTick(Number(v), isCount)}
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
            labelFormatter={(_, payload) => {
              const item = payload?.[0]?.payload as Item | undefined;
              return item?.fullName || item?.name || "";
            }}
            formatter={(value: any) => [fmtValue(Number(value), isCount), isCount ? "Reportes" : "Minutos"]}
          />

          <Bar dataKey="value" fill="url(#tyb_value)" radius={[12, 12, 6, 6]} maxBarSize={48}  isAnimationActive={true} animationDuration={650} animationEasing="ease-out" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
