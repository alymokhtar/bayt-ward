import { Card, CardContent } from "@/components/ui/Card";
import { getDashboardKpis } from "@/lib/actions/dashboard";
import { getSession } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import { Package, ShoppingCart, TrendingUp, Users } from "lucide-react";

export default async function DashboardStatCards() {
  const [kpis, session] = await Promise.all([
    getDashboardKpis(),
    getSession(),
  ]);
  const isCashier = session?.role === "CASHIER";

  const statCards = [
    {
      title: "مبيعات اليوم",
      value: formatCurrency(kpis.todaySales),
      sub: `${kpis.todaySalesCount} فاتورة`,
      icon: ShoppingCart,
      color: "bg-gold/10 text-gold",
    },
    ...(!isCashier
      ? [
          {
            title: "مبيعات الشهر",
            value: formatCurrency(kpis.monthSales),
            sub: `${kpis.monthSalesCount} فاتورة`,
            icon: TrendingUp,
            color: "bg-green-100 text-green-700",
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
      color: "bg-blue-100 text-blue-700",
    },
  ];

  return (
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
  );
}
