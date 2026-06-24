"use client";

import Button from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { getCashRegisterReview } from "@/lib/actions/sales";
import { formatEgyptChartDateLabel } from "@/lib/business-day";
import { formatCurrency, getPaymentMethodLabel } from "@/lib/utils";
import type { PaymentMethod } from "@prisma/client";
import {
  ArrowRight,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  RotateCcw,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

interface ReviewData {
  from: string;
  to: string;
  totalRevenue: number;
  totalExpenses: number;
  totalReturns: number;
  netRevenue: number;
  salesCount: number;
  returnsCount: number;
  expensesCount: number;
  paymentBreakdown: { method: PaymentMethod; totalAmount: number; count: number }[];
}

function formatPeriodLabel(from: string, to: string) {
  if (from === to) {
    return formatEgyptChartDateLabel(from);
  }
  return `${formatEgyptChartDateLabel(from)} — ${formatEgyptChartDateLabel(to)}`;
}

const ALL_METHODS: (PaymentMethod | "ALL")[] = [
  "ALL",
  "CASH",
  "CARD",
  "INSTAPAY",
  "WALLET",
  "TRANSFER",
  "MIXED",
];

export default function CashRegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [review, setReview] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";
  const paymentMethod = (searchParams.get("paymentMethod") || "ALL") as PaymentMethod | "ALL";

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const result = await getCashRegisterReview(from, to, paymentMethod);
        if (!cancelled) setReview(result);
      } catch {
        if (!cancelled) setError("تعذر تحميل بيانات الخزنة");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [from, to, paymentMethod]);

  const todayKey = review && review.from === review.to ? review.from : undefined;

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  }

  const statCards = review
    ? [
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
      ]
    : [];

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
              {review ? formatPeriodLabel(review.from, review.to) : "—"}
              {" · "}
              يوم العمل (03:00 — 03:00)
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-wrap gap-3">
            <input
              type="date"
              value={from || todayKey || review?.from || ""}
              onChange={(e) => updateFilter("from", e.target.value)}
              className="h-10 rounded-lg border border-border bg-white px-3 text-sm"
            />
            <input
              type="date"
              value={to || todayKey || review?.to || ""}
              onChange={(e) => updateFilter("to", e.target.value)}
              className="h-10 rounded-lg border border-border bg-white px-3 text-sm"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {ALL_METHODS.map((method) => {
              const isActive = paymentMethod === method;
              return (
                <button
                  key={method}
                  type="button"
                  onClick={() => updateFilter("paymentMethod", method)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                    isActive
                      ? "bg-brown text-white border-brown"
                      : "bg-white text-brown border-border hover:bg-cream/50"
                  }`}
                >
                  {method === "ALL" ? "الكل" : getPaymentMethodLabel(method)}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {(loading || isPending) && (
        <div className="space-y-4 animate-pulse">
          <div className="grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-28 rounded-xl bg-brown/5" />
            ))}
          </div>
          <div className="h-40 rounded-xl bg-brown/5" />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {review && !loading && (
        <>
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
                      Math.max(0, review.totalRevenue - review.totalReturns - review.totalExpenses) >= 0
                        ? "text-green-700"
                        : "text-red-700"
                    }`}
                  >
                    {formatCurrency(Math.max(0, review.totalRevenue - review.totalReturns - review.totalExpenses))}
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
                  <span className="font-medium">
                    {formatCurrency(review.totalRevenue)}
                  </span>
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
                  <span
                    className={
                      Math.max(0, review.totalRevenue - review.totalReturns - review.totalExpenses) >= 0
                        ? "text-green-700"
                        : "text-red-700"
                    }
                  >
                    {formatCurrency(Math.max(0, review.totalRevenue - review.totalReturns - review.totalExpenses))}
                  </span>
                </div>

                {review.paymentBreakdown.length > 0 && (
                  <div className="border-t border-border pt-3 space-y-2">
                    <p className="text-xs font-medium text-muted">
                      تفصيل الإيرادات حسب طريقة الدفع
                    </p>
                    {review.paymentBreakdown.map((item) => (
                      <div
                        key={item.method}
                        className="flex items-center justify-between"
                      >
                        <span className="text-muted">
                          {getPaymentMethodLabel(item.method)} ({item.count} فاتورة)
                        </span>
                        <span className="font-medium">
                          {formatCurrency(item.totalAmount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
