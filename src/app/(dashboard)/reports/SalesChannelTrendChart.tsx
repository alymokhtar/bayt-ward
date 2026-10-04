"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  SalesChannelFilter,
  SalesChannelTrendPoint,
} from "@/lib/sales-analytics";
import { formatCurrency } from "@/lib/utils";

const CHANNEL_LABELS = {
  POS: "مبيعات الفرع",
  ONLINE: "طلبات المتجر",
};

export default function SalesChannelTrendChart({
  data,
  channel,
}: {
  data: SalesChannelTrendPoint[];
  channel: SalesChannelFilter;
}) {
  const channels = channel === "ALL" ? ["POS", "ONLINE"] as const : [channel];

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-brown">اتجاه الإيرادات اليومي</h2>
      <div className="mt-2 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8dcc8" />
            <XAxis dataKey="date" tick={{ fill: "#8b7355", fontSize: 11 }} />
            <YAxis tick={{ fill: "#8b7355", fontSize: 11 }} />
            <Tooltip
              formatter={(value, name) => [formatCurrency(Number(value) || 0), CHANNEL_LABELS[name as keyof typeof CHANNEL_LABELS]]}
              contentStyle={{ direction: "rtl", borderRadius: 8 }}
            />
            {channels.map((key) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                name={key}
                stroke={key === "POS" ? "#b8860b" : "#159c8c"}
                strokeWidth={2.5}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap justify-center gap-4 text-xs">
        {channels.map((key) => (
          <span key={key} className="inline-flex items-center gap-1.5 text-muted">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: key === "POS" ? "#b8860b" : "#159c8c" }} />
            {CHANNEL_LABELS[key]}
          </span>
        ))}
      </div>
    </div>
  );
}