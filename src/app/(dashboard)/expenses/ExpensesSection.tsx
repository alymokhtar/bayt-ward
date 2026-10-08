import ExpensesClient from "@/app/(dashboard)/expenses/ExpensesClient";
import { getExpenses } from "@/lib/actions/expenses";
import { getPayrollEmployees } from "@/lib/actions/employees";
import { getSession } from "@/lib/auth";
import type { ExpenseCategory } from "@prisma/client";

interface ExpensesSectionProps {
  category?: ExpenseCategory;
  from?: string;
  to?: string;
  page: number;
}

export default async function ExpensesSection({
  category,
  from,
  to,
  page,
}: ExpensesSectionProps) {
  const [expenses, payrollEmployees, session] = await Promise.all([
    getExpenses({
      category,
      from,
      to,
      page,
      pageSize: 50,
    }),
    getPayrollEmployees(),
    getSession(),
  ]);
  const canDelete = session?.role === "ADMIN";

  return (
    <ExpensesClient
      expenses={expenses.items}
      payrollEmployees={payrollEmployees}
      total={expenses.total}
      page={expenses.page}
      totalPages={expenses.totalPages}
      searchParams={{ category, from, to }}
      canDelete={canDelete}
    />
  );
}
