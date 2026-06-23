import {
  getBusinessDayBoundsFromDateKeys,
  getEgyptBusinessDateKey,
} from "@/lib/business-day";
import { prisma } from "@/lib/prisma";
import type { PaymentMethod } from "@prisma/client";

export async function getCashRegisterReview(
  from?: string,
  to?: string,
  paymentMethod?: PaymentMethod | "ALL"
) {
  const fromKey = from || getEgyptBusinessDateKey();
  const toKey = to || fromKey;
  const { start, end } = getBusinessDayBoundsFromDateKeys(fromKey, toKey);

  const saleWhere = {
    status: "COMPLETED" as const,
    createdAt: { gte: start, lt: end },
    ...(paymentMethod && paymentMethod !== "ALL"
      ? { paymentMethod }
      : {}),
  };

  const [salesAgg, returnsAgg, expensesAgg, salesByMethod] = await Promise.all([
    prisma.sale.aggregate({
      where: saleWhere,
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
    prisma.sale.groupBy({
      by: ["paymentMethod"],
      where: {
        status: "COMPLETED",
        createdAt: { gte: start, lt: end },
      },
      _sum: { totalAmount: true },
      _count: true,
    }),
  ]);

  const totalRevenue = salesAgg._sum.totalAmount ?? 0;
  const totalReturns = returnsAgg._sum.refundAmount ?? 0;
  const totalExpenses = expensesAgg._sum.amount ?? 0;

  const paymentBreakdown = salesByMethod.map((group) => ({
    method: group.paymentMethod as PaymentMethod,
    totalAmount: group._sum.totalAmount ?? 0,
    count: group._count,
  }));

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
    paymentBreakdown,
  };
}
