import Button from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { getCashRegisterReview } from "@/lib/actions/sales";
import {
  formatEgyptChartDateLabel,
} from "@/lib/business-day";
import { formatCurrency } from "@/lib/utils";
import {
  ArrowRight,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  RotateCcw,
  Wallet,
} from "lucide-react";
import Link from "next/link";

interface CashRegisterPageProps {
  searchParams: Promise<{
    from?: string;
    to?: string;
  }>;
}

function formatPeriodLabel(from: string, to: string) {
  if (from === to) {
    return formatEgyptChartDateLabel(from);
  }

  return `${formatEgyptChartDateLabel(from)} — ${formatEgyptChartDateLabel(to)}`;
}

export default async function CashRegisterPage({
  searchParams,
}: CashRegisterPageProps) {
  const params = await searchParams;
  const review = await getCashRegisterReview(params.from, params.to);
  const todayKey = review.from === review.to ? review.from : undefined;

  const statCards = [
    {
      title: "إجمالي الإيرادات",
      value: formatCurrency(review.totalRevenue),
      sub: `${review.salesCount} فاتورة`,
      icon: ArrowUpRight,
      color: "bg-green-100 text-green-700",
    },
    {
      title: "إجمالي المصروفات",
      value: formatCurrency(review.totalExpenses),
      sub: `${review.expensesCount} مصروف`,
      icon: Receipt,
      color: "bg-orange-100 text-orange-700",
    },
    {
      title: "إجمالي المرتجعات",
      value: formatCurrency(review.totalReturns),
      sub: `${review.returnsCount} مرتجع`,
      icon: RotateCcw,
      color: "bg-red-100 text-red-700",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/sales">
            <Button variant="ghost" size="icon">
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-brown">مراجعة الخزنة</h1>
            <p className="text-sm text-muted mt-1">
              {formatPeriodLabel(review.from, review.to)}
              {" · "}
              يوم العمل (03:00 — 03:00)
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form className="flex flex-wrap gap-3">
            <input
              type="date"
              name="from"
              defaultValue={params.from || todayKey || review.from}
              className="h-10 rounded-lg border border-border bg-white px-3 text-sm"
            />
            <input
              type="date"
              name="to"
              defaultValue={params.to || todayKey || review.to}
              className="h-10 rounded-lg border border-border bg-white px-3 text-sm"
            />
            <Button type="submit" variant="secondary">
              تصفية
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
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

      <Card className="border-gold/30 bg-gold/5">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-muted">صافي الإيرادات</p>
              <p
                className={`text-3xl font-bold mt-1 ${
                  review.netRevenue >= 0 ? "text-green-700" : "text-red-700"
                }`}
              >
                {formatCurrency(review.netRevenue)}
              </p>
              <p className="text-xs text-muted mt-2">
                الإيرادات − المرتجعات − المصروفات
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold/15 text-gold">
              <Wallet className="h-6 w-6" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted flex items-center gap-2">
                <ArrowUpRight className="h-4 w-4 text-green-600" />
                إجمالي الإيرادات
              </span>
              <span className="font-medium">{formatCurrency(review.totalRevenue)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted flex items-center gap-2">
                <ArrowDownLeft className="h-4 w-4 text-red-600" />
                إجمالي المرتجعات
              </span>
              <span className="font-medium text-red-700">
                − {formatCurrency(review.totalReturns)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted flex items-center gap-2">
                <ArrowDownLeft className="h-4 w-4 text-orange-600" />
                إجمالي المصروفات
              </span>
              <span className="font-medium text-orange-700">
                − {formatCurrency(review.totalExpenses)}
              </span>
            </div>
            <div className="border-t border-border pt-3 flex items-center justify-between font-semibold text-brown">
              <span>صافي الإيرادات</span>
              <span className={review.netRevenue >= 0 ? "text-green-700" : "text-red-700"}>
                {formatCurrency(review.netRevenue)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
