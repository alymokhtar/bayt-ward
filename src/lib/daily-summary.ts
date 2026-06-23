import {
  dateKeyToUtcNoon,
  getEgyptBusinessDateKey,
  getEgyptBusinessDayBounds,
} from "@/lib/business-day";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

export async function getDailySummary() {
  const { start, end } = getEgyptBusinessDayBounds();

  const [salesAgg, returnsAgg, costOfGoodsSoldRows, expensesAgg] =
    await Promise.all([
      prisma.sale.aggregate({
        where: {
          status: "COMPLETED",
          createdAt: { gte: start, lt: end },
        },
        _sum: { totalAmount: true },
        _count: true,
      }),
      prisma.return.aggregate({
        where: {
          status: "APPROVED",
          createdAt: { gte: start, lt: end },
        },
        _sum: { refundAmount: true },
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
  const totalReturns = returnsAgg._sum.refundAmount ?? 0;
  const invoicesCount = salesAgg._count;
  const totalExpenses = expensesAgg._sum.amount ?? 0;
  const costOfGoodsSold = costOfGoodsSoldRows[0]?.costOfGoodsSold ?? 0;
  const netRevenue = totalSales - totalReturns;
  const grossProfit = netRevenue - costOfGoodsSold;

  return {
    totalSales,
    totalReturns,
    invoicesCount,
    totalExpenses,
    netRevenue,
    costOfGoodsSold,
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
  const businessDateLabel = formatDate(dateKeyToUtcNoon(businessDateKey));
  const sentAt = formatDateTime(new Date());

  return [
    title,
    "",
    `إجمالي المبيعات: ${formatCurrency(summary.totalSales)}`,
    `المرتجعات: ${formatCurrency(summary.totalReturns)}`,
    `صافي الإيرادات: ${formatCurrency(summary.netRevenue)}`,
    `عدد الفواتير: ${summary.invoicesCount}`,
    `تكلفة البضاعة: ${formatCurrency(summary.costOfGoodsSold)}`,
    `إجمالي الربح: ${formatCurrency(summary.grossProfit)}`,
    `إجمالي المصروفات: ${formatCurrency(summary.totalExpenses)}`,
    `صافي الربح: ${formatCurrency(summary.netProfit)}`,
    "",
    ...footerLines,
    `يوم العمل: ${businessDateLabel}`,
    `وقت الإرسال: ${sentAt}`,
  ].join("\n");
}
