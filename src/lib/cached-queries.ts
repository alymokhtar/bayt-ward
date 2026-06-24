import { unstable_cache } from "next/cache";
import { Prisma, type ExpenseCategory } from "@prisma/client";
import {
  getBusinessDayBoundsForDateKey,
  getBusinessDayBoundsFromDateKeys,
  getEgyptBusinessDateKey,
  getEgyptBusinessDayBounds,
  getOffsetBusinessDateKey,
  getReportPeriodRange,
} from "@/lib/business-day";
import { prisma } from "@/lib/prisma";
import { CACHE_TAG, READ_CACHE_SECONDS } from "@/lib/server-cache";
import { resolvePagination, toPaginatedResult } from "@/lib/utils";

type KpiData = {
  todaySales: number;
  todaySalesCount: number;
  monthSales: number;
  monthSalesCount: number;
  totalProducts: number;
  totalCustomers: number;
  lowStockCount: number;
};

/** Dashboard aggregates — cached 30s, invalidated on sales/inventory mutations */
/** KPIs in a single SQL round-trip (replaces 5 separate Prisma calls) */
export const getCachedDashboardKpis = unstable_cache(
  async (): Promise<KpiData> => {
    const now = new Date();
    const { start: todayStart, end: todayEnd } = getEgyptBusinessDayBounds(now);
    const monthRange = getReportPeriodRange("month");
    const { start: monthStart, end: monthEnd } = getBusinessDayBoundsFromDateKeys(
      monthRange.from,
      monthRange.to
    );

    const [row, todayReturnsAgg, monthReturnsAgg] = await Promise.all([
      prisma.$queryRaw<
        [
          {
            todaySales: number;
            todaySalesCount: number;
            monthSales: number;
            monthSalesCount: number;
            totalProducts: number;
            totalCustomers: number;
            lowStockCount: number;
          },
        ]
      >`
      SELECT
        (SELECT COALESCE(SUM("totalAmount"), 0)::float FROM "Sale"
          WHERE status IN ('COMPLETED', 'PARTIALLY_REFUNDED') AND "createdAt" >= ${todayStart} AND "createdAt" < ${todayEnd}) AS "todaySales",
        (SELECT COUNT(*)::int FROM "Sale"
          WHERE status IN ('COMPLETED', 'PARTIALLY_REFUNDED') AND "createdAt" >= ${todayStart} AND "createdAt" < ${todayEnd}) AS "todaySalesCount",
        (SELECT COALESCE(SUM("totalAmount"), 0)::float FROM "Sale"
          WHERE status IN ('COMPLETED', 'PARTIALLY_REFUNDED') AND "createdAt" >= ${monthStart} AND "createdAt" < ${monthEnd}) AS "monthSales",
        (SELECT COUNT(*)::int FROM "Sale"
          WHERE status IN ('COMPLETED', 'PARTIALLY_REFUNDED') AND "createdAt" >= ${monthStart} AND "createdAt" < ${monthEnd}) AS "monthSalesCount",
        (SELECT COUNT(*)::int FROM "Product" WHERE "isActive" = true) AS "totalProducts",
        (SELECT COUNT(*)::int FROM "Customer") AS "totalCustomers",
        (SELECT COUNT(*)::int FROM "ProductVariant"
          WHERE "isActive" = true AND "stockQuantity" <= "minStockLevel") AS "lowStockCount"
      `,
      prisma.return.aggregate({
        where: {
          status: "APPROVED",
          createdAt: { gte: todayStart, lt: todayEnd },
        },
        _sum: { refundAmount: true },
      }),
      prisma.return.aggregate({
        where: {
          status: "APPROVED",
          createdAt: { gte: monthStart, lt: monthEnd },
        },
        _sum: { refundAmount: true },
      }),
    ]);

    const todayReturns = todayReturnsAgg._sum.refundAmount ?? 0;
    const monthReturns = monthReturnsAgg._sum.refundAmount ?? 0;
    const data = row[0] ?? {
      todaySales: 0,
      todaySalesCount: 0,
      monthSales: 0,
      monthSalesCount: 0,
      totalProducts: 0,
      totalCustomers: 0,
      lowStockCount: 0,
    };

    return {
      ...data,
      todaySales: Math.max(0, data.todaySales - todayReturns),
      monthSales: Math.max(0, data.monthSales - monthReturns),
    };
  },
  ["dashboard-kpis"],
  {
    tags: [CACHE_TAG.dashboard, CACHE_TAG.sales, CACHE_TAG.inventory],
    revalidate: READ_CACHE_SECONDS,
  }
);

/** 7-day chart grouped by Egypt business day (03:00 → 03:00 Cairo). */
export const getCachedSalesChartData = unstable_cache(
  async () => {
    const now = new Date();
    const salesChartData: { date: string; total: number; count: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      salesChartData.push({
        date: getOffsetBusinessDateKey(-i, now),
        total: 0,
        count: 0,
      });
    }

    const firstDay = salesChartData[0]?.date;
    const firstDayStart = firstDay
      ? getBusinessDayBoundsForDateKey(firstDay).start
      : getEgyptBusinessDayBounds(now).start;
    const rows = await prisma.sale.findMany({
      where: {
        status: "COMPLETED",
        createdAt: { gte: firstDayStart },
      },
      select: {
        createdAt: true,
        totalAmount: true,
      },
    });
    const byDay = new Map(salesChartData.map((day) => [day.date, day]));

    for (const row of rows) {
      const entry = byDay.get(getEgyptBusinessDateKey(row.createdAt));

      if (entry) {
        entry.total += row.totalAmount;
        entry.count += 1;
      }
    }

    return salesChartData;
  },
  ["dashboard-chart"],
  {
    tags: [CACHE_TAG.dashboard, CACHE_TAG.sales],
    revalidate: READ_CACHE_SECONDS,
  }
);

/** Recent sales list — cached separately for Suspense streaming */
export const getCachedRecentSales = unstable_cache(
  async () =>
    prisma.sale.findMany({
      where: { status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        invoiceNumber: true,
        totalAmount: true,
        paymentMethod: true,
        status: true,
        createdAt: true,
        customer: { select: { id: true, name: true, phone: true } },
        user: { select: { id: true, name: true } },
      },
    }),
  ["dashboard-recent-sales"],
  {
    tags: [CACHE_TAG.dashboard, CACHE_TAG.sales],
    revalidate: READ_CACHE_SECONDS,
  }
);

/** @deprecated Use split getters for streaming; kept for compatibility */
export const getCachedDashboardStats = unstable_cache(
  async () => {
    const [kpis, salesChartData, recentSales] = await Promise.all([
      getCachedDashboardKpis(),
      getCachedSalesChartData(),
      getCachedRecentSales(),
    ]);

    return {
      ...kpis,
      recentSales,
      salesChartData,
    };
  },
  ["dashboard-stats"],
  {
    tags: [CACHE_TAG.dashboard, CACHE_TAG.sales, CACHE_TAG.inventory],
    revalidate: READ_CACHE_SECONDS,
  }
);

const STORE_SETTING_KEYS = [
  "store_name",
  "store_name_ar",
  "store_phone",
  "store_whatsapp",
  "currency_symbol",
  "whatsapp_promotion_default",
];

export const getCachedStoreSettings = unstable_cache(
  async () => {
    const settings = await prisma.setting.findMany({
      where: { key: { in: STORE_SETTING_KEYS } },
      select: { key: true, value: true },
    });

    return settings.reduce(
      (acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      },
      {} as Record<string, string>
    );
  },
  ["store-settings"],
  { tags: [CACHE_TAG.settings], revalidate: 300 }
);

export const getCachedCustomersPage = unstable_cache(
  async (paramsJson: string) => {
    const { search, page, pageSize } = JSON.parse(paramsJson) as {
      search?: string;
      page?: number;
      pageSize?: number;
    };

    const where = search?.trim()
      ? {
          OR: [
            { name: { contains: search.trim() } },
            { phone: { contains: search.trim() } },
            { email: { contains: search.trim() } },
          ],
        }
      : undefined;

    const pagination = resolvePagination(page, pageSize);
    const { take, skip, page: currentPage } = pagination;

    const [items, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take,
        skip,
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          address: true,
          notes: true,
          totalSpent: true,
          visitCount: true,
          _count: { select: { sales: true, returns: true } },
        },
      }),
      prisma.customer.count({ where }),
    ]);

    return toPaginatedResult(items, total, currentPage, pagination.pageSize);
  },
  ["customers-page"],
  { tags: [CACHE_TAG.customers], revalidate: READ_CACHE_SECONDS }
);

export const getCachedProductsPage = unstable_cache(
  async (paramsJson: string) => {
    const options = JSON.parse(paramsJson) as {
      search?: string;
      categoryId?: string;
      includeInactive?: boolean;
      page?: number;
      pageSize?: number;
    };

    const where: Record<string, unknown> = {};
    if (!options.includeInactive) where.isActive = true;
    if (options.categoryId) where.categoryId = options.categoryId;

    if (options.search?.trim()) {
      const search = options.search.trim();
      where.OR = [
        { name: { contains: search } },
        { nameAr: { contains: search } },
        { brand: { contains: search } },
        {
          variants: {
            some: {
              OR: [
                { sku: { contains: search } },
                { barcode: { contains: search } },
              ],
            },
          },
        },
      ];
    }

    const pagination = resolvePagination(options.page, options.pageSize);
    const { take, skip, page: currentPage } = pagination;

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take,
        skip,
        select: {
          id: true,
          name: true,
          nameAr: true,
          description: true,
          brand: true,
          imageUrl: true,
          isActive: true,
          category: { select: { name: true, nameAr: true } },
          variants: {
            where: options.includeInactive ? undefined : { isActive: true },
            orderBy: [{ size: "asc" }, { color: "asc" }],
            select: {
              id: true,
              sku: true,
              barcode: true,
              size: true,
              color: true,
              colorHex: true,
              stockQuantity: true,
              minStockLevel: true,
              sellingPrice: true,
              costPrice: true,
              isActive: true,
            },
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    return toPaginatedResult(items, total, currentPage, pagination.pageSize);
  },
  ["products-page"],
  { tags: [CACHE_TAG.products], revalidate: READ_CACHE_SECONDS }
);

export const getCachedSalesPage = unstable_cache(
  async (paramsJson: string) => {
    const options = JSON.parse(paramsJson) as {
      search?: string;
      status?: string;
      from?: string;
      to?: string;
      page?: number;
      pageSize?: number;
    };

    const where: Record<string, unknown> = {};
    if (options.status) where.status = options.status;

    if (options.from || options.to) {
      const { start, end } = getBusinessDayBoundsFromDateKeys(
        options.from,
        options.to
      );
      where.createdAt = { gte: start, lt: end };
    }

    if (options.search?.trim()) {
      const search = options.search.trim();
      where.OR = [
        { invoiceNumber: { contains: search } },
        { customer: { name: { contains: search } } },
        { customer: { phone: { contains: search } } },
      ];
    }

    const pagination = resolvePagination(options.page, options.pageSize ?? 50);
    const { take, skip, page: currentPage } = pagination;

    const [items, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take,
        skip,
        select: {
          id: true,
          invoiceNumber: true,
          totalAmount: true,
          paymentMethod: true,
          status: true,
          createdAt: true,
          customer: { select: { id: true, name: true, phone: true } },
          user: { select: { id: true, name: true } },
          _count: { select: { items: true } },
        },
      }),
      prisma.sale.count({ where }),
    ]);

    return toPaginatedResult(items, total, currentPage, pagination.pageSize);
  },
  ["sales-page"],
  { tags: [CACHE_TAG.sales], revalidate: READ_CACHE_SECONDS }
);

export const getCachedLowStockPreview = unstable_cache(
  async (limit: number) =>
    prisma.productVariant.findMany({
      where: {
        isActive: true,
        product: { isActive: true },
        stockQuantity: { lte: prisma.productVariant.fields.minStockLevel },
      },
      orderBy: { stockQuantity: "asc" },
      take: limit,
      select: {
        id: true,
        size: true,
        color: true,
        stockQuantity: true,
        product: { select: { name: true, nameAr: true } },
      },
    }),
  ["low-stock-preview"],
  { tags: [CACHE_TAG.inventory], revalidate: READ_CACHE_SECONDS }
);

type InventoryRow = {
  id: string;
  productId: string;
  sku: string;
  size: string;
  color: string;
  stockQuantity: number;
  minStockLevel: number;
  costPrice: number;
  sellingPrice: number;
  productName: string;
  productNameAr: string | null;
  categoryName: string;
  categoryNameAr: string | null;
  totalCount: number;
};

/** Inventory list — single query (findMany + count via window function) */
export const getCachedInventoryPage = unstable_cache(
  async (paramsJson: string) => {
    const { search, lowStockOnly, page, pageSize } = JSON.parse(paramsJson) as {
      search?: string;
      lowStockOnly?: boolean;
      page?: number;
      pageSize?: number;
    };

    const pagination = resolvePagination(page, pageSize);
    const { take, skip, page: currentPage } = pagination;
    const q = search?.trim();

    const searchClause = q
      ? Prisma.sql`AND (
          pv.sku ILIKE ${"%" + q + "%"}
          OR pv.barcode ILIKE ${"%" + q + "%"}
          OR p.name ILIKE ${"%" + q + "%"}
          OR p."nameAr" ILIKE ${"%" + q + "%"}
        )`
      : Prisma.empty;

    const lowStockClause = lowStockOnly
      ? Prisma.sql`AND pv."stockQuantity" <= pv."minStockLevel"`
      : Prisma.empty;

    const rows = await prisma.$queryRaw<InventoryRow[]>`
      SELECT
        pv.id,
        p.id AS "productId",
        pv.sku,
        pv.size,
        pv.color,
        pv."stockQuantity" AS "stockQuantity",
        pv."minStockLevel" AS "minStockLevel",
        pv."costPrice" AS "costPrice",
        pv."sellingPrice" AS "sellingPrice",
        p.name AS "productName",
        p."nameAr" AS "productNameAr",
        c.name AS "categoryName",
        c."nameAr" AS "categoryNameAr",
        COUNT(*) OVER()::int AS "totalCount"
      FROM "ProductVariant" pv
      INNER JOIN "Product" p ON pv."productId" = p.id
      INNER JOIN "Category" c ON p."categoryId" = c.id
      WHERE pv."isActive" = true AND p."isActive" = true
      ${searchClause}
      ${lowStockClause}
      ORDER BY p.name ASC, pv.size ASC, pv.color ASC
      LIMIT ${take} OFFSET ${skip}
    `;

    const total = rows[0]?.totalCount ?? 0;
    const items = rows.map((row) => ({
      id: row.id,
      productId: row.productId,
      sku: row.sku,
      size: row.size,
      color: row.color,
      stockQuantity: row.stockQuantity,
      minStockLevel: row.minStockLevel,
      costPrice: row.costPrice,
      sellingPrice: row.sellingPrice,
      product: {
        name: row.productName,
        nameAr: row.productNameAr,
        category: { name: row.categoryName, nameAr: row.categoryNameAr },
      },
    }));

    return toPaginatedResult(items, total, currentPage, pagination.pageSize);
  },
  ["inventory-page"],
  { tags: [CACHE_TAG.inventory], revalidate: READ_CACHE_SECONDS }
);

type MovementRow = {
  id: string;
  type: string;
  quantity: number;
  previousQty: number;
  newQty: number;
  reference: string | null;
  notes: string | null;
  createdAt: Date;
  variantSku: string;
  productName: string;
  productNameAr: string | null;
  userName: string;
  totalCount: number;
};

/** Stock movements — single query (findMany + count via window function) */
export const getCachedStockMovementsPage = unstable_cache(
  async (paramsJson: string) => {
    const options = JSON.parse(paramsJson) as {
      variantId?: string;
      type?: string;
      page?: number;
      pageSize?: number;
    };

    const pagination = resolvePagination(
      options.page,
      options.pageSize ?? 50
    );
    const { take, skip, page: currentPage } = pagination;

    const variantClause = options.variantId
      ? Prisma.sql`AND sm."variantId" = ${options.variantId}`
      : Prisma.empty;

    const typeClause = options.type
      ? Prisma.sql`AND sm.type = ${options.type}::"StockMovementType"`
      : Prisma.empty;

    const rows = await prisma.$queryRaw<MovementRow[]>`
      SELECT
        sm.id,
        sm.type::text AS type,
        sm.quantity,
        sm."previousQty" AS "previousQty",
        sm."newQty" AS "newQty",
        sm.reference,
        sm.notes,
        sm."createdAt" AS "createdAt",
        pv.sku AS "variantSku",
        p.name AS "productName",
        p."nameAr" AS "productNameAr",
        u.name AS "userName",
        COUNT(*) OVER()::int AS "totalCount"
      FROM "StockMovement" sm
      INNER JOIN "ProductVariant" pv ON sm."variantId" = pv.id
      INNER JOIN "Product" p ON pv."productId" = p.id
      INNER JOIN "User" u ON sm."userId" = u.id
      WHERE 1=1
      ${variantClause}
      ${typeClause}
      ORDER BY sm."createdAt" DESC
      LIMIT ${take} OFFSET ${skip}
    `;

    const total = rows[0]?.totalCount ?? 0;
    const items = rows.map((row) => ({
      id: row.id,
      type: row.type,
      quantity: row.quantity,
      previousQty: row.previousQty,
      newQty: row.newQty,
      reference: row.reference,
      notes: row.notes,
      createdAt: row.createdAt,
      variant: {
        sku: row.variantSku,
        product: { name: row.productName, nameAr: row.productNameAr },
      },
      user: { name: row.userName },
    }));

    return toPaginatedResult(items, total, currentPage, pagination.pageSize);
  },
  ["stock-movements-page"],
  { tags: [CACHE_TAG.stockMovements], revalidate: READ_CACHE_SECONDS }
);

function getReportDateRange(from?: string, to?: string) {
  return getBusinessDayBoundsFromDateKeys(from, to);
}

export const getCachedPurchasesList = unstable_cache(
  async (paramsJson: string) => {
    const options = JSON.parse(paramsJson) as {
      status?: string;
      supplierId?: string;
      limit?: number;
    };

    return prisma.purchase.findMany({
      where: {
        ...(options.status
          ? { status: options.status as "PENDING" | "RECEIVED" | "CANCELLED" }
          : {}),
        ...(options.supplierId ? { supplierId: options.supplierId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: options.limit ?? 50,
      include: {
        supplier: { select: { id: true, name: true, phone: true } },
        user: { select: { id: true, name: true } },
        _count: { select: { items: true } },
      },
    });
  },
  ["purchases-list"],
  { tags: [CACHE_TAG.purchases], revalidate: READ_CACHE_SECONDS }
);

export const getCachedSuppliersList = unstable_cache(
  async (paramsJson: string) => {
    const { includeInactive } = JSON.parse(paramsJson) as {
      includeInactive?: boolean;
    };

    const [suppliers, aggregates, lastPurchases] = await Promise.all([
      prisma.supplier.findMany({
        where: includeInactive ? undefined : { isActive: true },
        orderBy: { name: "asc" },
        take: 500,
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          address: true,
          notes: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { purchases: true } },
        },
      }),
      prisma.purchase.groupBy({
        by: ["supplierId"],
        where: { status: { not: "CANCELLED" } },
        _sum: { totalAmount: true },
      }),
      prisma.$queryRaw<
        { supplierId: string; totalAmount: number; createdAt: Date }[]
      >`
        SELECT DISTINCT ON ("supplierId")
          "supplierId",
          "totalAmount",
          "createdAt"
        FROM "Purchase"
        WHERE status != 'CANCELLED'
        ORDER BY "supplierId", "createdAt" DESC
      `,
    ]);

    const totalBySupplier = new Map(
      aggregates.map((row) => [row.supplierId, row._sum.totalAmount ?? 0])
    );
    const lastBySupplier = new Map(
      lastPurchases.map((row) => [row.supplierId, row])
    );

    return suppliers.map((supplier) => {
      const last = lastBySupplier.get(supplier.id);
      return {
        ...supplier,
        totalPurchaseAmount: totalBySupplier.get(supplier.id) ?? 0,
        lastPurchaseAmount: last?.totalAmount ?? null,
        lastPurchaseAt: last?.createdAt ?? null,
      };
    });
  },
  ["suppliers-list"],
  { tags: [CACHE_TAG.suppliers], revalidate: READ_CACHE_SECONDS }
);

export const getCachedSalesReport = unstable_cache(
  async (paramsJson: string) => {
    const { from, to } = JSON.parse(paramsJson) as {
      from?: string;
      to?: string;
    };
    const { start, end } = getReportDateRange(from, to);

    const [sales, returns, byPaymentMethod] = await Promise.all([
      prisma.sale.aggregate({
        where: {
          status: { in: ["COMPLETED", "PARTIALLY_REFUNDED"] },
          createdAt: { gte: start, lt: end },
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
          createdAt: { gte: start, lt: end },
        },
        _sum: { refundAmount: true, totalAmount: true },
        _count: true,
      }),
      prisma.sale.groupBy({
        by: ["paymentMethod"],
        where: {
          status: { in: ["COMPLETED", "PARTIALLY_REFUNDED"] },
          createdAt: { gte: start, lt: end },
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
      netSales: Math.max(0, grossSales - totalReturns),
      returnsCount: returns._count,
      totalReturns,
      byPaymentMethod: byPaymentMethod.map((item) => ({
        method: item.paymentMethod,
        total: item._sum.totalAmount ?? 0,
        count: item._count,
      })),
    };
  },
  ["sales-report"],
  {
    tags: [CACHE_TAG.reports, CACHE_TAG.sales, CACHE_TAG.returns],
    revalidate: READ_CACHE_SECONDS,
  }
);

export const getCachedInventoryReport = unstable_cache(
  async () => {
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
            categoryId: string;
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
            c.id AS "categoryId",
            COALESCE(c."nameAr", c.name) AS category
          FROM "ProductVariant" pv
          INNER JOIN "Product" p ON pv."productId" = p.id
          INNER JOIN "Category" c ON p."categoryId" = c.id
          WHERE pv."isActive" = true
            AND p."isActive" = true
            AND pv."stockQuantity" <= pv."minStockLevel"
          ORDER BY category ASC, pv."stockQuantity" ASC, "productName" ASC
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
  },
  ["inventory-report"],
  {
    tags: [CACHE_TAG.reports, CACHE_TAG.inventory],
    revalidate: READ_CACHE_SECONDS,
  }
);

export const getCachedProfitReport = unstable_cache(
  async (paramsJson: string) => {
    const { from, to } = JSON.parse(paramsJson) as {
      from?: string;
      to?: string;
    };
    const { start, end } = getReportDateRange(from, to);

    const [revenueAgg, cogsRows, returns, expenses, purchases] =
      await Promise.all([
        prisma.sale.aggregate({
          where: {
            status: { in: ["COMPLETED", "PARTIALLY_REFUNDED"] },
            createdAt: { gte: start, lt: end },
          },
          _sum: { totalAmount: true },
        }),
        prisma.$queryRaw<[{ cogs: number }]>`
          SELECT COALESCE(SUM(si.quantity * pv."costPrice"), 0)::float AS cogs
          FROM "SaleItem" si
          INNER JOIN "Sale" s ON si."saleId" = s.id
          INNER JOIN "ProductVariant" pv ON si."variantId" = pv.id
          WHERE s.status IN ('COMPLETED', 'PARTIALLY_REFUNDED')
            AND s."createdAt" >= ${start}
            AND s."createdAt" < ${end}
        `,
        prisma.return.aggregate({
          where: {
            status: "APPROVED",
            createdAt: { gte: start, lt: end },
          },
          _sum: { refundAmount: true },
        }),
        prisma.expense.aggregate({
          where: {
            expenseDate: { gte: start, lt: end },
          },
          _sum: { amount: true },
          _count: true,
        }),
        prisma.purchase.aggregate({
          where: {
            status: "RECEIVED",
            receivedAt: { gte: start, lt: end },
          },
          _sum: { totalAmount: true },
          _count: true,
        }),
      ]);

    const revenue = revenueAgg._sum.totalAmount ?? 0;
    const costOfGoodsSold = cogsRows[0]?.cogs ?? 0;
    const totalReturns = returns._sum.refundAmount ?? 0;
    const totalExpenses = expenses._sum.amount ?? 0;
    const netRevenue = Math.max(0, revenue - totalReturns);
    const grossProfit = Math.max(0, netRevenue - costOfGoodsSold);
    const netProfit = Math.max(0, grossProfit - totalExpenses);

    return {
      period: { from: start, to: end },
      revenue,
      netRevenue,
      costOfGoodsSold,
      grossProfit,
      totalReturns,
      totalExpenses,
      expensesCount: expenses._count,
      netProfit,
      profitMargin: netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0,
      purchasesTotal: purchases._sum.totalAmount ?? 0,
      purchasesCount: purchases._count,
    };
  },
  ["profit-report"],
  {
    tags: [
      CACHE_TAG.reports,
      CACHE_TAG.sales,
      CACHE_TAG.returns,
      CACHE_TAG.expenses,
      CACHE_TAG.purchases,
    ],
    revalidate: READ_CACHE_SECONDS,
  }
);

export const getCachedTopProducts = unstable_cache(
  async (paramsJson: string) => {
    const { from, to, limit = 10 } = JSON.parse(paramsJson) as {
      from?: string;
      to?: string;
      limit?: number;
    };
    const { start, end } = getReportDateRange(from, to);

    return prisma.$queryRaw<
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
      WHERE s.status IN ('COMPLETED', 'PARTIALLY_REFUNDED')
        AND s."createdAt" >= ${start}
        AND s."createdAt" < ${end}
      GROUP BY p.id, p."nameAr", p.name
      ORDER BY revenue DESC
      LIMIT ${limit}
    `;
  },
  ["top-products-report"],
  {
    tags: [CACHE_TAG.reports, CACHE_TAG.sales],
    revalidate: READ_CACHE_SECONDS,
  }
);

export const getCachedReturnsList = unstable_cache(
  async (paramsJson: string) => {
    const options = JSON.parse(paramsJson) as {
      saleId?: string;
      customerId?: string;
      limit?: number;
    };

    return prisma.return.findMany({
      where: {
        ...(options.saleId ? { saleId: options.saleId } : {}),
        ...(options.customerId ? { customerId: options.customerId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: options.limit ?? 50,
      include: {
        sale: { select: { id: true, invoiceNumber: true, totalAmount: true } },
        customer: { select: { id: true, name: true, phone: true } },
        user: { select: { id: true, name: true } },
        _count: { select: { items: true } },
      },
    });
  },
  ["returns-list"],
  { tags: [CACHE_TAG.returns], revalidate: READ_CACHE_SECONDS }
);

export const getCachedExpensesList = unstable_cache(
  async (paramsJson: string) => {
    const options = JSON.parse(paramsJson) as {
      category?: string;
      from?: string;
      to?: string;
      limit?: number;
    };

    return prisma.expense.findMany({
      where: {
        ...(options.category
          ? { category: options.category as ExpenseCategory }
          : {}),
        ...(options.from || options.to
          ? (() => {
              const { start, end } = getBusinessDayBoundsFromDateKeys(
                options.from,
                options.to
              );
              return { expenseDate: { gte: start, lt: end } };
            })()
          : {}),
      },
      orderBy: { expenseDate: "desc" },
      take: options.limit ?? 100,
      include: {
        user: { select: { id: true, name: true } },
        employee: { select: { id: true, name: true } },
      },
    });
  },
  ["expenses-list"],
  { tags: [CACHE_TAG.expenses], revalidate: READ_CACHE_SECONDS }
);
