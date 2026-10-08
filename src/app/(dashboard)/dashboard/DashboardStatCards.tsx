import { Card, CardContent } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { getDashboardKpis } from "@/lib/actions/dashboard";
import { formatCurrency } from "@/lib/utils";
import { Package, Receipt, RotateCcw, ShoppingCart, TrendingUp, Users, Wallet, type LucideIcon } from "lucide-react";
import DashboardDataError from "@/app/(dashboard)/dashboard/DashboardDataError";

export default async function DashboardStatCards() {
  const result = await getDashboardKpis();
  if (!result.success) {
    return <DashboardDataError message={result.error.message} />;
  }

  const { role, kpis } = result.data;
  const isCashier = role === "CASHIER";

  const statCards: {
    title: string;
    value: string;
    sub: string;
    icon: LucideIcon;
    color: string;
    isPrimary?: boolean;
  }[] = [
    {
      title: "إجمالي مبيعات اليوم",
      value: formatCurrency(kpis.todayGrossSales),
      sub: `${kpis.todaySalesCount} فاتورة`,
      icon: ShoppingCart,
      color: "bg-gold/10 text-gold",
    },
    {
      title: "مرتجعات اليوم",
      value: formatCurrency(kpis.todayReturns),
      sub: "مرتجعات",
      icon: RotateCcw,
      color: "bg-red-100 text-red-700",
    },
    {
      title: "مصروفات اليوم",
      value: formatCurrency(kpis.todayExpenses),
      sub: "مصروفات",
      icon: Receipt,
      color: "bg-orange-100 text-orange-700",
    },
    {
      title: "الصافي بعد المصروفات",
      value: formatCurrency(kpis.todayNetSales),
      sub: "المبيعات − المرتجعات − المصروفات",
      icon: Wallet,
      color: "bg-green-100 text-green-700",
      isPrimary: true,
    },
    ...(!isCashier
      ? [
          {
            title: "مبيعات الشهر",
            value: formatCurrency(kpis.monthSales),
            sub: `${kpis.monthSalesCount} فاتورة`,
            icon: TrendingUp,
            color: "bg-blue-100 text-blue-700",
          },
        ]
      : []),
    {
      title: "المنتجات النشطة",
      value: kpis.totalProducts.toString(),
      sub: "منتج",
      icon: Package,
      color: "bg-brown/10 text-brown",
    },
    {
      title: "العملاء",
      value: kpis.totalCustomers.toString(),
      sub: "عميل مسجل",
      icon: Users,
      color: "bg-purple-100 text-purple-700",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {statCards.map((card) => {
        const Icon = card.icon;
        return (
          <Card
            key={card.title}
            className={card.isPrimary
              ? "border-2 border-gold/40 bg-gradient-to-br from-gold/15 via-card to-brown/5 shadow-md shadow-gold/10"
              : undefined}
          >
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  {card.isPrimary && (
                    <Badge variant="gold" className="mb-2 gap-1">
                      <TrendingUp className="h-3 w-3" />
                      المؤشر الرئيسي
                    </Badge>
                  )}
                  <p className="text-sm text-muted">{card.title}</p>
                  <p className={`mt-1 break-words font-black text-brown ${
                    card.isPrimary ? "text-2xl sm:text-3xl" : "text-2xl"
                  }`}>
                    {card.value}
                  </p>
                  <p className="text-xs text-muted mt-1">{card.sub}</p>
                </div>
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${card.color}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
