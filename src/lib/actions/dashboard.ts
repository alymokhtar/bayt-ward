"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

function getDayBounds(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

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

    const now = new Date();
    const { start: todayStart, end: todayEnd } = getDayBounds(now);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const completedFilter = { status: "COMPLETED" as const };

    const [
      todaySalesAgg,
      monthSalesAgg,
      totalProducts,
      totalCustomers,
      recentSales,
      last7DaysSales,
    ] = await Promise.all([
      prisma.sale.aggregate({
        where: {
          ...completedFilter,
          createdAt: { gte: todayStart, lt: todayEnd },
        },
        _sum: { totalAmount: true },
        _count: true,
      }),
      prisma.sale.aggregate({
        where: {
          ...completedFilter,
          createdAt: { gte: monthStart, lt: monthEnd },
        },
        _sum: { totalAmount: true },
        _count: true,
      }),
      prisma.product.count({ where: { isActive: true } }),
      prisma.customer.count(),
      prisma.sale.findMany({
        where: completedFilter,
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          user: { select: { id: true, name: true } },
          _count: { select: { items: true } },
        },
      }),
      prisma.sale.findMany({
        where: {
          ...completedFilter,
          createdAt: {
            gte: new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate() - 6
            ),
          },
        },
        select: { totalAmount: true, createdAt: true },
      }),
    ]);

    const lowStockResult = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::int AS count
      FROM "ProductVariant"
      WHERE "isActive" = true
        AND "stockQuantity" <= "minStockLevel"
    `;
    const actualLowStockCount = Number(lowStockResult[0]?.count ?? 0);

    const salesChartData: { date: string; total: number; count: number }[] =
      [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now);
      day.setDate(day.getDate() - i);
      const { start, end } = getDayBounds(day);
      const daySales = last7DaysSales.filter(
        (s) => s.createdAt >= start && s.createdAt < end
      );
      salesChartData.push({
        date: start.toISOString().split("T")[0],
        total: daySales.reduce((sum, s) => sum + s.totalAmount, 0),
        count: daySales.length,
      });
    }

    return {
      todaySales: todaySalesAgg._sum.totalAmount ?? 0,
      todaySalesCount: todaySalesAgg._count,
      monthSales: monthSalesAgg._sum.totalAmount ?? 0,
      monthSalesCount: monthSalesAgg._count,
      totalProducts,
      lowStockCount: actualLowStockCount,
      totalCustomers,
      recentSales,
      salesChartData,
    };
  } catch (error) {
    handleError(error);
  }
}
