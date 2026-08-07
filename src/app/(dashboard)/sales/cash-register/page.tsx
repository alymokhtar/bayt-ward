"use client";

import Button from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { getCashRegisterReview, sendVaultReconciliationTelegram } from "@/lib/actions/sales";
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
  paymentBreakdown: {
    method: PaymentMethod;
    revenue: number;
    refund: number;
    expense: number;
    net: number;
    count: number;
  }[];
  refundBreakdown: {
    method: PaymentMethod;
    totalAmount: number;
    count: number;
  }[];
}

function formatPeriodLabel(from: string, to: string) {
  if (from === to) {
    return formatEgyptChartDateLabel(from);
  }
  return `${formatEgyptChartDateLabel(from)} — ${formatEgyptChartDateLabel(to)}`;
}

export default function CashRegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [review, setReview] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<
    | { type: "success" | "error"; message: string }
    | null
  >(null);
  const [isPending, startTransition] = useTransition();


  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const result = await getCashRegisterReview(from, to);
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
  }, [from, to]);

  const todayKey = review && review.from === review.to ? review.from : undefined;

  async function handleSendVaultReview() {
    if (!review) return;

    setSendStatus(null);
    setIsSending(true);

    try {
      await sendVaultReconciliationTelegram({
        paymentBreakdown: review.paymentBreakdown,
        from: review.from,
        to: review.to,
      });
      setSendStatus({
        type: "success",
        message: "تم إرسال إشعار مراجعة الخزنة إلى تليجرام بنجاح.",
      });
    } catch (error) {
      console.error("Vault reconciliation Telegram failed", error);
      setSendStatus({
        type: "error",
        message: "فشل إرسال الإشعار. يرجى المحاولة مرة أخرى.",
      });
    } finally {
      setIsSending(false);
    }
  }

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
          title: "إجمالي المبيعات",
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
                      review.totalRevenue - review.totalReturns - review.totalExpenses >= 0
                        ? "text-green-700"
                        : "text-red-700"
                    }`}
                  >
                    {formatCurrency(review.totalRevenue - review.totalReturns - review.totalExpenses)}
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
              <p className="text-sm font-semibold text-brown mb-4">ملخص حسب طريقة الدفع</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الطريقة</TableHead>
                    <TableHead>العدد</TableHead>
                    <TableHead>الإجمالي</TableHead>
                    <TableHead>يخصم</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>الصافي</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {review.paymentBreakdown.map((item) => {
                    const deductions = item.refund + item.expense;
                    let status = "—";
                    if (item.refund > 0 && item.expense > 0) status = "مسترد + مصروف";
                    else if (item.refund > 0) status = "مسترد";
                    else if (item.expense > 0) status = "مصروف";
                    return (
                      <TableRow key={item.method}>
                        <TableCell>{getPaymentMethodLabel(item.method)}</TableCell>
                        <TableCell>{item.count}</TableCell>
                        <TableCell className="font-medium text-gold">
                          {formatCurrency(item.revenue)}
                        </TableCell>
                        <TableCell className="text-danger">
                          {deductions > 0 ? `- ${formatCurrency(deductions)}` : "—"}
                        </TableCell>
                        <TableCell>
                          <span className={`text-xs font-medium ${
                            status === "مسترد + مصروف" ? "text-orange-600" :
                            status === "مسترد" ? "text-red-600" :
                            status === "مصروف" ? "text-orange-600" :
                            "text-muted"
                          }`}>
                            {status}
                          </span>
                        </TableCell>
                        <TableCell className={`font-bold ${item.net >= 0 ? "text-green-700" : "text-red-700"}`}>
                          {formatCurrency(item.net)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              <div className="mt-4 border-t border-border pt-4">
                <Button loading={isSending} onClick={handleSendVaultReview}>
                  تم مراجعة الخزنة والرصيد متطابق
                </Button>
                {sendStatus?.type === "success" && (
                  <div className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                    {sendStatus.message}
                  </div>
                )}
                {sendStatus?.type === "error" && (
                  <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">
                    {sendStatus.message}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted flex items-center gap-2">
                    <ArrowUpRight className="h-4 w-4 text-green-600" />
                    إجمالي المبيعات
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
                      review.totalRevenue - review.totalReturns - review.totalExpenses >= 0
                        ? "text-green-700"
                        : "text-red-700"
                    }
                  >
                    {formatCurrency(review.totalRevenue - review.totalReturns - review.totalExpenses)}
                  </span>
                </div>

                {review.paymentBreakdown.length > 0 && (
                  <div className="border-t border-border pt-3 space-y-2">
                    <p className="text-xs font-medium text-muted">
                      تفصيل الإيرادات حسب طريقة الدفع
                    </p>
                    {review.paymentBreakdown.map((item) => (
                      <div key={item.method} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-muted">
                            {getPaymentMethodLabel(item.method)} ({item.count} فاتورة)
                          </span>
                          <span className="font-medium">
                            {formatCurrency(item.net)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted">
                          <span>إيرادات: {formatCurrency(item.revenue)}</span>
                          {item.refund > 0 && (
                            <span>− مرتجع: {formatCurrency(item.refund)}</span>
                          )}
                          {item.expense > 0 && (
                            <span>− مصروفات: {formatCurrency(item.expense)}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {review.refundBreakdown.length > 0 && (
                  <div className="border-t border-border pt-3 space-y-2">
                    <p className="text-xs font-medium text-muted">
                      تفصيل المرتجعات حسب طريقة الاسترجاع
                    </p>
                    {review.refundBreakdown.map((item) => (
                      <div
                        key={item.method}
                        className="flex items-center justify-between"
                      >
                        <span className="text-muted">
                          {getPaymentMethodLabel(item.method)} ({item.count} مرتجع)
                        </span>
                        <span className="font-medium text-red-700">
                          − {formatCurrency(item.totalAmount)}
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
