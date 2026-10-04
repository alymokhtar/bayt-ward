import SalesClient from "@/app/(dashboard)/sales/SalesClient";
import { getSales, getSalesChannelAnalytics } from "@/lib/actions/sales";
import type { SalesChannelFilter } from "@/lib/sales-analytics";

interface SalesPageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    from?: string;
    to?: string;
    channel?: string;
    page?: string;
  }>;
}

export default async function SalesPage({ searchParams }: SalesPageProps) {
  const params = await searchParams;
  const channel: SalesChannelFilter = params.channel === "POS" || params.channel === "ONLINE"
    ? params.channel
    : "ALL";
  const [salesResult, channelAnalytics] = await Promise.all([
    getSales({
      search: params.search,
      status: params.status,
      channel,
      from: params.from,
      to: params.to,
      page: params.page ? Number(params.page) : 1,
      pageSize: 50,
    }),
    getSalesChannelAnalytics(params.from, params.to),
  ]);

  return (
    <SalesClient
      sales={salesResult.items}
      total={salesResult.total}
      page={salesResult.page}
      totalPages={salesResult.totalPages}
      channelAnalytics={channelAnalytics}
      params={{
        search: params.search,
        status: params.status,
        from: params.from,
        to: params.to,
        channel,
      }}
    />
  );
}
