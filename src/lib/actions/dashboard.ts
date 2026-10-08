"use server";

import type { UserRole } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import {
  getCachedDashboardKpis,
  getCachedDashboardStats,
  getCachedRecentSales,
  getCachedSalesChartData,
} from "@/lib/cached-queries";
import type { DashboardResult } from "@/lib/dashboard-result";

type DashboardKpis = Awaited<ReturnType<typeof getCachedDashboardKpis>>;
type DashboardKpisForRole =
  | {
      role: "CASHIER";
      kpis: Omit<DashboardKpis, "monthSales" | "monthSalesCount">;
    }
  | {
      role: Exclude<UserRole, "CASHIER">;
      kpis: DashboardKpis;
    };

function filterDashboardKpis(
  role: UserRole,
  kpis: DashboardKpis
): DashboardKpisForRole {
  if (role === "CASHIER") {
    return {
      role,
      kpis: {
        todayGrossSales: kpis.todayGrossSales,
        todayReturns: kpis.todayReturns,
        todayExpenses: kpis.todayExpenses,
        todayNetSales: kpis.todayNetSales,
        todaySalesCount: kpis.todaySalesCount,
        totalProducts: kpis.totalProducts,
        totalCustomers: kpis.totalCustomers,
        lowStockCount: kpis.lowStockCount,
      },
    };
  }

  return { role, kpis };
}

function reportDashboardError(section: string, error: unknown) {
  console.error(`Failed to load dashboard ${section}`, error);
  return { success: false as const, error: { message: "تعذر تحميل البيانات." } };
}

export async function getDashboardStats() {
  const user = await requireAuth();
  try {
    const stats = await getCachedDashboardStats();
    const { recentSales, salesChartData, ...kpis } = stats;
    return {
      success: true as const,
      data: {
        ...filterDashboardKpis(user.role, kpis),
        recentSales,
        salesChartData,
      },
    };
  } catch (error) {
    return reportDashboardError("stats", error);
  }
}

export async function getDashboardKpis(): Promise<
  DashboardResult<DashboardKpisForRole>
> {
  const user = await requireAuth();
  try {
    return {
      success: true,
      data: filterDashboardKpis(user.role, await getCachedDashboardKpis()),
    };
  } catch (error) {
    return reportDashboardError("KPIs", error);
  }
}

export async function getDashboardChartData() {
  await requireAuth();
  try {
    return { success: true as const, data: await getCachedSalesChartData() };
  } catch (error) {
    return reportDashboardError("sales chart", error);
  }
}

export async function getDashboardRecentSales() {
  await requireAuth();
  return getCachedRecentSales();
}
