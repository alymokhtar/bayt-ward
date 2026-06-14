import dynamic from "next/dynamic";
import { Suspense } from "react";
import Badge from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { getDashboardStats } from "@/lib/actions/dashboard";
import LowStockPanel from "@/app/(dashboard)/dashboard/LowStockPanel";
import {
  formatCurrency,
  formatDateTime,
  getPaymentMethodLabel,
} from "@/lib/utils";
import {
  Package,
  ShoppingCart,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";

const SalesChart = dynamic(
  () => import("@/app/(dashboard)/dashboard/SalesChart"),
  {
    loading: () => (
      <div className="h-[280px] animate-pulse rounded-lg bg-brown/5" />
    ),
  }
);

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  const statCards = [
    {
      title: "مبيعات اليوم",
      value: formatCurrency(stats.todaySales),
      sub: `${stats.todaySalesCount} فاتورة`,
      icon: ShoppingCart,
      color: "bg-gold/10 text-gold",
    },
    {
      title: "مبيعات الشهر",
      value: formatCurrency(stats.monthSales),
      sub: `${stats.monthSalesCount} فاتورة`,
      icon: TrendingUp,
      color: "bg-green-100 text-green-700",
    },
    {
      title: "المنتجات النشطة",
      value: stats.totalProducts.toString(),
      sub: "منتج",
      icon: Package,
      color: "bg-brown/10 text-brown",
    },
    {
      title: "العملاء",
      value: stats.totalCustomers.toString(),
      sub: "عميل مسجل",
      icon: Users,
      color: "bg-blue-100 text-blue-700",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brown">لوحة التحكم</h1>
        <p className="text-sm text-muted mt-1">نظرة عامة على أداء المتجر</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted">{card.title}</p>
                    <p className="text-2xl font-bold text-brown mt-1">
                      {card.value}
                    </p>
                    <p className="text-xs text-muted mt-1">{card.sub}</p>
                  </div>
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl ${card.color}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>مبيعات آخر 7 أيام</CardTitle>
          </CardHeader>
          <CardContent>
            <SalesChart data={stats.salesChartData} />
          </CardContent>
        </Card>

        <Suspense
          fallback={
            <Card>
              <CardContent className="pt-6">
                <div className="h-48 animate-pulse rounded-lg bg-brown/5" />
              </CardContent>
            </Card>
          }
        >
          <LowStockPanel />
        </Suspense>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>أحدث المبيعات</CardTitle>
          <Link href="/sales" className="text-sm text-gold hover:underline">
            عرض الكل
          </Link>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم الفاتورة</TableHead>
                <TableHead>العميل</TableHead>
                <TableHead>الكاشير</TableHead>
                <TableHead>الدفع</TableHead>
                <TableHead>الإجمالي</TableHead>
                <TableHead>التاريخ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.recentSales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell>
                    <Link
                      href={`/sales/${sale.id}`}
                      className="text-gold hover:underline font-medium"
                    >
                      {sale.invoiceNumber}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {sale.customer?.name || (
                      <span className="text-muted">عميل نقدي</span>
                    )}
                  </TableCell>
                  <TableCell>{sale.user.name}</TableCell>
                  <TableCell>
                    {getPaymentMethodLabel(sale.paymentMethod)}
                  </TableCell>
                  <TableCell className="font-semibold">
                    {formatCurrency(sale.totalAmount)}
                  </TableCell>
                  <TableCell className="text-muted text-sm">
                    {formatDateTime(sale.createdAt)}
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
