import ReportsClient from "@/app/(dashboard)/reports/ReportsClient";
import { Card, CardContent } from "@/components/ui/Card";
import {
  getSalesReport,
  getInventoryReport,
  getProfitReport,
  getTopProducts,
} from "@/lib/actions/reports";

interface ReportsPageProps {
  searchParams: Promise<{
    tab?: string;
    from?: string;
    to?: string;
  }>;
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const params = await searchParams;
  const activeTab = params.tab || "sales";

  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const defaultTo = now.toISOString().split("T")[0];
  const from = params.from || defaultFrom;
  const to = params.to || defaultTo;

  const fromDate = new Date(from);
  const toDate = new Date(to + "T23:59:59");

  const [salesReport, inventoryReport, profitReport, topProducts] =
    await Promise.all([
      getSalesReport(fromDate, toDate),
      getInventoryReport(),
      getProfitReport(fromDate, toDate),
      getTopProducts(fromDate, toDate),
    ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brown">التقارير</h1>
        <p className="text-sm text-muted mt-1">تحليلات وإحصائيات المتجر</p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <ReportsClient
            activeTab={activeTab}
            from={from}
            to={to}
            salesReport={salesReport!}
            inventoryReport={inventoryReport!}
            profitReport={profitReport!}
            topProducts={topProducts!}
          />
        </CardContent>
      </Card>
    </div>
  );
}
