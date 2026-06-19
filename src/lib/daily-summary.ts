import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";

function getEgyptDayBounds(date = new Date()) {
  const now = new Date(
    date.toLocaleString("en-US", { timeZone: "Africa/Cairo" })
  );
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export async function getDailySummary() {
  const { start, end } = getEgyptDayBounds();

  const [salesAgg, expensesAgg] = await Promise.all([
    prisma.sale.aggregate({
      where: {
        status: "COMPLETED",
        createdAt: { gte: start, lt: end },
      },
      _sum: { totalAmount: true },
      _count: true,
    }),
    prisma.expense.aggregate({
      where: {
        expenseDate: { gte: start, lt: end },
      },
      _sum: { amount: true },
    }),
  ]);

  const totalSales = salesAgg._sum.totalAmount ?? 0;
  const invoicesCount = salesAgg._count;
  const totalExpenses = expensesAgg._sum.amount ?? 0;

  return {
    totalSales,
    invoicesCount,
    totalExpenses,
    netProfit: totalSales - totalExpenses,
  };
}

export function formatDailySummaryMessage(
  summary: Awaited<ReturnType<typeof getDailySummary>>,
  title = "📊 ملخص اليوم",
  footerLines: string[] = []
) {
  const egyptDate = new Date().toLocaleString("ar-EG", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return [
    title,
    "",
    `إجمالي المبيعات: ${formatCurrency(summary.totalSales)}`,
    `عدد الفواتير: ${summary.invoicesCount}`,
    `إجمالي المصروفات: ${formatCurrency(summary.totalExpenses)}`,
    `صافي الربح: ${formatCurrency(summary.netProfit)}`,
    "",
    ...footerLines,
    `التاريخ: ${egyptDate}`,
  ].join("\n");
}
