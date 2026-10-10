import {
  getBusinessDayBoundsFromDateKeys,
  getEgyptBusinessDateKey,
} from "@/lib/business-day";
import { prisma } from "@/lib/prisma";
import type { PaymentMethod } from "@prisma/client";

type CashRegisterPaymentMethod = PaymentMethod | "UNSPECIFIED";

export async function getCashRegisterReview(from?: string, to?: string) {
  const fromKey = from || getEgyptBusinessDateKey();
  const toKey = to || fromKey;
  const { start, end } = getBusinessDayBoundsFromDateKeys(fromKey, toKey);

  // ✅ فقط المبيعات المكتملة أو المرتجعة جزئياً (استثناء المعلقة والملغاة)
  const saleWhere = {
    status: { in: ["COMPLETED" as const, "PARTIALLY_REFUNDED" as const, "REFUNDED" as const] },
    createdAt: { gte: start, lt: end },
  };

  const [
    salesAgg,
    salesByMethod,
    returnsByMethod,
    expensesByMethod,
    exchangeSettlements,
    exchangeCount,
  ] = await Promise.all([
    prisma.sale.aggregate({
      where: saleWhere,
      _count: true,
    }),
    prisma.payment.groupBy({
      by: ["method"],
      where: {
        createdAt: { gte: start, lt: end },
        sale: {
          status: { in: ["COMPLETED", "PARTIALLY_REFUNDED", "REFUNDED"] },
          createdAt: { gte: start, lt: end },
          exchangeAsReplacement: null,
        },
      },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.return.groupBy({
      by: ["refundMethod"],
      where: {
        status: "APPROVED",
        createdAt: { gte: start, lt: end },
        exchange: null,
      },
      _sum: { refundAmount: true },
      _count: true,
    }),
    prisma.expense.groupBy({
      by: ["paymentMethod"],
      where: {
        expenseDate: { gte: start, lt: end },
      },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.exchangeSettlement.groupBy({
      by: ["method", "direction"],
      where: { createdAt: { gte: start, lt: end } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.exchange.count({
      where: { createdAt: { gte: start, lt: end } },
    }),
  ]);

  const totalPaymentRevenue = salesByMethod.reduce(
    (sum, group) => sum + (group._sum.amount ?? 0),
    0,
  );
  const totalReturnsAmount = returnsByMethod.reduce(
    (sum, group) => sum + (group._sum.refundAmount ?? 0),
    0,
  );
  const returnsCount = returnsByMethod.reduce(
    (sum, group) => sum + group._count,
    0,
  );
  const totalExpensesAmount = expensesByMethod.reduce(
    (sum, group) => sum + (group._sum.amount ?? 0),
    0,
  );
  const expensesCount = expensesByMethod.reduce(
    (sum, group) => sum + group._count,
    0,
  );

  const collections = exchangeSettlements.filter((row) => row.direction === "COLLECTION");
  const exchangeRefunds = exchangeSettlements.filter((row) => row.direction === "REFUND");
  const exchangeCollectionsTotal = collections.reduce(
    (sum, row) => sum + (row._sum.amount ?? 0),
    0,
  );
  const exchangeRefundsTotal = exchangeRefunds.reduce(
    (sum, row) => sum + (row._sum.amount ?? 0),
    0,
  );
  const totalRevenue = totalPaymentRevenue + exchangeCollectionsTotal;
  const totalReturns = totalReturnsAmount + exchangeRefundsTotal;
  const totalExpenses = totalExpensesAmount;

  const netRevenue = totalRevenue - totalReturns - totalExpenses;

  const refundMap = new Map<CashRegisterPaymentMethod, number>();
  for (const row of returnsByMethod) {
    refundMap.set(row.refundMethod ?? "UNSPECIFIED", row._sum.refundAmount ?? 0);
  }
  const collectionMap = new Map<PaymentMethod, number>();
  const exchangeRefundMap = new Map<PaymentMethod, number>();
  const settlementCountMap = new Map<PaymentMethod, number>();
  for (const settlement of exchangeSettlements) {
    const amount = settlement._sum.amount ?? 0;
    const amountMap = settlement.direction === "COLLECTION"
      ? collectionMap
      : exchangeRefundMap;
    amountMap.set(
      settlement.method,
      (amountMap.get(settlement.method) ?? 0) + amount,
    );
    settlementCountMap.set(
      settlement.method,
      (settlementCountMap.get(settlement.method) ?? 0) + settlement._count,
    );
  }
  for (const [method, amount] of exchangeRefundMap) {
    refundMap.set(method, (refundMap.get(method) ?? 0) + amount);
  }

  const expensesMap = new Map<CashRegisterPaymentMethod, number>(
    expensesByMethod.map(
      (expense): [CashRegisterPaymentMethod, number] => [
        expense.paymentMethod ?? "UNSPECIFIED",
        expense._sum.amount ?? 0,
      ],
    ),
  );

  const methods = new Set<CashRegisterPaymentMethod>([
    ...salesByMethod.map((group) => group.method),
    ...collectionMap.keys(),
    ...exchangeRefundMap.keys(),
    ...refundMap.keys(),
    ...expensesMap.keys(),
  ]);
  const paymentCountMap = new Map(
    salesByMethod.map((group) => [group.method, group._count]),
  );
  const paymentBreakdown = [...methods].map((method) => {
    const revenue = (salesByMethod.find((group) => group.method === method)?._sum.amount ?? 0)
      + (method === "UNSPECIFIED" ? 0 : collectionMap.get(method) ?? 0);
    const refund = refundMap.get(method) ?? 0;
    const expense = expensesMap.get(method) ?? 0;
    const exchangeCount =
      method === "UNSPECIFIED" ? 0 : settlementCountMap.get(method) ?? 0;
    const salePaymentCount =
      method === "UNSPECIFIED" ? 0 : paymentCountMap.get(method) ?? 0;
    return {
      method,
      revenue,
      refund,
      expense,
      net: revenue - refund - expense,
      count: salePaymentCount + exchangeCount,
    };
  });

  const refundBreakdownMap = new Map<
    CashRegisterPaymentMethod,
    { totalAmount: number; count: number }
  >();
  for (const group of returnsByMethod) {
    refundBreakdownMap.set(group.refundMethod ?? "UNSPECIFIED", {
      totalAmount: group._sum.refundAmount ?? 0,
      count: group._count,
    });
  }
  for (const group of exchangeRefunds) {
    const previous = refundBreakdownMap.get(group.method) ?? { totalAmount: 0, count: 0 };
    refundBreakdownMap.set(group.method, {
      totalAmount: previous.totalAmount + (group._sum.amount ?? 0),
      count: previous.count + group._count,
    });
  }
  const refundBreakdown = [...refundBreakdownMap].map(([method, totals]) => ({
    method,
    ...totals,
  }));

  return {
    from: fromKey,
    to: toKey,
    totalRevenue,
    totalExpenses,
    totalReturns,
    netRevenue,
    salesCount: salesAgg._count,
    returnsCount: returnsCount + exchangeCount,
    expensesCount,
    paymentBreakdown,
    refundBreakdown,
  };
}
