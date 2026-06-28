"use client";

import Badge from "@/components/ui/Badge";
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
import { getCashRegisterReview, getSale } from "@/lib/actions/sales";
import { formatEgyptChartDateLabel } from "@/lib/business-day";
import { formatCurrency, formatDateTime, getPaymentMethodLabel } from "@/lib/utils";
import type { PaymentMethod } from "@prisma/client";
import {
  ArrowRight,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  RotateCcw,
  Wallet,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

const statusLabels: Record<string, string> = {
  COMPLETED: "مكتملة",
  PENDING: "قيد الانتظار",
  CANCELLED: "ملغاة",
  REFUNDED: "مستردة",
  PARTIALLY_REFUNDED: "جزئي",
};

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
  salesList: {
    id: string;
    invoiceNumber: string;
    totalAmount: number;
    paymentMethod: PaymentMethod;
    status: string;
    createdAt: Date;
    customer: { name: string | null } | null;
    user: { name: string } | null;
  }[];
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

  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);
  const [expandedSaleData, setExpandedSaleData] = useState<any>(null);
  const [loadingSale, setLoadingSale] = useState(false);

  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";
  const paymentMethod = (searchParams.get("paymentMethod") || "ALL") as PaymentMethod | "ALL";

  async function toggleSaleDetails(saleId: string) {
    if (expandedSaleId === saleId) {
      setExpandedSaleId(null);
      setExpandedSaleData(null);
      return;
    }
    setExpandedSaleId(saleId);
    setLoadingSale(true);
    try {
      const data = await getSale(saleId);
      setExpandedSaleData(data);
    } catch {
      setExpandedSaleData(null);
    } finally {
      setLoadingSale(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    setExpandedSaleId(null);
    setExpandedSaleData(null);

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

          {review.salesList.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-brown">
                    فواتير {paymentMethod === "ALL" ? "الكل" : getPaymentMethodLabel(paymentMethod)}
                  </h3>
                  <span className="text-xs text-muted">
                    {review.salesList.length} فاتورة
                  </span>
                </div>
                <div className="space-y-2">
                  {review.salesList.map((sale) => {
                    const isExpanded = expandedSaleId === sale.id;
                    return (
                      <div key={sale.id} className="rounded-lg border border-border bg-white overflow-hidden">
                        <button
                          type="button"
                          onClick={() => toggleSaleDetails(sale.id)}
                          className="flex w-full items-center justify-between p-3 transition-colors hover:bg-cream/50"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gold/15 shrink-0">
                              <Receipt className="h-4 w-4 text-gold" />
                            </div>
                            <div className="min-w-0 text-start">
                              <p className="text-sm font-medium text-brown truncate">
                                {sale.invoiceNumber}
                              </p>
                              <p className="text-xs text-muted truncate">
                                {sale.customer?.name || "عميل نقدي"} ·{" "}
                                {formatDateTime(sale.createdAt)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="text-end">
                              <p className="text-sm font-semibold text-brown">
                                {formatCurrency(sale.totalAmount)}
                              </p>
                              <p className="text-xs text-muted">
                                {getPaymentMethodLabel(sale.paymentMethod)}
                              </p>
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-muted" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted" />
                            )}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="border-t border-border bg-cream/30 p-3">
                            {loadingSale && !expandedSaleData ? (
                              <div className="space-y-2 animate-pulse">
                                <div className="h-4 rounded bg-brown/10" />
                                <div className="h-20 rounded bg-brown/5" />
                              </div>
                            ) : expandedSaleData?.id === sale.id ? (
                              <div className="space-y-4 text-sm">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge status={expandedSaleData.status}>
                                    {statusLabels[expandedSaleData.status] || expandedSaleData.status}
                                  </Badge>
                                  <span className="text-xs text-muted">
                                    بواسطة {expandedSaleData.user?.name || "—"}
                                  </span>
                                </div>

                                <div className="grid gap-2 sm:grid-cols-2">
                                  <div>
                                    <p className="text-xs text-muted">العميل</p>
                                    <p className="font-medium">{expandedSaleData.customer?.name || "عميل نقدي"}</p>
                                    {expandedSaleData.customer?.phone && (
                                      <p dir="ltr" className="text-xs text-muted">{expandedSaleData.customer.phone}</p>
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted">الكاشير</p>
                                    <p className="font-medium">{expandedSaleData.user?.name || "—"}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted">طريقة الدفع</p>
                                    <p className="font-medium">{getPaymentMethodLabel(expandedSaleData.paymentMethod)}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted">التاريخ</p>
                                    <p className="font-medium">{formatDateTime(expandedSaleData.createdAt)}</p>
                                  </div>
                                </div>

                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="border-b border-border text-muted text-start">
                                        <th className="text-start py-1 font-medium">المنتج</th>
                                        <th className="text-start py-1 font-medium">المقاس/اللون</th>
                                        <th className="text-start py-1 font-medium">الكمية</th>
                                        <th className="text-start py-1 font-medium">السعر</th>
                                        <th className="text-start py-1 font-medium">الإجمالي</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {expandedSaleData.items.map((item: any) => (
                                        <tr key={item.id} className="border-b border-border/50 last:border-0">
                                          <td className="py-1">
                                            {item.variant?.product?.nameAr || item.variant?.product?.name || "—"}
                                          </td>
                                          <td className="py-1 text-muted">
                                            {item.variant?.size} / {item.variant?.color}
                                          </td>
                                          <td className="py-1">{item.quantity}</td>
                                          <td className="py-1">{formatCurrency(item.unitPrice)}</td>
                                          <td className="py-1 font-medium">{formatCurrency(item.totalPrice)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>

                                <div className="space-y-1 max-w-xs ms-auto">
                                  <div className="flex justify-between">
                                    <span className="text-muted">المجموع الفرعي</span>
                                    <span>{formatCurrency(expandedSaleData.subtotal)}</span>
                                  </div>
                                  {expandedSaleData.discountAmount > 0 && (
                                    <div className="flex justify-between text-danger">
                                      <span>الخصم</span>
                                      <span>− {formatCurrency(expandedSaleData.discountAmount)}</span>
                                    </div>
                                  )}
                                  {expandedSaleData.taxAmount > 0 && (
                                    <div className="flex justify-between">
                                      <span className="text-muted">الضريبة</span>
                                      <span>{formatCurrency(expandedSaleData.taxAmount)}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between font-bold text-brown pt-1 border-t border-border">
                                    <span>الإجمالي</span>
                                    <span className="text-gold">{formatCurrency(expandedSaleData.totalAmount)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted">المدفوع</span>
                                    <span>{formatCurrency(expandedSaleData.paidAmount)}</span>
                                  </div>
                                  {expandedSaleData.changeAmount > 0 && (
                                    <div className="flex justify-between">
                                      <span className="text-muted">الباقي</span>
                                      <span>{formatCurrency(expandedSaleData.changeAmount)}</span>
                                    </div>
                                  )}
                                </div>

                                {expandedSaleData.returns?.filter((r: any) => r.status === "APPROVED").length > 0 && (
                                  <div className="border-t border-red-200 pt-3">
                                    <p className="text-xs font-medium text-red-700 mb-2">المرتجعات</p>
                                    {expandedSaleData.returns
                                      .filter((r: any) => r.status === "APPROVED")
                                      .map((ret: any) => (
                                        <div key={ret.id} className="text-xs space-y-1 mb-2">
                                          <div className="flex justify-between">
                                            <span className="text-muted">رقم المرتجع: {ret.returnNumber}</span>
                                            <span className="text-red-700 font-semibold">− {formatCurrency(ret.refundAmount)}</span>
                                          </div>
                                          {ret.reason && <p className="text-muted">السبب: {ret.reason}</p>}
                                        </div>
                                      ))}
                                  </div>
                                )}

                                {expandedSaleData.notes && (
                                  <p className="text-xs text-muted border-t pt-2">
                                    ملاحظات: {expandedSaleData.notes}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <p className="text-sm text-muted">تعذر تحميل تفاصيل الفاتورة</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
