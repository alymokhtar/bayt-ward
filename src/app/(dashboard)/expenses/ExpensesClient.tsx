"use client";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import Badge from "@/components/ui/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { createExpense, deleteExpense } from "@/lib/actions/expenses";
import ExpenseDetailsModal from "@/app/(dashboard)/expenses/ExpenseDetailsModal";
import { getEmployeePayrollSummary } from "@/lib/actions/employees";
import {
  BUSINESS_TIME_ZONE,
  dateKeyToUtcNoon,
  getEgyptBusinessDateKey,
  parseDateKey,
} from "@/lib/business-day";
import { ADJUSTMENT_TYPE_LABELS, EXPENSE_CATEGORIES, DISPLAY_LOCALE } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type PayrollEmployee = {
  id: string;
  name: string;
  salary: number;
};

type Expense = {
  id: string;
  title: string;
  amount: number;
  category: string;
  description: string | null;
  expenseDate: Date;
  baseSalary: number | null;
  deductionsTotal: number | null;
  user: { name: string };
  employee: { id: string; name: string } | null;
};

type PayrollSummary = Awaited<ReturnType<typeof getEmployeePayrollSummary>>;

interface ExpensesClientProps {
  expenses: Expense[];
  payrollEmployees: PayrollEmployee[];
}

export default function ExpensesClient({
  expenses: initial,
  payrollEmployees,
}: ExpensesClientProps) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("OTHER");
  const [description, setDescription] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [expenseDate, setExpenseDate] = useState(getEgyptBusinessDateKey);
  const [payrollSummary, setPayrollSummary] = useState<PayrollSummary | null>(
    null
  );
  const [loadingPayroll, setLoadingPayroll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);

  const total = initial.reduce((s, e) => s + e.amount, 0);
  const isSalaryExpense = category === "SALARIES";

  const categoryLabel = (cat: string) =>
    EXPENSE_CATEGORIES.find((c) => c.value === cat)?.label || cat;

  useEffect(() => {
    if (!isSalaryExpense || !employeeId) {
      setPayrollSummary(null);
      return;
    }

    let cancelled = false;

    async function loadPayroll() {
      setLoadingPayroll(true);
      try {
        const summary = await getEmployeePayrollSummary(employeeId);
        if (!cancelled) {
          setPayrollSummary(summary);
          setAmount(summary.netSalary.toString());
          const { year, month } = parseDateKey(expenseDate);
          const monthLabel = new Date(Date.UTC(year, month - 1, 1, 12)).toLocaleDateString(
            DISPLAY_LOCALE,
            {
              timeZone: BUSINESS_TIME_ZONE,
              month: "long",
              year: "numeric",
            }
          );
          setTitle(`راتب ${summary.employee.name} - ${monthLabel}`);
        }
      } catch {
        if (!cancelled) setError("تعذر تحميل تفاصيل الراتب");
      } finally {
        if (!cancelled) setLoadingPayroll(false);
      }
    }

    loadPayroll();
    return () => {
      cancelled = true;
    };
  }, [employeeId, isSalaryExpense, expenseDate]);

  function openModal() {
    setTitle("");
    setAmount("");
    setCategory("OTHER");
    setDescription("");
    setEmployeeId("");
    setExpenseDate(getEgyptBusinessDateKey());
    setPayrollSummary(null);
    setError("");
    setModalOpen(true);
  }

  function handleCategoryChange(value: string) {
    setCategory(value);
    setEmployeeId("");
    setPayrollSummary(null);
    if (value !== "SALARIES") {
      setTitle("");
      setAmount("");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await createExpense({
      title,
      amount: parseFloat(amount) || 0,
      category: category as
        | "RENT"
        | "UTILITIES"
        | "SALARIES"
        | "MARKETING"
        | "SUPPLIES"
        | "MAINTENANCE"
        | "OTHER",
      description: description || undefined,
      expenseDate: dateKeyToUtcNoon(expenseDate),
      employeeId: isSalaryExpense ? employeeId : undefined,
    });

    setLoading(false);

    if (result.success) {
      setModalOpen(false);
      router.refresh();
    } else {
      setError(result.error ?? "حدث خطأ");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("حذف هذا المصروف؟")) return;
    const result = await deleteExpense(id);
    if (result.success) router.refresh();
    else alert(result.error);
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted">
          الإجمالي:{" "}
          <span className="font-bold text-gold text-lg">
            {formatCurrency(total)}
          </span>
        </p>
        <Button onClick={openModal}>
          <Plus className="h-4 w-4" />
          مصروف جديد
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>العنوان</TableHead>
            <TableHead>التصنيف</TableHead>
            <TableHead>الموظف</TableHead>
            <TableHead>المبلغ</TableHead>
            <TableHead>التاريخ</TableHead>
            <TableHead>بواسطة</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {initial.map((e) => (
            <TableRow key={e.id}>
              <TableCell>
                <button
                  type="button"
                  onClick={() => setSelectedExpenseId(e.id)}
                  className="font-medium text-gold hover:underline text-start"
                >
                  {e.title}
                </button>
                {e.description && (
                  <p className="text-xs text-muted">{e.description}</p>
                )}
                {e.baseSalary != null && e.deductionsTotal != null && (
                  <p className="text-xs text-muted mt-0.5">
                    أساسي {formatCurrency(e.baseSalary)} − استقطاعات{" "}
                    {formatCurrency(e.deductionsTotal)}
                  </p>
                )}
              </TableCell>
              <TableCell>
                <Badge variant="outline">{categoryLabel(e.category)}</Badge>
              </TableCell>
              <TableCell>{e.employee?.name || "—"}</TableCell>
              <TableCell className="font-semibold text-danger">
                {formatCurrency(e.amount)}
              </TableCell>
              <TableCell>{formatDate(e.expenseDate)}</TableCell>
              <TableCell>{e.user.name}</TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(e.id)}
                >
                  <Trash2 className="h-4 w-4 text-danger" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="مصروف جديد"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}

          <Select
            label="التصنيف"
            options={EXPENSE_CATEGORIES}
            value={category}
            onChange={(e) => handleCategoryChange(e.target.value)}
          />

          {isSalaryExpense && (
            <Select
              label="الموظف"
              options={payrollEmployees.map((e) => ({
                value: e.id,
                label: `${e.name} — ${formatCurrency(e.salary)}`,
              }))}
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              placeholder="اختر الموظف"
              required
            />
          )}

          {isSalaryExpense && employeeId && (
            <div className="rounded-lg border border-border bg-cream/40 p-4 space-y-3">
              {loadingPayroll ? (
                <p className="text-sm text-muted animate-pulse">
                  جاري حساب الراتب...
                </p>
              ) : payrollSummary ? (
                <>
                  <div className="grid gap-2 sm:grid-cols-3 text-sm">
                    <div>
                      <p className="text-muted">الراتب الأساسي</p>
                      <p className="font-semibold text-brown">
                        {formatCurrency(payrollSummary.employee.salary)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted">إجمالي الاستقطاعات</p>
                      <p className="font-semibold text-danger">
                        {formatCurrency(payrollSummary.totalDeductions)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted">صافي الراتب</p>
                      <p className="font-semibold text-gold text-lg">
                        {formatCurrency(payrollSummary.netSalary)}
                      </p>
                    </div>
                  </div>

                  {payrollSummary.pendingAdjustments.length > 0 ? (
                    <div className="border-t border-border pt-3">
                      <p className="text-xs font-medium text-brown mb-2">
                        تفاصيل الاستقطاعات المعلقة
                      </p>
                      <ul className="space-y-1.5">
                        {payrollSummary.pendingAdjustments.map((item) => (
                          <li
                            key={item.id}
                            className="flex items-center justify-between text-sm"
                          >
                            <span>
                              {ADJUSTMENT_TYPE_LABELS[item.type]}
                              {item.title ? ` — ${item.title}` : ""}
                            </span>
                            <span className="font-medium text-danger">
                              −{formatCurrency(item.amount)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-xs text-muted">
                      لا توجد سلف أو خصومات أو غياب معلقة
                    </p>
                  )}
                </>
              ) : null}
            </div>
          )}

          <Input
            label="العنوان"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <Input
            label={isSalaryExpense ? "صافي الراتب (المبلغ المدفوع)" : "المبلغ"}
            type="number"
            min={0}
            step={0.01}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            readOnly={isSalaryExpense && !!employeeId}
            hint={
              isSalaryExpense && employeeId
                ? "يُحسب تلقائياً من الراتب ناقص الاستقطاعات"
                : undefined
            }
          />
          <Input
            label="التاريخ"
            type="date"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
          />
          <Input
            label="الوصف"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              إلغاء
            </Button>
            <Button
              type="submit"
              loading={loading}
              disabled={isSalaryExpense && (!employeeId || loadingPayroll)}
            >
              حفظ
            </Button>
          </div>
        </form>
      </Modal>

      <ExpenseDetailsModal
        expenseId={selectedExpenseId}
        onClose={() => setSelectedExpenseId(null)}
      />
    </>
  );
}
