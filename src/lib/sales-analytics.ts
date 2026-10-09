import { getEgyptBusinessDateKey } from "@/lib/business-day";

export type SalesChannelKey = "POS" | "ONLINE";
export type SalesChannelFilter = "ALL" | SalesChannelKey;

export function getSalesChannelWhere(channel: SalesChannelFilter): { channel?: SalesChannelKey } {
  return channel === "ALL" ? {} : { channel };
}

export interface SalesChannelMetric {
  channel: SalesChannelKey;
  revenue: number;
  orders: number;
  averageOrderValue: number;
}

export interface SalesChannelAnalytics {
  total: Omit<SalesChannelMetric, "channel">;
  channels: Record<SalesChannelKey, SalesChannelMetric>;
  revenueMix: Array<SalesChannelMetric & { share: number }>;
}

export function subtractChannelReturns(
  sales: Array<{ channel: SalesChannelKey; revenue: number | null; orders: number }>,
  returns: Array<{ channel: SalesChannelKey; refundAmount: number }>,
) {
  const totals = new Map<
    SalesChannelKey,
    { revenue: number; orders: number; refundAmount: number }
  >();

  for (const sale of sales) {
    const total = totals.get(sale.channel) ?? {
      revenue: 0,
      orders: 0,
      refundAmount: 0,
    };
    total.revenue += sale.revenue ?? 0;
    total.orders += sale.orders;
    totals.set(sale.channel, total);
  }

  for (const item of returns) {
    const total = totals.get(item.channel) ?? {
      revenue: 0,
      orders: 0,
      refundAmount: 0,
    };
    total.refundAmount += item.refundAmount;
    totals.set(item.channel, total);
  }

  return [...totals].map(([channel, total]) => ({
    channel,
    revenue: total.revenue - total.refundAmount,
    orders: total.orders,
  }));
}

export function buildSalesChannelAnalytics(
  groups: Array<{ channel: SalesChannelKey; revenue: number | null; orders: number }>,
): SalesChannelAnalytics {
  const channels: Record<SalesChannelKey, SalesChannelMetric> = {
    POS: { channel: "POS", revenue: 0, orders: 0, averageOrderValue: 0 },
    ONLINE: { channel: "ONLINE", revenue: 0, orders: 0, averageOrderValue: 0 },
  };

  for (const group of groups) {
    const metric = channels[group.channel];
    metric.revenue += Number.isFinite(group.revenue) ? group.revenue ?? 0 : 0;
    metric.orders += Number.isFinite(group.orders) ? group.orders : 0;
  }

  for (const metric of Object.values(channels)) {
    metric.averageOrderValue = metric.orders > 0 ? metric.revenue / metric.orders : 0;
  }

  const revenue = channels.POS.revenue + channels.ONLINE.revenue;
  const orders = channels.POS.orders + channels.ONLINE.orders;

  return {
    total: {
      revenue,
      orders,
      averageOrderValue: orders > 0 ? revenue / orders : 0,
    },
    channels,
    revenueMix: Object.values(channels).map((metric) => ({
      ...metric,
      share: revenue > 0 ? metric.revenue / revenue : 0,
    })),
  };
}

export interface SalesChannelTrendPoint {
  date: string;
  POS: number;
  ONLINE: number;
}

export function buildNetSalesChannelTrend(
  dailyTotals: Array<{
    date: string;
    channel: SalesChannelKey;
    revenue: number;
  }>,
  channel: SalesChannelFilter,
  from: string,
  to: string,
): SalesChannelTrendPoint[] {
  const byDate = new Map<string, SalesChannelTrendPoint>();
  const start = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);

  for (
    const date = new Date(start);
    date <= end;
    date.setUTCDate(date.getUTCDate() + 1)
  ) {
    const dateKey = date.toISOString().slice(0, 10);
    byDate.set(dateKey, { date: dateKey, POS: 0, ONLINE: 0 });
  }

  for (const total of dailyTotals) {
    if (channel !== "ALL" && total.channel !== channel) continue;
    const point = byDate.get(total.date);
    if (point) point[total.channel] += total.revenue;
  }

  return [...byDate.values()];
}

export function buildSalesChannelTrend(
  sales: Array<{ channel: SalesChannelKey; totalAmount: number; createdAt: Date }>,
  channel: SalesChannelFilter,
): SalesChannelTrendPoint[] {
  const byDate = new Map<string, SalesChannelTrendPoint>();

  for (const sale of sales) {
    if (channel !== "ALL" && sale.channel !== channel) continue;
    const date = getEgyptBusinessDateKey(sale.createdAt);
    const point = byDate.get(date) ?? { date, POS: 0, ONLINE: 0 };
    point[sale.channel] += sale.totalAmount;
    byDate.set(date, point);
  }

  return [...byDate.values()].sort((first, second) => first.date.localeCompare(second.date));
}