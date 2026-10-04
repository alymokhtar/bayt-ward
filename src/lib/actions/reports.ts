"use server";

import { Prisma, SaleStatus } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { getBusinessDayBoundsFromDateKeys } from "@/lib/business-day";
import { prisma } from "@/lib/prisma";
import {
  buildSalesChannelTrend,
  getSalesChannelWhere,
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
  return JSON.stringify({ from, to, channel });
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
    return getCachedTopProducts(
      JSON.stringify({
        from,
        to,
        limit,
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
    const { start, end } = getBusinessDayBoundsFromDateKeys(from, to);
    const where: Prisma.SaleWhereInput = {
      status: {
        in: [SaleStatus.COMPLETED, SaleStatus.PARTIALLY_REFUNDED, SaleStatus.REFUNDED],
      },
      createdAt: { gte: start, lt: end },
      ...getSalesChannelWhere(channel),
    };
    const sales = await prisma.sale.findMany({
      where,
      select: { channel: true, totalAmount: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    return buildSalesChannelTrend(sales, channel);
  } catch (error) {
    handleError(error);
  }
}
