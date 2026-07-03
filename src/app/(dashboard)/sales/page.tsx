import SalesClient from "@/app/(dashboard)/sales/SalesClient";
import { getSales } from "@/lib/actions/sales";

interface SalesPageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}

export default async function SalesPage({ searchParams }: SalesPageProps) {
  const params = await searchParams;
  const salesResult = await getSales({
    search: params.search,
    status: params.status,
    from: params.from,
    to: params.to,
    page: params.page ? Number(params.page) : 1,
    pageSize: 50,
  });

  return (
    <SalesClient
      sales={salesResult.items}
      total={salesResult.total}
      page={salesResult.page}
      totalPages={salesResult.totalPages}
      params={{
        search: params.search,
        status: params.status,
        from: params.from,
        to: params.to,
      }}
    />
  );
}
