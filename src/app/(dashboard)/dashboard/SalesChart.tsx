"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface SalesChartProps {
  data: { date: string; total: number; count: number }[];
}

export default function SalesChart({ data }: SalesChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString("ar-EG", {
      weekday: "short",
      day: "numeric",
    }),
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e8dcc8" />
        <XAxis
          dataKey="label"
          tick={{ fill: "#8b7355", fontSize: 12 }}
          axisLine={{ stroke: "#e8dcc8" }}
        />
        <YAxis
          tick={{ fill: "#8b7355", fontSize: 12 }}
          axisLine={{ stroke: "#e8dcc8" }}
          tickFormatter={(v) => `${v}`}
        />
        <Tooltip
          contentStyle={{
            background: "#fff",
            border: "1px solid #e8dcc8",
            borderRadius: "8px",
            fontFamily: "inherit",
            direction: "rtl",
          }}
          formatter={(value, name) => {
            const num = Number(value) || 0;
            const label = String(name);
            return [
              label === "total"
                ? `${num.toLocaleString("ar-EG")} ج.م`
                : num,
              label === "total" ? "المبيعات" : "العدد",
            ];
          }}
          labelFormatter={(label) => label}
        />
        <Bar dataKey="total" fill="var(--color-gold)" radius={[6, 6, 0, 0]} name="total" />
      </BarChart>
    </ResponsiveContainer>
  );
}
