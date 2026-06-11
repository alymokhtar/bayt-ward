"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

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

function getDateRange(from?: Date, to?: Date) {
  const start = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  start.setHours(0, 0, 0, 0);

  const end = to ? new Date(to) : new Date();
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

export async function getSalesReport(from?: Date, to?: Date) {
  try {
    await requireRole(["ADMIN", "MANAGER"]);

    const { start, end } = getDateRange(from, to);

    const [sales, returns, byPaymentMethod] = await Promise.all([
      prisma.sale.aggregate({
        where: {
          status: "COMPLETED",
          createdAt: { gte: start, lte: end },
        },
        _sum: {
          totalAmount: true,
          subtotal: true,
          discountAmount: true,
          taxAmount: true,
        },
        _count: true,
        _avg: { totalAmount: true },
      }),
      prisma.return.aggregate({
        where: {
          status: "APPROVED",
          createdAt: { gte: start, lte: end },
        },
        _sum: { refundAmount: true, totalAmount: true },
        _count: true,
      }),
      prisma.sale.groupBy({
        by: ["paymentMethod"],
        where: {
          status: "COMPLETED",
          createdAt: { gte: start, lte: end },
        },
        _sum: { totalAmount: true },
        _count: true,
      }),
    ]);

    const grossSales = sales._sum.totalAmount ?? 0;
    const totalReturns = returns._sum.refundAmount ?? 0;

    return {
      period: { from: start, to: end },
      totalSales: grossSales,
      salesCount: sales._count,
      averageSale: sales._avg.totalAmount ?? 0,
      totalDiscount: sales._sum.discountAmount ?? 0,
      totalTax: sales._sum.taxAmount ?? 0,
      netSales: grossSales - totalReturns,
      returnsCount: returns._count,
      totalReturns,
      byPaymentMethod: byPaymentMethod.map((item) => ({
        method: item.paymentMethod,
        total: item._sum.totalAmount ?? 0,
        count: item._count,
      })),
    };
  } catch (error) {
    handleError(error);
  }
}

export async function getInventoryReport() {
  try {
    await requireRole(["ADMIN", "MANAGER"]);

    const variants = await prisma.productVariant.findMany({
      where: {
        isActive: true,
        product: { isActive: true },
      },
      include: {
        product: {
          include: { category: true },
        },
      },
    });

    const totalItems = variants.reduce((sum, v) => sum + v.stockQuantity, 0);
    const totalCostValue = variants.reduce(
      (sum, v) => sum + v.stockQuantity * v.costPrice,
      0
    );
    const totalRetailValue = variants.reduce(
      (sum, v) => sum + v.stockQuantity * v.sellingPrice,
      0
    );

    const lowStockItems = variants
      .filter((v) => v.stockQuantity <= v.minStockLevel)
      .map((v) => ({
        id: v.id,
        sku: v.sku,
        productName: v.product.nameAr || v.product.name,
        size: v.size,
        color: v.color,
        stockQuantity: v.stockQuantity,
        minStockLevel: v.minStockLevel,
        category: v.product.category.nameAr || v.product.category.name,
      }))
      .sort((a, b) => a.stockQuantity - b.stockQuantity);

    const outOfStockItems = variants.filter((v) => v.stockQuantity === 0).length;

    const byCategory = variants.reduce(
      (acc, v) => {
        const catName = v.product.category.nameAr || v.product.category.name;
        if (!acc[catName]) {
          acc[catName] = { quantity: 0, costValue: 0, retailValue: 0 };
        }
        acc[catName].quantity += v.stockQuantity;
        acc[catName].costValue += v.stockQuantity * v.costPrice;
        acc[catName].retailValue += v.stockQuantity * v.sellingPrice;
        return acc;
      },
      {} as Record<
        string,
        { quantity: number; costValue: number; retailValue: number }
      >
    );

    return {
      totalVariants: variants.length,
      totalItems,
      totalCostValue,
      totalRetailValue,
      potentialProfit: totalRetailValue - totalCostValue,
      lowStockCount: lowStockItems.length,
      outOfStockCount: outOfStockItems,
      lowStockItems,
      byCategory: Object.entries(byCategory).map(([category, data]) => ({
        category,
        ...data,
      })),
    };
  } catch (error) {
    handleError(error);
  }
}

export async function getProfitReport(from?: Date, to?: Date) {
  try {
    await requireRole(["ADMIN", "MANAGER"]);

    const { start, end } = getDateRange(from, to);

    const completedSales = await prisma.sale.findMany({
      where: {
        status: "COMPLETED",
        createdAt: { gte: start, lte: end },
      },
      include: {
        items: {
          include: {
            variant: { select: { costPrice: true } },
          },
        },
      },
    });

    const revenue = completedSales.reduce((sum, s) => sum + s.totalAmount, 0);
    const costOfGoodsSold = completedSales.reduce(
      (sum, sale) =>
        sum +
        sale.items.reduce(
          (itemSum, item) =>
            itemSum + item.quantity * item.variant.costPrice,
          0
        ),
      0
    );

    const [returns, expenses, purchases] = await Promise.all([
      prisma.return.aggregate({
        where: {
          status: "APPROVED",
          createdAt: { gte: start, lte: end },
        },
        _sum: { refundAmount: true },
      }),
      prisma.expense.aggregate({
        where: {
          expenseDate: { gte: start, lte: end },
        },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.purchase.aggregate({
        where: {
          status: "RECEIVED",
          receivedAt: { gte: start, lte: end },
        },
        _sum: { totalAmount: true },
        _count: true,
      }),
    ]);

    const totalReturns = returns._sum.refundAmount ?? 0;
    const totalExpenses = expenses._sum.amount ?? 0;
    const grossProfit = revenue - costOfGoodsSold;
    const netProfit = grossProfit - totalReturns - totalExpenses;

    return {
      period: { from: start, to: end },
      revenue,
      costOfGoodsSold,
      grossProfit,
      totalReturns,
      totalExpenses,
      expensesCount: expenses._count,
      netProfit,
      profitMargin: revenue > 0 ? (netProfit / revenue) * 100 : 0,
      purchasesTotal: purchases._sum.totalAmount ?? 0,
      purchasesCount: purchases._count,
    };
  } catch (error) {
    handleError(error);
  }
}

export async function getTopProducts(
  from?: Date,
  to?: Date,
  limit = 10
) {
  try {
    await requireRole(["ADMIN", "MANAGER"]);

    const { start, end } = getDateRange(from, to);

    const saleItems = await prisma.saleItem.findMany({
      where: {
        sale: {
          status: "COMPLETED",
          createdAt: { gte: start, lte: end },
        },
      },
      include: {
        variant: {
          include: {
            product: {
              select: { id: true, name: true, nameAr: true },
            },
          },
        },
      },
    });

    const productMap = new Map<
      string,
      {
        productId: string;
        productName: string;
        quantitySold: number;
        revenue: number;
        profit: number;
      }
    >();

    for (const item of saleItems) {
      const productId = item.variant.product.id;
      const productName =
        item.variant.product.nameAr || item.variant.product.name;
      const profit =
        (item.unitPrice - item.variant.costPrice) * item.quantity -
        item.discountAmount;

      const existing = productMap.get(productId);
      if (existing) {
        existing.quantitySold += item.quantity;
        existing.revenue += item.totalPrice;
        existing.profit += profit;
      } else {
        productMap.set(productId, {
          productId,
          productName,
          quantitySold: item.quantity,
          revenue: item.totalPrice,
          profit,
        });
      }
    }

    return [...productMap.values()]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  } catch (error) {
    handleError(error);
  }
}
