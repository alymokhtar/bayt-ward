"use client";

import { useEffect, useState } from "react";
import { formatEgyptChartDateLabel } from "@/lib/business-day";
import { THEME_ACCENT_CHANGED_EVENT } from "@/lib/theme-client";
import { formatNumber } from "@/lib/utils";

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

function getChartAccentColor() {
  if (typeof window === "undefined") return "var(--color-gold)";

  const root = document.querySelector<HTMLElement>(".system-layout") ?? document.documentElement;
  const computed = getComputedStyle(root).getPropertyValue("--color-gold").trim();
  return computed || "var(--color-gold)";
}

export default function SalesChart({ data }: SalesChartProps) {
  const [barFill, setBarFill] = useState(() => getChartAccentColor());
  const chartData = data.map((d) => ({
    ...d,
    label: formatEgyptChartDateLabel(d.date),
  }));

  useEffect(() => {
    const syncBarFill = () => setBarFill(getChartAccentColor());

    syncBarFill();

    window.addEventListener(THEME_ACCENT_CHANGED_EVENT, syncBarFill);

    const root = document.querySelector<HTMLElement>(".system-layout") ?? document.documentElement;
    const observer = new MutationObserver(syncBarFill);
    observer.observe(root, { attributes: true, attributeFilter: ["style"] });

    return () => {
      window.removeEventListener(THEME_ACCENT_CHANGED_EVENT, syncBarFill);
      observer.disconnect();
    };
  }, []);

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
                ? `${formatNumber(num)} ج.م`
                : num,
              label === "total" ? "المبيعات" : "العدد",
            ];
          }}
          labelFormatter={(label) => label}
        />
        <Bar dataKey="total" fill={barFill} radius={[6, 6, 0, 0]} name="total" />
      </BarChart>
    </ResponsiveContainer>
  );
}
