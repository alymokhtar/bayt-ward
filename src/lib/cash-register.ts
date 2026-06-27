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
    status: { in: ["COMPLETED" as const, "PARTIALLY_REFUNDED" as const, "REFUNDED" as const] },
    createdAt: { gte: start, lt: end },
    ...(paymentMethod && paymentMethod !== "ALL"
      ? { paymentMethod }
      : {}),
  };

  const returnWhere = {
    status: "APPROVED" as const,
    createdAt: { gte: start, lt: end },
    ...(paymentMethod && paymentMethod !== "ALL"
      ? { refundMethod: paymentMethod }
      : {}),
  };

  const [salesAgg, returnsAgg, expensesAgg, salesByMethod, returnsByMethod, salesList] = await Promise.all([
    prisma.sale.aggregate({
      where: saleWhere,
      _sum: { totalAmount: true },
      _count: true,
    }),
    prisma.return.aggregate({
      where: returnWhere,
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
        status: { in: ["COMPLETED", "PARTIALLY_REFUNDED", "REFUNDED"] },
        createdAt: { gte: start, lt: end },
      },
      _sum: { totalAmount: true },
      _count: true,
    }),
    prisma.return.groupBy({
      by: ["refundMethod"],
      where: {
        status: "APPROVED",
        createdAt: { gte: start, lt: end },
      },
      _sum: { refundAmount: true },
      _count: true,
    }),
    prisma.sale.findMany({
      where: saleWhere,
      select: {
        id: true,
        invoiceNumber: true,
        totalAmount: true,
        paymentMethod: true,
        status: true,
        createdAt: true,
        customer: { select: { name: true } },
        user: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const totalRevenue = salesAgg._sum.totalAmount ?? 0;
  const totalReturns = returnsAgg._sum.refundAmount ?? 0;
  const totalExpenses = expensesAgg._sum.amount ?? 0;

  const netRevenue = Math.max(0, totalRevenue - totalReturns - totalExpenses);

  const refundMap = new Map(
    returnsByMethod.map((r) => [r.refundMethod, r._sum.refundAmount ?? 0])
  );

  const paymentBreakdown = salesByMethod.map((group) => {
    const revenue = group._sum.totalAmount ?? 0;
    const refund = refundMap.get(group.paymentMethod) ?? 0;
    return {
      method: group.paymentMethod as PaymentMethod,
      revenue,
      refund,
      net: revenue - refund,
      count: group._count,
    };
  });

  const refundBreakdownRaw = returnsByMethod.map((group) => ({
    method: group.refundMethod as PaymentMethod,
    totalAmount: group._sum.refundAmount ?? 0,
    count: group._count,
  }));

  const refundBreakdown =
    paymentMethod && paymentMethod !== "ALL"
      ? refundBreakdownRaw.filter((r) => r.method === paymentMethod)
      : refundBreakdownRaw;

  return {
    from: fromKey,
    to: toKey,
    totalRevenue,
    totalExpenses,
    totalReturns,
    netRevenue,
    salesCount: salesAgg._count,
    returnsCount: returnsAgg._count,
    expensesCount: expensesAgg._count,
    paymentBreakdown,
    refundBreakdown,
    salesList,
  };
}
