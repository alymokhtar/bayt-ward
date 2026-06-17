import ExpensesClient from "@/app/(dashboard)/expenses/ExpensesClient";
import { getExpenses } from "@/lib/actions/expenses";
import { getPayrollEmployees } from "@/lib/actions/employees";
import type { ExpenseCategory } from "@prisma/client";

interface ExpensesSectionProps {
  category?: ExpenseCategory;
  from?: string;
  to?: string;
}

export default async function ExpensesSection({
  category,
  from,
  to,
}: ExpensesSectionProps) {
  const [expenses, payrollEmployees] = await Promise.all([
    getExpenses({
      category,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to + "T23:59:59") : undefined,
    }),
    getPayrollEmployees(),
  ]);

  return (
    <ExpensesClient expenses={expenses} payrollEmployees={payrollEmployees} />
  );
}
