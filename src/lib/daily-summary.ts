import {
  dateKeyToUtcNoon,
  getEgyptBusinessDateKey,
  getEgyptBusinessDayBounds,
} from "@/lib/business-day";
import { prisma } from "@/lib/prisma";
import {
  calculateCostOfGoodsSoldFromSnapshots,
  calculateNetSales,
} from "@/lib/report-math";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

export async function getDailySummary() {
  try {
    const { start, end } = getEgyptBusinessDayBounds();

  const [salesAgg, returnsAgg, costOfGoodsSoldRows, returnedCogsRows, expensesAgg] =
    await Promise.all([
      prisma.sale.aggregate({
        where: {
          status: { in: ["COMPLETED", "PARTIALLY_REFUNDED", "REFUNDED"] },
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
      SELECT COALESCE(SUM(si.quantity * si."costPrice"), 0)::float AS "costOfGoodsSold"
      FROM "SaleItem" si
      INNER JOIN "Sale" s ON si."saleId" = s.id
      WHERE s.status IN ('COMPLETED', 'PARTIALLY_REFUNDED', 'REFUNDED')
        AND s."createdAt" >= ${start}
        AND s."createdAt" < ${end}
    `,
      prisma.$queryRaw<[{ returnedCogs: number }]>`
      SELECT COALESCE(SUM(ri.quantity * ri."costPrice"), 0)::float AS "returnedCogs"
      FROM "ReturnItem" ri
      INNER JOIN "Return" r ON ri."returnId" = r.id
      WHERE r.status = 'APPROVED'
        AND r."createdAt" >= ${start}
        AND r."createdAt" < ${end}
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
  const totalCogs = costOfGoodsSoldRows[0]?.costOfGoodsSold ?? 0;
  const returnedCogs = returnedCogsRows[0]?.returnedCogs ?? 0;
  const costOfGoodsSold = calculateCostOfGoodsSoldFromSnapshots(totalCogs, returnedCogs);
  const netRevenue = calculateNetSales(totalSales, totalReturns);
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
  } catch (error) {
    console.error("❌ Error in getDailySummary:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    // إرجاع ملخص فارغ بدلاً من انهيار الدالة
    return {
      totalSales: 0,
      totalReturns: 0,
      invoicesCount: 0,
      totalExpenses: 0,
      netRevenue: 0,
      costOfGoodsSold: 0,
      grossProfit: 0,
      netProfit: 0,
    };
  }
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
