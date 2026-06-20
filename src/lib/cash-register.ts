import {
  getBusinessDayBoundsFromDateKeys,
  getEgyptBusinessDateKey,
} from "@/lib/business-day";
import { prisma } from "@/lib/prisma";

export async function getCashRegisterReview(from?: string, to?: string) {
  const fromKey = from || getEgyptBusinessDateKey();
  const toKey = to || fromKey;
  const { start, end } = getBusinessDayBoundsFromDateKeys(fromKey, toKey);

  const [salesAgg, returnsAgg, expensesAgg] = await Promise.all([
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
    prisma.expense.aggregate({
      where: {
        expenseDate: { gte: start, lt: end },
      },
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  const totalRevenue = salesAgg._sum.totalAmount ?? 0;
  const totalReturns = returnsAgg._sum.refundAmount ?? 0;
  const totalExpenses = expensesAgg._sum.amount ?? 0;

  return {
    from: fromKey,
    to: toKey,
    totalRevenue,
    totalExpenses,
    totalReturns,
    netRevenue: totalRevenue - totalReturns - totalExpenses,
    salesCount: salesAgg._count,
    returnsCount: returnsAgg._count,
    expensesCount: expensesAgg._count,
  };
}
