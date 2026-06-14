"use server";

import { requireRole } from "@/lib/auth";
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

function toReportParams(from?: Date, to?: Date) {
  return JSON.stringify({
    from: from?.toISOString(),
    to: to?.toISOString(),
  });
}

export async function getSalesReport(from?: Date, to?: Date) {
  try {
    await requireRole(["ADMIN", "MANAGER"]);
    return getCachedSalesReport(toReportParams(from, to));
  } catch (error) {
    handleError(error);
  }
}

export async function getInventoryReport() {
  try {
    await requireRole(["ADMIN", "MANAGER"]);
    return getCachedInventoryReport();
  } catch (error) {
    handleError(error);
  }
}

export async function getProfitReport(from?: Date, to?: Date) {
  try {
    await requireRole(["ADMIN", "MANAGER"]);
    return getCachedProfitReport(toReportParams(from, to));
  } catch (error) {
    handleError(error);
  }
}

export async function getTopProducts(from?: Date, to?: Date, limit = 10) {
  try {
    await requireRole(["ADMIN", "MANAGER"]);
    return getCachedTopProducts(
      JSON.stringify({
        from: from?.toISOString(),
        to: to?.toISOString(),
        limit,
      })
    );
  } catch (error) {
    handleError(error);
  }
}
