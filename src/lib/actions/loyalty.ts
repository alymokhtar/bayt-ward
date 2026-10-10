"use server";

import {
  formatEgyptChartDateLabel,
  getBusinessDayBoundsFromDateKeys,
  getReportPeriodRange,
  normalizeBusinessDateRange,
} from "@/lib/business-day";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const MAX_ANALYTICS_RANGE_DAYS = 366;

export type LoyaltyAnalyticsRange = {
  from?: string;
  to?: string;
};

function getAnalyticsRange(dateRange?: LoyaltyAnalyticsRange) {
  const normalized = normalizeBusinessDateRange(dateRange?.from, dateRange?.to);
  const defaultRange = getReportPeriodRange("month");
  const range = {
    from: normalized.from ?? defaultRange.from,
    to: normalized.to ?? defaultRange.to,
  };
  const rangeDays =
    Math.floor(
      (Date.parse(`${range.to}T00:00:00.000Z`) -
        Date.parse(`${range.from}T00:00:00.000Z`)) /
        86_400_000,
    ) + 1;

  if (rangeDays > MAX_ANALYTICS_RANGE_DAYS) {
    throw new Error("أقصى فترة لتحليل الولاء هي 366 يوماً");
  }

  return { ...range, rangeDays, ...getBusinessDayBoundsFromDateKeys(range.from, range.to) };
}

function getPeriodKeys(from: string, to: string, monthly: boolean) {
  const keys: string[] = [];
  const current = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);

  if (monthly) current.setUTCDate(1);
  while (current <= end) {
    keys.push(
      monthly
        ? current.toISOString().slice(0, 7)
        : current.toISOString().slice(0, 10),
    );
    if (monthly) current.setUTCMonth(current.getUTCMonth() + 1);
    else current.setUTCDate(current.getUTCDate() + 1);
  }
  return keys;
}

function formatAnalyticsPeriodLabel(period: string, monthly: boolean) {
  if (!monthly) return formatEgyptChartDateLabel(period);
  return new Date(`${period}-01T12:00:00.000Z`).toLocaleDateString("ar-EG-u-nu-latn", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export async function getLoyaltyAnalytics(dateRange?: LoyaltyAnalyticsRange) {
  await requireRole(["ADMIN"]);
  const range = getAnalyticsRange(dateRange);
  const monthly = range.rangeDays > 62;
  const periodExpression = monthly
    ? Prisma.sql`to_char(date_trunc('month', ("createdAt" AT TIME ZONE 'Africa/Cairo') - interval '3 hours'), 'YYYY-MM')`
    : Prisma.sql`to_char((("createdAt" AT TIME ZONE 'Africa/Cairo') - interval '3 hours')::date, 'YYYY-MM-DD')`;

  const [transactionTotals, customerGroups, discountTotal, outstanding, trendRows] =
    await Promise.all([
      prisma.loyaltyTransaction.groupBy({
        by: ["type"],
        where: { createdAt: { gte: range.start, lt: range.end } },
        _sum: { points: true },
      }),
      prisma.loyaltyTransaction.groupBy({
        by: ["customerId", "type"],
        where: {
          createdAt: { gte: range.start, lt: range.end },
          type: { in: ["EARN", "REDEEM"] },
        },
        _sum: { points: true },
      }),
      prisma.sale.aggregate({
        where: {
          createdAt: { gte: range.start, lt: range.end },
          status: { not: "CANCELLED" },
          loyaltyDiscountAmount: { gt: 0 },
        },
        _sum: { loyaltyDiscountAmount: true },
      }),
      prisma.customer.aggregate({
        where: { loyaltyPoints: { gt: 0 } },
        _sum: { loyaltyPoints: true },
      }),
      prisma.$queryRaw<Array<{ period: string; earned: number; redeemed: number }>>`
        SELECT ${periodExpression} AS period,
          COALESCE(SUM(CASE WHEN "type" = 'EARN' THEN "points" ELSE 0 END), 0)::int AS earned,
          COALESCE(SUM(CASE WHEN "type" = 'REDEEM' THEN -"points" ELSE 0 END), 0)::int AS redeemed
        FROM "LoyaltyTransaction"
        WHERE "createdAt" >= ${range.start} AND "createdAt" < ${range.end}
          AND "type" IN ('EARN', 'REDEEM')
        GROUP BY period
        ORDER BY period
      `,
    ]);

  const totalsByType = new Map(
    transactionTotals.map((entry) => [entry.type, entry._sum.points ?? 0]),
  );
  const totalEarnedPoints = totalsByType.get("EARN") ?? 0;
  const totalRedeemedPoints = Math.abs(totalsByType.get("REDEEM") ?? 0);

  const topCustomersById = new Map<
    string,
    { earnedPoints: number; redeemedPoints: number }
  >();
  for (const group of customerGroups) {
    const totals = topCustomersById.get(group.customerId) ?? {
      earnedPoints: 0,
      redeemedPoints: 0,
    };
    if (group.type === "EARN") totals.earnedPoints += group._sum.points ?? 0;
    if (group.type === "REDEEM") totals.redeemedPoints += Math.abs(group._sum.points ?? 0);
    topCustomersById.set(group.customerId, totals);
  }

  const topCustomerIds = [...topCustomersById.entries()]
    .sort(([, left], [, right]) =>
      right.earnedPoints + right.redeemedPoints -
      (left.earnedPoints + left.redeemedPoints),
    )
    .slice(0, 10)
    .map(([customerId]) => customerId);
  const customers = await prisma.customer.findMany({
    where: { id: { in: topCustomerIds } },
    select: { id: true, name: true, phone: true, loyaltyPoints: true },
  });
  const customerById = new Map(customers.map((customer) => [customer.id, customer]));
  const topCustomers = topCustomerIds.flatMap((customerId) => {
    const customer = customerById.get(customerId);
    const totals = topCustomersById.get(customerId);
    return customer && totals
      ? [{ ...customer, ...totals }]
      : [];
  });
  const trendByPeriod = new Map(trendRows.map((row) => [row.period, row]));
  const trend = getPeriodKeys(range.from, range.to, monthly).map((period) => {
    const values = trendByPeriod.get(period);
    return {
      period,
      label: formatAnalyticsPeriodLabel(period, monthly),
      earned: values?.earned ?? 0,
      redeemed: values?.redeemed ?? 0,
    };
  });

  return {
    range: { from: range.from, to: range.to },
    totalEarnedPoints,
    totalRedeemedPoints,
    totalDiscountValue: discountTotal._sum.loyaltyDiscountAmount ?? 0,
    redemptionRate:
      totalEarnedPoints > 0
        ? (totalRedeemedPoints / totalEarnedPoints) * 100
        : 0,
    outstandingBalance: outstanding._sum.loyaltyPoints ?? 0,
    topCustomers,
    trend,
    trendGranularity: monthly ? "monthly" as const : "daily" as const,
  };
}

export async function getCustomerLoyaltySummary(customerId: string) {
  await requireRole(["ADMIN", "MANAGER", "CASHIER"]);
  if (!customerId?.trim()) {
    throw new Error("معرّف العميل غير صالح");
  }

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: {
      id: true,
      name: true,
      loyaltyPoints: true,
      loyaltyTransactions: {
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          saleId: true,
          type: true,
          points: true,
          balanceAfter: true,
          reason: true,
          createdAt: true,
          sale: { select: { invoiceNumber: true } },
        },
      },
    },
  });

  if (!customer) {
    throw new Error("العميل غير موجود");
  }

  return customer;
}
