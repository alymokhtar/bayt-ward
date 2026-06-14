"use server";

import { requireAuth } from "@/lib/auth";
import {
  getCachedDashboardKpis,
  getCachedDashboardStats,
  getCachedRecentSales,
  getCachedSalesChartData,
} from "@/lib/cached-queries";

function handleError(error: unknown): never {
  if (error instanceof Error) {
    if (error.message === "UNAUTHORIZED") {
      throw new Error("يجب تسجيل الدخول أولاً");
    }
    throw error;
  }
  throw new Error("حدث خطأ غير متوقع");
}

export async function getDashboardStats() {
  try {
    await requireAuth();
    return getCachedDashboardStats();
  } catch (error) {
    handleError(error);
  }
}

export async function getDashboardKpis() {
  try {
    await requireAuth();
    return getCachedDashboardKpis();
  } catch (error) {
    handleError(error);
  }
}

export async function getDashboardChartData() {
  try {
    await requireAuth();
    return getCachedSalesChartData();
  } catch (error) {
    handleError(error);
  }
}

export async function getDashboardRecentSales() {
  try {
    await requireAuth();
    return getCachedRecentSales();
  } catch (error) {
    handleError(error);
  }
}
