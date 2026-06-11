import ExpensesClient from "@/app/(dashboard)/expenses/ExpensesClient";
import Button from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { getExpenses } from "@/lib/actions/expenses";
import { EXPENSE_CATEGORIES } from "@/lib/constants";

interface ExpensesPageProps {
  searchParams: Promise<{
    category?: string;
    from?: string;
    to?: string;
  }>;
}

export default async function ExpensesPage({
  searchParams,
}: ExpensesPageProps) {
  const params = await searchParams;
  const expenses = await getExpenses({
    category: params.category as
      | "RENT"
      | "UTILITIES"
      | "SALARIES"
      | "MARKETING"
      | "SUPPLIES"
      | "MAINTENANCE"
      | "OTHER"
      | undefined,
    from: params.from ? new Date(params.from) : undefined,
    to: params.to ? new Date(params.to + "T23:59:59") : undefined,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brown">المصروفات</h1>
        <p className="text-sm text-muted mt-1">تتبع مصروفات المتجر</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form className="flex flex-wrap gap-3 mb-6">
            <select
              name="category"
              defaultValue={params.category || ""}
              className="h-10 rounded-lg border border-border bg-white px-3 text-sm"
            >
              <option value="">كل التصنيفات</option>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <input
              type="date"
              name="from"
              defaultValue={params.from}
              className="h-10 rounded-lg border border-border bg-white px-3 text-sm"
            />
            <input
              type="date"
              name="to"
              defaultValue={params.to}
              className="h-10 rounded-lg border border-border bg-white px-3 text-sm"
            />
            <Button type="submit" variant="secondary">
              تصفية
            </Button>
          </form>
          <ExpensesClient expenses={expenses} />
        </CardContent>
      </Card>
    </div>
  );
}
