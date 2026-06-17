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
import { getEmployeeDetails } from "@/lib/actions/employees";
import { ADJUSTMENT_TYPE_LABELS } from "@/lib/constants";
import { formatCurrency, formatDate, getRoleLabel } from "@/lib/utils";
import { useEffect, useState } from "react";

type EmployeeDetails = Awaited<ReturnType<typeof getEmployeeDetails>>;

interface EmployeeDetailsModalProps {
  employeeId: string | null;
  onClose: () => void;
}

export default function EmployeeDetailsModal({
  employeeId,
  onClose,
}: EmployeeDetailsModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<EmployeeDetails | null>(null);

  useEffect(() => {
    if (!employeeId) {
      setData(null);
      setError("");
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const result = await getEmployeeDetails(employeeId!);
        if (!cancelled) setData(result);
      } catch {
        if (!cancelled) setError("تعذر تحميل تفاصيل الموظف");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [employeeId]);

  return (
    <Modal
      isOpen={!!employeeId}
      onClose={onClose}
      title={data?.name || "تفاصيل الموظف"}
      description={
        data
          ? `${getRoleLabel(data.role)} · ${data.isActive ? "نشط" : "معطل"}`
          : undefined
      }
      size="xl"
    >
      {loading && (
        <div className="space-y-3 animate-pulse">
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 rounded-lg bg-brown/5" />
            ))}
          </div>
          <div className="h-48 rounded-lg bg-brown/5" />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {data && !loading && (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoRow label="البريد" value={data.email} dir="ltr" />
            <InfoRow label="الهاتف" value={data.phone || "—"} dir="ltr" />
            <InfoRow
              label="تاريخ بدء العمل"
              value={data.startDate ? formatDate(data.startDate) : "—"}
            />
            <InfoRow
              label="تاريخ إنشاء الحساب"
              value={formatDate(data.createdAt)}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              label="الراتب الشهري"
              value={formatCurrency(data.salary)}
            />
            <SummaryCard
              label="إجمالي الرواتب المستلمة"
              value={formatCurrency(data.totalSalaryReceived)}
              hint={
                data.lastSalary
                  ? `آخر راتب: ${formatCurrency(data.lastSalary.amount)} — ${formatDate(data.lastSalary.expenseDate)}`
                  : "لم يُصرف راتب بعد"
              }
            />
            <SummaryCard
              label="استقطاعات معلقة"
              value={formatCurrency(data.pendingDeductions)}
            />
            <SummaryCard
              label="صافي الراتب القادم"
              value={formatCurrency(data.netSalaryDue)}
            />
          </div>

          {data.pendingAdjustments.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-brown mb-3">
                استقطاعات معلقة ({data.pendingAdjustments.length})
              </h3>
              <div className="overflow-x-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>النوع</TableHead>
                      <TableHead>العنوان</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>المبلغ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.pendingAdjustments.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          {ADJUSTMENT_TYPE_LABELS[item.type]}
                        </TableCell>
                        <TableCell>{item.title || "—"}</TableCell>
                        <TableCell>{formatDate(item.adjustmentDate)}</TableCell>
                        <TableCell className="font-medium text-danger">
                          {formatCurrency(item.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          )}

          <section>
            <h3 className="text-sm font-semibold text-brown mb-3">
              سجل الرواتب ({data.salaryCount})
            </h3>
            {data.salaryExpenses.length === 0 ? (
              <p className="text-sm text-muted text-center py-6 rounded-lg border border-border">
                لا توجد رواتب مسجلة لهذا الموظف
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border max-h-64 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>العنوان</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>أساسي</TableHead>
                      <TableHead>استقطاعات</TableHead>
                      <TableHead>الصافي</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.salaryExpenses.map((salary) => (
                      <TableRow key={salary.id}>
                        <TableCell>{salary.title}</TableCell>
                        <TableCell>{formatDate(salary.expenseDate)}</TableCell>
                        <TableCell>
                          {salary.baseSalary != null
                            ? formatCurrency(salary.baseSalary)
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {salary.deductionsTotal != null
                            ? formatCurrency(salary.deductionsTotal)
                            : "—"}
                        </TableCell>
                        <TableCell className="font-semibold text-gold">
                          {formatCurrency(salary.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>

          {data.employeeAdjustments.some((item) => item.settled) && (
            <section>
              <h3 className="text-sm font-semibold text-brown mb-3">
                استقطاعات مُسوّاة
              </h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {data.employeeAdjustments
                  .filter((item) => item.settled)
                  .map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                    >
                      <span>
                        {ADJUSTMENT_TYPE_LABELS[item.type]}
                        {item.title ? ` — ${item.title}` : ""}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge variant="success">مُسوّى</Badge>
                        <span className="font-medium text-muted">
                          {formatCurrency(item.amount)}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </section>
          )}

          <div className="flex justify-end">
            <Button type="button" variant="ghost" onClick={onClose}>
              إغلاق
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function InfoRow({
  label,
  value,
  dir,
}: {
  label: string;
  value: string;
  dir?: "ltr" | "rtl";
}) {
  return (
    <div className="rounded-lg border border-border px-4 py-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-sm font-medium text-brown" dir={dir}>
        {value}
      </p>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-cream/40 px-4 py-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold text-brown">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}
