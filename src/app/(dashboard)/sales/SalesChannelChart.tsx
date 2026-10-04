"use client";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { SalesChannelAnalytics } from "@/lib/sales-analytics";
import { formatCurrency } from "@/lib/utils";

const COLORS = ["#b8860b", "#159c8c"];

export default function SalesChannelChart({
  data,
}: {
  data: SalesChannelAnalytics["revenueMix"];
}) {
  const chartData = data.map((item) => ({
    ...item,
    label: item.channel === "POS" ? "مبيعات الفرع" : "طلبات المتجر",
  }));
  const totalRevenue = chartData.reduce((total, item) => total + (Number.isFinite(item.revenue) ? item.revenue : 0), 0);

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-brown">توزيع الإيرادات حسب القناة</h2>
      <div className="mt-2 h-52">
        {totalRevenue > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="revenue"
                nameKey="label"
                innerRadius="58%"
                outerRadius="82%"
                paddingAngle={3}
                stroke="none"
              >
                {chartData.map((entry, index) => (
                  <Cell key={entry.channel} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, _name, item) => [
                  `${formatCurrency(Number(value) || 0)} · ${item?.payload?.orders ?? 0} فاتورة`,
                  item?.payload?.label ?? "القناة",
                ]}
                contentStyle={{ direction: "rtl", borderRadius: 8 }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted">
            لا توجد إيرادات لعرضها في هذه الفترة
          </div>
        )}
      </div>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs">
        {chartData.map((item, index) => (
          <span key={item.channel} className="inline-flex items-center gap-1.5 text-muted">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
            {item.label} · {(item.share * 100).toFixed(1)}%
          </span>
        ))}
      </div>
    </div>
  );
}