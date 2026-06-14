import { Suspense } from "react";
import Button from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import ExpensesSection from "@/app/(dashboard)/expenses/ExpensesSection";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import type { ExpenseCategory } from "@prisma/client";

interface ExpensesPageProps {
  searchParams: Promise<{
    category?: string;
    from?: string;
    to?: string;
  }>;
}

function TableSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-12 rounded-lg bg-brown/5" />
      ))}
    </div>
  );
}

export default async function ExpensesPage({
  searchParams,
}: ExpensesPageProps) {
  const params = await searchParams;
  const category = params.category as ExpenseCategory | undefined;
  const filterKey = `${params.category ?? ""}-${params.from ?? ""}-${params.to ?? ""}`;

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

          <Suspense key={filterKey} fallback={<TableSkeleton />}>
            <ExpensesSection
              category={category}
              from={params.from}
              to={params.to}
            />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
