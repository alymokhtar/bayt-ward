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

    const [summaryRows, lowStockCountRows, lowStockItems, byCategoryRows] =
      await Promise.all([
      prisma.$queryRaw<
        [
          {
            totalVariants: number;
            totalItems: number;
            totalCostValue: number;
            totalRetailValue: number;
            outOfStockCount: number;
          },
        ]
      >`
        SELECT
          COUNT(*)::int AS "totalVariants",
          COALESCE(SUM(pv."stockQuantity"), 0)::int AS "totalItems",
          COALESCE(SUM(pv."stockQuantity" * pv."costPrice"), 0)::float AS "totalCostValue",
          COALESCE(SUM(pv."stockQuantity" * pv."sellingPrice"), 0)::float AS "totalRetailValue",
          COUNT(*) FILTER (WHERE pv."stockQuantity" = 0)::int AS "outOfStockCount"
        FROM "ProductVariant" pv
        INNER JOIN "Product" p ON pv."productId" = p.id
        WHERE pv."isActive" = true AND p."isActive" = true
      `,
      prisma.$queryRaw<[{ count: number }]>`
        SELECT COUNT(*)::int AS count
        FROM "ProductVariant" pv
        INNER JOIN "Product" p ON pv."productId" = p.id
        WHERE pv."isActive" = true
          AND p."isActive" = true
          AND pv."stockQuantity" <= pv."minStockLevel"
      `,
      prisma.$queryRaw<
        {
          id: string;
          sku: string;
          productName: string;
          size: string;
          color: string;
          stockQuantity: number;
          minStockLevel: number;
          category: string;
        }[]
      >`
        SELECT
          pv.id,
          pv.sku,
          COALESCE(p."nameAr", p.name) AS "productName",
          pv.size,
          pv.color,
          pv."stockQuantity" AS "stockQuantity",
          pv."minStockLevel" AS "minStockLevel",
          COALESCE(c."nameAr", c.name) AS category
        FROM "ProductVariant" pv
        INNER JOIN "Product" p ON pv."productId" = p.id
        INNER JOIN "Category" c ON p."categoryId" = c.id
        WHERE pv."isActive" = true
          AND p."isActive" = true
          AND pv."stockQuantity" <= pv."minStockLevel"
        ORDER BY pv."stockQuantity" ASC
        LIMIT 200
      `,
      prisma.$queryRaw<
        {
          category: string;
          quantity: number;
          costValue: number;
          retailValue: number;
        }[]
      >`
        SELECT
          COALESCE(c."nameAr", c.name) AS category,
          COALESCE(SUM(pv."stockQuantity"), 0)::int AS quantity,
          COALESCE(SUM(pv."stockQuantity" * pv."costPrice"), 0)::float AS "costValue",
          COALESCE(SUM(pv."stockQuantity" * pv."sellingPrice"), 0)::float AS "retailValue"
        FROM "ProductVariant" pv
        INNER JOIN "Product" p ON pv."productId" = p.id
        INNER JOIN "Category" c ON p."categoryId" = c.id
        WHERE pv."isActive" = true AND p."isActive" = true
        GROUP BY c.id, c."nameAr", c.name
        ORDER BY category ASC
      `,
    ]);

    const summary = summaryRows[0];
    const totalCostValue = summary?.totalCostValue ?? 0;
    const totalRetailValue = summary?.totalRetailValue ?? 0;

    return {
      totalVariants: summary?.totalVariants ?? 0,
      totalItems: summary?.totalItems ?? 0,
      totalCostValue,
      totalRetailValue,
      potentialProfit: totalRetailValue - totalCostValue,
      lowStockCount: lowStockCountRows[0]?.count ?? 0,
      outOfStockCount: summary?.outOfStockCount ?? 0,
      lowStockItems,
      byCategory: byCategoryRows,
    };
  } catch (error) {
    handleError(error);
  }
}

export async function getProfitReport(from?: Date, to?: Date) {
  try {
    await requireRole(["ADMIN", "MANAGER"]);

    const { start, end } = getDateRange(from, to);

    const [revenueAgg, cogsRows, returns, expenses, purchases] =
      await Promise.all([
        prisma.sale.aggregate({
          where: {
            status: "COMPLETED",
            createdAt: { gte: start, lte: end },
          },
          _sum: { totalAmount: true },
        }),
        prisma.$queryRaw<[{ cogs: number }]>`
          SELECT COALESCE(SUM(si.quantity * pv."costPrice"), 0)::float AS cogs
          FROM "SaleItem" si
          INNER JOIN "Sale" s ON si."saleId" = s.id
          INNER JOIN "ProductVariant" pv ON si."variantId" = pv.id
          WHERE s.status = 'COMPLETED'
            AND s."createdAt" >= ${start}
            AND s."createdAt" <= ${end}
        `,
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

    const revenue = revenueAgg._sum.totalAmount ?? 0;
    const costOfGoodsSold = cogsRows[0]?.cogs ?? 0;
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

    const rows = await prisma.$queryRaw<
      {
        productId: string;
        productName: string;
        quantitySold: number;
        revenue: number;
        profit: number;
      }[]
    >`
      SELECT
        p.id AS "productId",
        COALESCE(p."nameAr", p.name) AS "productName",
        SUM(si.quantity)::int AS "quantitySold",
        SUM(si."totalPrice")::float AS revenue,
        SUM((si."unitPrice" - pv."costPrice") * si.quantity - si."discountAmount")::float AS profit
      FROM "SaleItem" si
      INNER JOIN "Sale" s ON si."saleId" = s.id
      INNER JOIN "ProductVariant" pv ON si."variantId" = pv.id
      INNER JOIN "Product" p ON pv."productId" = p.id
      WHERE s.status = 'COMPLETED'
        AND s."createdAt" >= ${start}
        AND s."createdAt" <= ${end}
      GROUP BY p.id, p."nameAr", p.name
      ORDER BY revenue DESC
      LIMIT ${limit}
    `;

    return rows;
  } catch (error) {
    handleError(error);
  }
}
