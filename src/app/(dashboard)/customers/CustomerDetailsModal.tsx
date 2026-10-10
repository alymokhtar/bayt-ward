"use client";

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import CustomerWhatsAppButton from "@/components/whatsapp/CustomerWhatsAppButton";
import { getCustomer } from "@/lib/actions/customers";
import { getCustomerLoyaltySummary } from "@/lib/actions/loyalty";
import type { LoyaltyTransactionType } from "@prisma/client";
import {
  formatCurrency,
  formatDateTime,
  getSaleStatusLabel,
} from "@/lib/utils";
import { Mail, MapPin, Phone } from "lucide-react";
import { useEffect, useState } from "react";

type CustomerDetails = Awaited<ReturnType<typeof getCustomer>>;
type CustomerLoyaltySummary = Awaited<
  ReturnType<typeof getCustomerLoyaltySummary>
>;

const loyaltyTransactionLabels: Record<LoyaltyTransactionType, string> = {
  EARN: "اكتساب",
  REDEEM: "استبدال",
  EARN_REVERSAL: "عكس نقاط مكتسبة",
  REDEEM_REVERSAL: "إرجاع نقاط مستبدلة",
  EXPIRE: "انتهاء صلاحية",
  ADJUSTMENT: "تسوية يدوية",
};

interface CustomerDetailsModalProps {
  customerId: string | null;
  onClose: () => void;
}

export default function CustomerDetailsModal({
  customerId,
  onClose,
}: CustomerDetailsModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loadedData, setLoadedData] = useState<CustomerDetails | null>(null);
  const data = loadedData?.id === customerId ? loadedData : null;
  const [loyaltySummary, setLoyaltySummary] =
    useState<CustomerLoyaltySummary | null>(null);
  const [loyaltyLoading, setLoyaltyLoading] = useState(false);
  const [loyaltyError, setLoyaltyError] = useState("");
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);

  useEffect(() => {
    if (!customerId) return;
    const selectedCustomerId = customerId;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      setLoyaltyLoading(true);
      setLoyaltyError("");
      setLoyaltySummary(null);
      setExpandedSaleId(null);
      const [customerResult, loyaltyResult] = await Promise.allSettled([
        getCustomer(selectedCustomerId),
        getCustomerLoyaltySummary(selectedCustomerId),
      ]);
      if (cancelled) return;

      if (customerResult.status === "fulfilled") {
        setLoadedData(customerResult.value);
      } else {
        setError("تعذر تحميل تفاصيل العميل");
      }

      if (loyaltyResult.status === "fulfilled") {
        setLoyaltySummary(loyaltyResult.value);
      } else {
        setLoyaltyError("تعذر تحميل رصيد وسجل نقاط الولاء");
      }
      setLoading(false);
      setLoyaltyLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  return (
    <Modal
      isOpen={!!customerId}
      onClose={onClose}
      title={data?.name || "تفاصيل العميل"}
      description={data ? "بيانات العميل وسجل المشتريات" : undefined}
      size="xl"
      footer={
        <div className="flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            إغلاق
          </Button>
        </div>
      }
    >
      {loading && (
        <div className="space-y-3 animate-pulse">
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-brown/5" />
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

      {data && !loading && (
        <div className="space-y-5">
          <div className="flex justify-end">
            <CustomerWhatsAppButton
              customerName={data.name}
              customerPhone={data.phone}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-cream/50 p-4 text-center">
              <p className="text-xs text-muted">إجمالي الإنفاق</p>
              <p className="mt-1 text-lg font-bold text-gold">
                {formatCurrency(data.totalSpent)}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-cream/50 p-4 text-center">
              <p className="text-xs text-muted">عدد الزيارات</p>
              <p className="mt-1 text-lg font-bold text-brown">
                {data.visitCount}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-cream/50 p-4 text-center">
              <p className="text-xs text-muted">عدد المبيعات</p>
              <p className="mt-1 text-lg font-bold text-brown">
                {data._count.sales}
              </p>
            </div>
          </div>

          <section className="rounded-xl border border-gold/20 bg-gold/5 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold text-brown">نقاط الولاء</h3>
              {loyaltySummary && (
                <p className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-gold">
                  الرصيد الحالي: {loyaltySummary.loyaltyPoints} نقطة
                </p>
              )}
            </div>

            {loyaltyLoading && (
              <p className="text-sm text-muted">جارٍ تحميل سجل الحركات...</p>
            )}
            {loyaltyError && (
              <p role="alert" className="text-sm text-danger">{loyaltyError}</p>
            )}
            {loyaltySummary && !loyaltyLoading && (
              loyaltySummary.loyaltyTransactions.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted">
                  لا توجد حركات نقاط لهذا العميل بعد
                </p>
              ) : (
                <div className="max-h-64 overflow-auto rounded-lg border border-border bg-white">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>التاريخ</TableHead>
                        <TableHead>نوع الحركة</TableHead>
                        <TableHead>النقاط</TableHead>
                        <TableHead>الرصيد بعدها</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loyaltySummary.loyaltyTransactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell className="whitespace-nowrap text-sm">
                            {formatDateTime(transaction.createdAt)}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p>{loyaltyTransactionLabels[transaction.type]}</p>
                              {transaction.sale?.invoiceNumber && (
                                <p className="text-xs text-muted" dir="ltr">
                                  {transaction.sale.invoiceNumber}
                                </p>
                              )}
                              {transaction.reason && (
                                <p className="max-w-48 truncate text-xs text-muted">
                                  {transaction.reason}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell
                            dir="ltr"
                            className={
                              transaction.points > 0
                                ? "font-semibold text-green-700"
                                : transaction.points < 0
                                  ? "font-semibold text-danger"
                                  : undefined
                            }
                          >
                            {transaction.points > 0 ? "+" : ""}
                            {transaction.points}
                          </TableCell>
                          <TableCell dir="ltr">{transaction.balanceAfter}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )
            )}
          </section>

          <div className="rounded-xl border border-border p-4 space-y-3 text-sm">
            <p className="font-medium text-brown">معلومات الاتصال</p>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted" />
              <span dir="ltr">{data.phone}</span>
            </div>
            {data.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted" />
                <span dir="ltr">{data.email}</span>
              </div>
            )}
            {data.address && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted" />
                <span>{data.address}</span>
              </div>
            )}
            {data.notes && (
              <p className="text-muted border-t border-border pt-3">
                {data.notes}
              </p>
            )}
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-brown">
              سجل المشتريات ({data._count.sales} فاتورة غير ملغاة؛ أحدث 20 فاتورة معروضة)
            </p>

            {data.sales.length === 0 ? (
              <p className="rounded-xl border border-border py-8 text-center text-sm text-muted">
                لا توجد مشتريات بعد
              </p>
            ) : (
              <div className="space-y-2 max-h-[360px] overflow-y-auto">
                {data.sales.map((sale) => {
                  const isExpanded = expandedSaleId === sale.id;
                  return (
                    <div
                      key={sale.id}
                      className="rounded-lg border border-border overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedSaleId(isExpanded ? null : sale.id)
                        }
                        className="w-full flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-start hover:bg-gold/5 transition-colors"
                      >
                        <div>
                          <p className="font-medium text-brown">
                            {sale.invoiceNumber}
                          </p>
                          <p className="text-xs text-muted mt-0.5">
                            {formatDateTime(sale.createdAt)} · {sale._count.items} منتج
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge status={sale.status}>
                            {getSaleStatusLabel(sale.status)}
                          </Badge>
                          <span className="font-semibold text-gold">
                            {formatCurrency(sale.totalAmount)}
                          </span>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-border bg-cream/30 px-4 py-3">
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>المنتج</TableHead>
                                  <TableHead>المقاس/اللون</TableHead>
                                  <TableHead>SKU</TableHead>
                                  <TableHead>الكمية</TableHead>
                                  <TableHead>السعر</TableHead>
                                  <TableHead>الإجمالي</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {sale.items.map((item, index) => (
                                  <TableRow key={index}>
                                    <TableCell>
                                      {item.variant.product.nameAr ||
                                        item.variant.product.name}
                                    </TableCell>
                                    <TableCell>
                                      {item.variant.size} / {item.variant.color}
                                    </TableCell>
                                    <TableCell dir="ltr" className="text-start">
                                      {item.variant.sku}
                                    </TableCell>
                                    <TableCell>{item.quantity}</TableCell>
                                    <TableCell>
                                      {formatCurrency(item.unitPrice)}
                                    </TableCell>
                                    <TableCell>
                                      {formatCurrency(item.totalPrice)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}
    </Modal>
  );
}
