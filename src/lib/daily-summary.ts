import {
  BUSINESS_TIME_ZONE,
  dateKeyToUtcNoon,
  getEgyptBusinessDateKey,
  getEgyptBusinessDayBounds,
} from "@/lib/business-day";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";

export async function getDailySummary() {
  const { start, end } = getEgyptBusinessDayBounds();

  const [salesAgg, costOfGoodsSoldRows, expensesAgg] = await Promise.all([
    prisma.sale.aggregate({
      where: {
        status: "COMPLETED",
        createdAt: { gte: start, lt: end },
      },
      _sum: { totalAmount: true },
      _count: true,
    }),
    prisma.$queryRaw<[{ costOfGoodsSold: number }]>`
      SELECT COALESCE(SUM(si.quantity * pv."costPrice"), 0)::float AS "costOfGoodsSold"
      FROM "SaleItem" si
      INNER JOIN "Sale" s ON si."saleId" = s.id
      INNER JOIN "ProductVariant" pv ON si."variantId" = pv.id
      WHERE s.status = 'COMPLETED'
        AND s."createdAt" >= ${start}
        AND s."createdAt" < ${end}
    `,
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
  const costOfGoodsSold = costOfGoodsSoldRows[0]?.costOfGoodsSold ?? 0;
  const grossProfit = totalSales - costOfGoodsSold;

  return {
    totalSales,
    invoicesCount,
    totalExpenses,
    grossProfit,
    netProfit: grossProfit - totalExpenses,
  };
}

export function formatDailySummaryMessage(
  summary: Awaited<ReturnType<typeof getDailySummary>>,
  title = "📊 ملخص اليوم",
  footerLines: string[] = []
) {
  const businessDateKey = getEgyptBusinessDateKey();
  const businessDateLabel = dateKeyToUtcNoon(businessDateKey).toLocaleDateString(
    "ar-EG",
    {
      timeZone: BUSINESS_TIME_ZONE,
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );
  const sentAt = new Date().toLocaleString("ar-EG", {
    timeZone: BUSINESS_TIME_ZONE,
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
    `إجمالي الربح: ${formatCurrency(summary.grossProfit)}`,
    `صافي الربح: ${formatCurrency(summary.netProfit)}`,
    "",
    ...footerLines,
    `يوم العمل: ${businessDateLabel}`,
    `وقت الإرسال: ${sentAt}`,
  ].join("\n");
}
