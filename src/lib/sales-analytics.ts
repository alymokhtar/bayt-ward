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