"use server";

import { requireRole } from "@/lib/auth";
import {
  getBusinessDayBoundsFromDateKeys,
  getEgyptBusinessDateKey,
  getReportPeriodRange,
  normalizeBusinessDateRange,
} from "@/lib/business-day";
import { prisma } from "@/lib/prisma";
import {
  buildNetSalesChannelTrend,
  type SalesChannelFilter,
} from "@/lib/sales-analytics";
import {
  getCachedSalesReport,
  getCachedInventoryReport,
  getCachedProfitReport,
  getCachedTopProducts,
} from "@/lib/cached-queries";

function handleError(error: unknown): never {
  if (error instanceof Error) {
    if (error.message === "UNAUTHORIZED") {
      throw new Error("يجب تسجيل الدخول أولاً");
    }
    if (error.message === "FORBIDDEN") {
      throw new Error("ليس لديك صلاحية لهذا الإجراء");
    }
    throw error;
  }
  throw new Error("حدث خطأ غير متوقع");
}

function toReportParams(from?: string, to?: string, channel: SalesChannelFilter = "ALL") {
  const range = validateReportDateRange(from, to);
  return JSON.stringify({ ...range, channel });
}

const MAX_REPORT_RANGE_DAYS = 366;

function validateReportDateRange(from?: string, to?: string) {
  const normalized = normalizeBusinessDateRange(from, to);
  const defaults = getReportPeriodRange("month");
  const range = {
    from: normalized.from ?? defaults.from,
    to: normalized.to ?? getEgyptBusinessDateKey(),
  };
  const startMs = Date.parse(`${range.from}T00:00:00.000Z`);
  const endMs = Date.parse(`${range.to}T00:00:00.000Z`);
  const days = Math.floor((endMs - startMs) / 86_400_000) + 1;

  if (days > MAX_REPORT_RANGE_DAYS) {
    throw new Error("أقصى فترة مسموحة للتقرير هي 366 يومًا");
  }

  return range;
}

export async function getSalesReport(
  from?: string,
  to?: string,
  channel: SalesChannelFilter = "ALL",
) {
  try {
    await requireRole(["ADMIN"]);
    return getCachedSalesReport(toReportParams(from, to, channel));
  } catch (error) {
    handleError(error);
  }
}

export async function getInventoryReport() {
  try {
    await requireRole(["ADMIN"]);
    return getCachedInventoryReport();
  } catch (error) {
    handleError(error);
  }
}

export async function getProfitReport(
  from?: string,
  to?: string,
  channel: SalesChannelFilter = "ALL",
) {
  try {
    await requireRole(["ADMIN"]);
    return getCachedProfitReport(toReportParams(from, to, channel));
  } catch (error) {
    handleError(error);
  }
}

export async function getTopProducts(
  from?: string,
  to?: string,
  limit = 10,
  channel: SalesChannelFilter = "ALL",
) {
  try {
    await requireRole(["ADMIN"]);
    const range = validateReportDateRange(from, to);
    return getCachedTopProducts(
      JSON.stringify({
        ...range,
        limit: Number.isFinite(limit) ? Math.min(Math.max(Math.floor(limit), 1), 50) : 10,
        channel,
      })
    );
  } catch (error) {
    handleError(error);
  }
}

export async function getSalesChannelTrend(
  from?: string,
  to?: string,
  channel: SalesChannelFilter = "ALL",
) {
  try {
    await requireRole(["ADMIN"]);
    const range = validateReportDateRange(from, to);
    const { start, end } = getBusinessDayBoundsFromDateKeys(
      range.from,
      range.to
    );
    const dailyTotals = await prisma.$queryRaw<
      Array<{ date: string; channel: "POS" | "ONLINE"; revenue: number }>
    >`
      WITH daily_sales AS (
        SELECT
          ((s."createdAt" AT TIME ZONE 'Africa/Cairo') - INTERVAL '3 hours')::date::text AS date,
          s.channel::text AS channel,
          SUM(s."totalAmount")::float AS revenue
        FROM "Sale" s
        WHERE s.status IN ('COMPLETED', 'PARTIALLY_REFUNDED', 'REFUNDED')
          AND s."createdAt" >= ${start}
          AND s."createdAt" < ${end}
          AND (${channel === "ALL"} OR s.channel::text = ${channel})
        GROUP BY date, s.channel
      ),
      daily_returns AS (
        SELECT
          ((r."createdAt" AT TIME ZONE 'Africa/Cairo') - INTERVAL '3 hours')::date::text AS date,
          s.channel::text AS channel,
          -SUM(r."refundAmount")::float AS revenue
        FROM "Return" r
        INNER JOIN "Sale" s ON s.id = r."saleId"
        WHERE r.status = 'APPROVED'
          AND r."createdAt" >= ${start}
          AND r."createdAt" < ${end}
          AND (${channel === "ALL"} OR s.channel::text = ${channel})
        GROUP BY date, s.channel
      )
      SELECT date, channel, SUM(revenue)::float AS revenue
      FROM (
        SELECT date, channel, revenue FROM daily_sales
        UNION ALL
        SELECT date, channel, revenue FROM daily_returns
      ) movements
      GROUP BY date, channel
      ORDER BY date, channel
    `;

    return buildNetSalesChannelTrend(
      dailyTotals,
      channel,
      range.from,
      range.to
    );
  } catch (error) {
    handleError(error);
  }
}
