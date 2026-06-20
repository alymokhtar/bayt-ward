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

function toReportParams(from?: string, to?: string) {
  return JSON.stringify({ from, to });
}

export async function getSalesReport(from?: string, to?: string) {
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

export async function getProfitReport(from?: string, to?: string) {
  try {
    await requireRole(["ADMIN", "MANAGER"]);
    return getCachedProfitReport(toReportParams(from, to));
  } catch (error) {
    handleError(error);
  }
}

export async function getTopProducts(from?: string, to?: string, limit = 10) {
  try {
    await requireRole(["ADMIN", "MANAGER"]);
    return getCachedTopProducts(
      JSON.stringify({
        from,
        to,
        limit,
      })
    );
  } catch (error) {
    handleError(error);
  }
}
