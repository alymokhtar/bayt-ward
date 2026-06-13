"use client";

import Button from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import Badge from "@/components/ui/Badge";
import {
  getSalesReport,
  getInventoryReport,
  getProfitReport,
  getTopProducts,
} from "@/lib/actions/reports";
import { formatCurrency, getPaymentMethodLabel } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

type SalesReport = Awaited<ReturnType<typeof getSalesReport>>;
type InventoryReport = Awaited<ReturnType<typeof getInventoryReport>>;
type ProfitReport = Awaited<ReturnType<typeof getProfitReport>>;
type TopProduct = Awaited<ReturnType<typeof getTopProducts>>[number];

interface ReportsClientProps {
  activeTab: string;
  from: string;
  to: string;
  salesReport: SalesReport | null;
  inventoryReport: InventoryReport | null;
  profitReport: ProfitReport | null;
  topProducts: TopProduct[] | null;
}

const tabs = [
  { id: "sales", label: "تقرير المبيعات" },
  { id: "inventory", label: "تقرير المخزون" },
  { id: "profit", label: "تقرير الأرباح" },
  { id: "top", label: "أفضل المنتجات" },
];

export default function ReportsClient({
  activeTab,
  from,
  to,
  salesReport,
  inventoryReport,
  profitReport,
  topProducts,
}: ReportsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [dateFrom, setDateFrom] = useState(from);
  const [dateTo, setDateTo] = useState(to);

  function setTab(tab: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    startTransition(() => router.push(`/reports?${params.toString()}`));
  }

  function applyDates() {
    const params = new URLSearchParams(searchParams.toString());
    params.set("from", dateFrom);
    params.set("to", dateTo);
    if (!params.get("tab")) params.set("tab", activeTab);
    startTransition(() => router.push(`/reports?${params.toString()}`));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-border pb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setTab(tab.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-gold text-white"
                : "text-brown hover:bg-gold/10"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab !== "inventory" && (
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-muted mb-1">من</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-10 rounded-lg border border-border px-3 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">إلى</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-10 rounded-lg border border-border px-3 text-sm"
            />
          </div>
          <Button variant="secondary" onClick={applyDates} loading={isPending}>
            تطبيق
          </Button>
        </div>
      )}

      {activeTab === "sales" && salesReport && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="إجمالي المبيعات" value={formatCurrency(salesReport.totalSales)} />
            <StatCard title="عدد الفواتير" value={salesReport.salesCount.toString()} />
            <StatCard title="متوسط الفاتورة" value={formatCurrency(salesReport.averageSale)} />
            <StatCard title="صافي المبيعات" value={formatCurrency(salesReport.netSales)} />
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
                      <TableCell>
                        {getPaymentMethodLabel(item.method)}
                      </TableCell>
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
      )}

      {activeTab === "inventory" && inventoryReport && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="إجمالي القطع" value={inventoryReport.totalItems.toString()} />
            <StatCard title="قيمة التكلفة" value={formatCurrency(inventoryReport.totalCostValue)} />
            <StatCard title="قيمة البيع" value={formatCurrency(inventoryReport.totalRetailValue)} />
            <StatCard title="الربح المحتمل" value={formatCurrency(inventoryReport.potentialProfit)} />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>منتجات بمخزون منخفض ({inventoryReport.lowStockCount})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المنتج</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>الكمية</TableHead>
                    <TableHead>الحد الأدنى</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventoryReport.lowStockItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        {item.productName} — {item.size}/{item.color}
                      </TableCell>
                      <TableCell dir="ltr">{item.sku}</TableCell>
                      <TableCell>
                        <Badge variant="warning">{item.stockQuantity}</Badge>
                      </TableCell>
                      <TableCell>{item.minStockLevel}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "profit" && profitReport && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard title="الإيرادات" value={formatCurrency(profitReport.revenue)} />
          <StatCard title="تكلفة البضاعة" value={formatCurrency(profitReport.costOfGoodsSold)} />
          <StatCard title="إجمالي الربح" value={formatCurrency(profitReport.grossProfit)} />
          <StatCard title="المرتجعات" value={formatCurrency(profitReport.totalReturns)} />
          <StatCard title="المصروفات" value={formatCurrency(profitReport.totalExpenses)} />
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
      )}

      {activeTab === "top" && topProducts && (
        <Card>
          <CardHeader>
            <CardTitle>أفضل المنتجات مبيعاً</CardTitle>
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
      )}
    </div>
  );
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
