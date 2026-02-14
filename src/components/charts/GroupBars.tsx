"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

type Item = {
  name: string;
  lectura: number;   // capítulos
  oracion: number;   // minutos
};

function formatMinutes(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h <= 0) return `${m} min`;
  if (m <= 0) return `${h} h`;
  return `${h} h ${m} min`;
}

function niceMaxCount(v: number) {
  if (!v || v <= 0) return 5;
  return Math.ceil(v / 5) * 5;
}

function niceMaxMinutes(v: number) {
  if (!v || v <= 0) return 60;
  return Math.ceil(v / 60) * 60;
}

export default function GroupBars({ data }: { data: Item[] }) {
  const maxCh = niceMaxCount(
    Math.max(...data.map((d) => Number(d.lectura ?? 0)))
  );

  const maxMin = niceMaxMinutes(
    Math.max(...data.map((d) => Number(d.oracion ?? 0)))
  );

  return (
    <div style={{ width: "100%", height: 360 }}>
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="name" />

          {/* Eje izquierdo → Capítulos */}
          <YAxis
            yAxisId="left"
            domain={[0, maxCh]}
            label={{
              value: "Capítulos",
              angle: -90,
              position: "insideLeft",
            }}
          />

          {/* Eje derecho → Oración */}
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[0, maxMin]}
            tickFormatter={(v) => formatMinutes(Number(v))}
            label={{
              value: "Oración",
              angle: 90,
              position: "insideRight",
            }}
          />

          <Tooltip
            formatter={(value, name) => {
              if (name === "Oración") {
                return formatMinutes(Number(value));
              }
              return Number(value);
            }}
          />

          <Legend />

          <Bar
            yAxisId="left"
            dataKey="lectura"
            name="Capítulos"
            radius={[8, 8, 0, 0]}
          />

          <Bar
            yAxisId="right"
            dataKey="oracion"
            name="Oración"
            radius={[8, 8, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
