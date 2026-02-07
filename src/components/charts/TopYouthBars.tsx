"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

type Unit = "minutes" | "chapters" | "reports";

type Item = {
  name: string;
  fullName?: string;
  value: number;
  unit?: Unit; // por defecto minutes
};

function fmtMinutesShort(min: number) {
  const t = Math.max(0, Math.floor(Number(min || 0)));
  const h = Math.floor(t / 60);
  const m = t % 60;
  if (h <= 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function fmtMinutesLong(min: number) {
  const t = Math.max(0, Math.floor(Number(min || 0)));
  const h = Math.floor(t / 60);
  const m = t % 60;
  if (h <= 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

function niceMax(dataMax: number) {
  const m = Math.max(0, Number(dataMax || 0));
  const step = m <= 10 ? 2 : m <= 60 ? 10 : m <= 180 ? 30 : 60;
  return Math.ceil(m / step) * step;
}

function tickFormatter(v: number, unit: Unit) {
  if (unit === "chapters") return `${Math.round(Math.max(0, v))}`;
  if (unit === "reports") return `${Math.round(Math.max(0, v))}`;
  return fmtMinutesShort(v);
}

function tooltipValue(v: number, unit: Unit) {
  if (unit === "chapters") return `${Math.max(0, Math.floor(v || 0))} capítulos`;
  if (unit === "reports") return `${Math.max(0, Math.floor(v || 0))} reportes`;
  return fmtMinutesLong(v);
}

function tooltipLabel(unit: Unit) {
  if (unit === "chapters") return "Capítulos";
  if (unit === "reports") return "Reportes";
  return "Minutos";
}

export default function TopYouthBars({ data }: { data: Item[] }) {
  const unit: Unit = (data?.[0]?.unit as Unit) || "minutes";
  const max = niceMax(Math.max(0, ...data.map((d) => Number(d.value || 0))));

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
            tickFormatter={(v) => tickFormatter(Number(v), unit)}
            tick={{ fontSize: 12, fill: "rgba(255,255,255,0.65)" }}
            tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.10)" }}
            width={40}
            allowDecimals={false}
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
            formatter={(value: any) => [tooltipValue(Number(value), unit), tooltipLabel(unit)]}
          />

          <Bar dataKey="value" fill="url(#tyb_value)" radius={[12, 12, 6, 6]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
