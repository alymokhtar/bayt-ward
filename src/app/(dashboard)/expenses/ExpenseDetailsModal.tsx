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
import { getExpense } from "@/lib/actions/expenses";
import { ADJUSTMENT_TYPE_LABELS, EXPENSE_CATEGORIES, PAYMENT_METHODS } from "@/lib/constants";
import { formatCurrency, formatDate, formatDateTime, getPaymentMethodLabel } from "@/lib/utils";
import { useEffect, useState } from "react";

type ExpenseDetails = Awaited<ReturnType<typeof getExpense>>;

interface ExpenseDetailsModalProps {
  expenseId: string | null;
  onClose: () => void;
}

function categoryLabel(category: string) {
  return EXPENSE_CATEGORIES.find((c) => c.value === category)?.label || category;
}

export default function ExpenseDetailsModal({
  expenseId,
  onClose,
}: ExpenseDetailsModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<ExpenseDetails | null>(null);

  useEffect(() => {
    if (!expenseId) {
      setData(null);
      setError("");
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const result = await getExpense(expenseId!);
        if (!cancelled) setData(result);
      } catch {
        if (!cancelled) setError("تعذر تحميل تفاصيل المصروف");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [expenseId]);

  return (
    <Modal
      isOpen={!!expenseId}
      onClose={onClose}
      title={data?.title || "تفاصيل المصروف"}
      description={data ? formatDate(data.expenseDate) : undefined}
      size="lg"
    >
      {loading && (
        <div className="space-y-3 animate-pulse">
          <div className="h-4 w-1/3 rounded bg-brown/10" />
          <div className="h-24 rounded-xl bg-brown/5" />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {data && !loading && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="outline">{categoryLabel(data.category)}</Badge>
            <span className="text-sm text-muted">بواسطة {data.user.name}</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-cream/50 p-4">
              <p className="text-xs text-muted">المبلغ</p>
              <p className="mt-1 text-lg font-semibold text-danger">
                {formatCurrency(data.amount)}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-cream/50 p-4">
              <p className="text-xs text-muted">تاريخ المصروف</p>
              <p className="mt-1 text-sm font-medium text-brown">
                {formatDate(data.expenseDate)}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-cream/50 p-4">
              <p className="text-xs text-muted">طريقة الدفع</p>
              <p className="mt-1 text-sm font-medium text-brown">
                {getPaymentMethodLabel(data.paymentMethod)}
              </p>
            </div>
            {data.employee && (
              <div className="rounded-xl border border-border bg-cream/50 p-4">
                <p className="text-xs text-muted">الموظف</p>
                <p className="mt-1 text-sm font-medium text-brown">
                  {data.employee.name}
                </p>
              </div>
            )}
            <div className="rounded-xl border border-border bg-cream/50 p-4">
              <p className="text-xs text-muted">تاريخ التسجيل</p>
              <p className="mt-1 text-sm font-medium text-brown">
                {formatDateTime(data.createdAt)}
              </p>
            </div>
          </div>

          {data.baseSalary != null && data.deductionsTotal != null && (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-cream/50 p-4">
                <p className="text-xs text-muted">الراتب الأساسي</p>
                <p className="mt-1 text-sm font-medium text-brown">
                  {formatCurrency(data.baseSalary)}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-cream/50 p-4">
                <p className="text-xs text-muted">الاستقطاعات</p>
                <p className="mt-1 text-sm font-medium text-danger">
                  {formatCurrency(data.deductionsTotal)}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-cream/50 p-4">
                <p className="text-xs text-muted">صافي الراتب</p>
                <p className="mt-1 text-sm font-semibold text-gold">
                  {formatCurrency(data.amount)}
                </p>
              </div>
            </div>
          )}

          {data.description && (
            <div className="rounded-xl border border-border p-4">
              <p className="text-xs text-muted">الوصف</p>
              <p className="mt-1 text-sm text-brown">{data.description}</p>
            </div>
          )}

          {data.adjustments.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium text-brown">
                الاستقطاعات المسدّدة
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>النوع</TableHead>
                    <TableHead>العنوان</TableHead>
                    <TableHead>المبلغ</TableHead>
                    <TableHead>التاريخ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.adjustments.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        {ADJUSTMENT_TYPE_LABELS[item.type] || item.type}
                      </TableCell>
                      <TableCell>{item.title || "—"}</TableCell>
                      <TableCell className="text-danger">
                        {formatCurrency(item.amount)}
                      </TableCell>
                      <TableCell className="text-sm text-muted">
                        {formatDate(item.adjustmentDate)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="flex justify-end">
            <Button variant="secondary" onClick={onClose}>
              إغلاق
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
