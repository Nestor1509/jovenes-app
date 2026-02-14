"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

type Unit = "chapters" | "minutes" | "reports";

type Row = {
  name: string;
  fullName?: string;
  value: number;
  unit?: Unit;
};

function formatMinutesTick(v: number) {
  const n = Math.max(0, Number(v || 0));
  if (n < 60) return `${Math.round(n)}m`;
  const h = n / 60;
  if (Math.abs(h - Math.round(h)) < 1e-6) return `${Math.round(h)}h`;
  return `${h.toFixed(1)}h`;
}

function formatMinutesValue(v: number) {
  const t = Math.max(0, Math.floor(Number(v || 0)));
  const h = Math.floor(t / 60);
  const m = t % 60;
  if (h <= 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

function formatCount(v: number) {
  return Math.max(0, Math.floor(Number(v || 0))).toLocaleString("es-CO");
}

function niceMaxCount(v: number) {
  const m = Math.max(0, Number(v || 0));
  const step = m <= 10 ? 2 : m <= 50 ? 5 : m <= 200 ? 20 : 50;
  return Math.ceil(m / step) * step;
}

function niceMaxMinutes(v: number) {
  const m = Math.max(0, Number(v || 0));
  const step = m <= 10 ? 2 : m <= 60 ? 10 : m <= 180 ? 30 : 60;
  return Math.ceil(m / step) * step;
}

export default function TopYouthBars({ data }: { data: Row[] }) {
  const unit: Unit = (data?.[0]?.unit as Unit) || "minutes";

  const max =
    unit === "minutes"
      ? niceMaxMinutes(Math.max(...data.map((d) => Number(d.value || 0))))
      : niceMaxCount(Math.max(...data.map((d) => Number(d.value || 0))));

  const seriesLabel = unit === "chapters" ? "Capítulos" : unit === "reports" ? "Reportes" : "Oración";

  return (
    <div className="w-full" style={{ height: 320 }}>
      <ResponsiveContainer width="100%" height="100%" minHeight={320}>
        <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 24 }}>
          <defs>
            <linearGradient id="topbars" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(16,185,129,0.95)" />
              <stop offset="100%" stopColor="rgba(16,185,129,0.22)" />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" opacity={0.12} />

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
            tickFormatter={(v) => (unit === "minutes" ? formatMinutesTick(Number(v)) : String(Math.round(Number(v))))}
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
            labelFormatter={(_, payload) => {
              const item = payload?.[0]?.payload as Row | undefined;
              return item?.fullName || item?.name || "";
            }}
            formatter={(value: any) => {
              const n = Number(value || 0);
              if (unit === "minutes") return [formatMinutesValue(n), seriesLabel];
              return [formatCount(n), seriesLabel];
            }}
          />

          <Bar dataKey="value" fill="url(#topbars)" radius={[12, 12, 6, 6]} maxBarSize={52} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
