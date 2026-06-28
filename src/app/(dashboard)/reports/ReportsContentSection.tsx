import LowStockReportPanel from "@/app/(dashboard)/reports/LowStockReportPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import {
  getInventoryReport,
  getProfitReport,
  getSalesReport,
  getTopProducts,
} from "@/lib/actions/reports";
import { formatCurrency, getPaymentMethodLabel } from "@/lib/utils";

interface ReportsContentSectionProps {
  activeTab: string;
  from: string;
  to: string;
}

export default async function ReportsContentSection({
  activeTab,
  from,
  to,
}: ReportsContentSectionProps) {
  if (activeTab === "sales") {
    const salesReport = await getSalesReport(from, to);
    if (!salesReport) return null;

    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="إجمالي المبيعات"
            value={formatCurrency(salesReport.totalSales)}
          />
          <StatCard
            title="صافي المبيعات"
            value={formatCurrency(salesReport.netSales)}
          />
          <StatCard
            title="المرتجعات"
            value={formatCurrency(salesReport.totalReturns)}
          />
          <StatCard
            title="المصروفات"
            value={formatCurrency(salesReport.totalExpenses)}
          />
          <StatCard
            title="عدد الفواتير"
            value={salesReport.salesCount.toString()}
          />
          <StatCard
            title="متوسط الفاتورة"
            value={formatCurrency(salesReport.averageSale)}
          />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>حسب طريقة الدفع</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الطريقة</TableHead>
                  <TableHead>العدد</TableHead>
                  <TableHead>الإجمالي</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesReport.byPaymentMethod.map((item) => (
                  <TableRow key={item.method}>
                    <TableCell>{getPaymentMethodLabel(item.method)}</TableCell>
                    <TableCell>{item.count}</TableCell>
                    <TableCell className="font-medium text-gold">
                      {formatCurrency(item.total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (activeTab === "inventory") {
    const inventoryReport = await getInventoryReport();
    if (!inventoryReport) return null;

    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="إجمالي القطع"
            value={inventoryReport.totalItems.toString()}
          />
          <StatCard
            title="قيمة التكلفة"
            value={formatCurrency(inventoryReport.totalCostValue)}
          />
          <StatCard
            title="قيمة البيع"
            value={formatCurrency(inventoryReport.totalRetailValue)}
          />
          <StatCard
            title="الربح المحتمل"
            value={formatCurrency(inventoryReport.potentialProfit)}
          />
        </div>
        <LowStockReportPanel
          items={inventoryReport.lowStockItems}
          totalCount={inventoryReport.lowStockCount}
        />
      </div>
    );
  }

  if (activeTab === "profit") {
    const profitReport = await getProfitReport(from, to);
    if (!profitReport) return null;

    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard title="إجمالي الإيرادات" value={formatCurrency(profitReport.revenue)} />
        <StatCard
          title="المرتجعات"
          value={formatCurrency(profitReport.totalReturns)}
        />
        <StatCard
          title="الإيرادات الصافية"
          value={formatCurrency(profitReport.netRevenue)}
        />
        <StatCard
          title="تكلفة البضاعة"
          value={formatCurrency(profitReport.costOfGoodsSold)}
        />
        <StatCard
          title="إجمالي الربح"
          value={formatCurrency(profitReport.grossProfit)}
        />
        <StatCard
          title="المصروفات"
          value={formatCurrency(profitReport.totalExpenses)}
        />
        <StatCard
          title="صافي الربح"
          value={formatCurrency(profitReport.netProfit)}
          highlight
        />
        <StatCard
          title="هامش الربح"
          value={`${profitReport.profitMargin.toFixed(1)}%`}
        />
      </div>
    );
  }

  if (activeTab === "top") {
    const topProducts = await getTopProducts(from, to);
    if (!topProducts) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle>أفضل المنتجات مبيعًا</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>المنتج</TableHead>
                <TableHead>الكمية المباعة</TableHead>
                <TableHead>الإيرادات</TableHead>
                <TableHead>الربح</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topProducts.map((p, i) => (
                <TableRow key={p.productId}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell className="font-medium">{p.productName}</TableCell>
                  <TableCell>{p.quantitySold}</TableCell>
                  <TableCell className="text-gold">
                    {formatCurrency(p.revenue)}
                  </TableCell>
                  <TableCell>{formatCurrency(p.profit)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  }

  return null;
}

function StatCard({
  title,
  value,
  highlight,
}: {
  title: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted">{title}</p>
        <p
          className={`text-2xl font-bold mt-1 ${
            highlight ? "text-gold" : "text-brown"
          }`}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
