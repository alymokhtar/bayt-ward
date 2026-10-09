import { unstable_cache } from "next/cache";
import { Prisma, type ExpenseCategory } from "@prisma/client";
import {
  getBusinessDayBoundsForDateKey,
  getBusinessDayBoundsFromDateKeys,
  getEgyptBusinessDayBounds,
  getEgyptBusinessDateKey,
  getOffsetBusinessDateKey,
  getReportPeriodRange,
} from "@/lib/business-day";
import { prisma } from "@/lib/prisma";
import { getSalesChannelWhere } from "@/lib/sales-analytics";
import { CACHE_TAG, READ_CACHE_SECONDS } from "@/lib/server-cache";
import {
  calculateCostOfGoodsSoldFromSnapshots,
  calculateNetSales,
  calculateProfitMetrics,
  calculateSalesReportMetrics,
} from "@/lib/report-math";
import { resolvePagination, toPaginatedResult } from "@/lib/utils";

type KpiData = {
  todayGrossSales: number;
  todayReturns: number;
  todayExpenses: number;
  todayNetSales: number;
  todaySalesCount: number;
  monthSales: number;
  monthSalesCount: number;
  totalProducts: number;
  totalCustomers: number;
  lowStockCount: number;
};

/** Dashboard aggregates — cached 30s, invalidated on sales/inventory mutations */
/** KPIs in a single SQL round-trip (replaces 5 separate Prisma calls) */
const getCachedDashboardKpisForBusinessDate = unstable_cache(
  async (businessDateKey: string): Promise<KpiData> => {
    try {
      const now = getBusinessDayBoundsForDateKey(businessDateKey).start;
    const { start: todayStart, end: todayEnd } = getEgyptBusinessDayBounds(now);
    const monthRange = getReportPeriodRange("month");
    const { start: monthStart, end: monthEnd } = getBusinessDayBoundsFromDateKeys(
      monthRange.from,
      monthRange.to
    );

    const [row] = await prisma.$queryRaw<
      [
        {
          todayGrossSales: number;
          todaySalesCount: number;
          monthSales: number;
          monthSalesCount: number;
          todayReturns: number;
          monthReturns: number;
          todayExpenses: number;
          totalProducts: number;
          totalCustomers: number;
          lowStockCount: number;
        }
      ]
    >`
      SELECT
        -- Accrual sales include replacement invoices, which intentionally have no Payment rows.
        (SELECT COALESCE(SUM("totalAmount"), 0)::float FROM "Sale"
          WHERE status IN ('COMPLETED', 'PARTIALLY_REFUNDED', 'REFUNDED')
            AND "createdAt" >= ${todayStart}
            AND "createdAt" < ${todayEnd}) AS "todayGrossSales",
        (SELECT COUNT(*)::int FROM "Sale"
          WHERE status IN ('COMPLETED', 'PARTIALLY_REFUNDED', 'REFUNDED')
            AND "createdAt" >= ${todayStart}
            AND "createdAt" < ${todayEnd}) AS "todaySalesCount",
        (SELECT COALESCE(SUM("totalAmount"), 0)::float FROM "Sale"
          WHERE status IN ('COMPLETED', 'PARTIALLY_REFUNDED', 'REFUNDED')
            AND "createdAt" >= ${monthStart}
            AND "createdAt" < ${monthEnd}) AS "monthSales",
        (SELECT COUNT(*)::int FROM "Sale"
          WHERE status IN ('COMPLETED', 'PARTIALLY_REFUNDED', 'REFUNDED')
            AND "createdAt" >= ${monthStart}
            AND "createdAt" < ${monthEnd}) AS "monthSalesCount",
        (SELECT COALESCE(SUM("refundAmount"), 0)::float FROM "Return"
          WHERE status = 'APPROVED'
            AND "createdAt" >= ${todayStart}
            AND "createdAt" < ${todayEnd}) AS "todayReturns",
        (SELECT COALESCE(SUM("refundAmount"), 0)::float FROM "Return"
          WHERE status = 'APPROVED'
            AND "createdAt" >= ${monthStart}
            AND "createdAt" < ${monthEnd}) AS "monthReturns",
        (SELECT COALESCE(SUM("amount"), 0)::float FROM "Expense"
          WHERE "expenseDate" >= ${todayStart}
            AND "expenseDate" < ${todayEnd}) AS "todayExpenses",
        (SELECT COUNT(*)::int FROM "Product" WHERE "isActive" = true) AS "totalProducts",
        (SELECT COUNT(*)::int FROM "Customer") AS "totalCustomers",
        (SELECT COUNT(*)::int FROM "ProductVariant"
          WHERE "isActive" = true
            AND "stockQuantity" <= "minStockLevel") AS "lowStockCount"
      `;

    const data = row ?? {
      todayGrossSales: 0,
      todaySalesCount: 0,
      monthSales: 0,
      monthSalesCount: 0,
      todayReturns: 0,
      monthReturns: 0,
      todayExpenses: 0,
      totalProducts: 0,
      totalCustomers: 0,
      lowStockCount: 0,
    };

    return {
      todayGrossSales: data.todayGrossSales,
      todayReturns: data.todayReturns,
      todayExpenses: data.todayExpenses,
      todayNetSales: calculateNetSales(
        data.todayGrossSales,
        data.todayReturns,
        data.todayExpenses,
      ),
      todaySalesCount: data.todaySalesCount,
      monthSales: calculateNetSales(data.monthSales, data.monthReturns),
      monthSalesCount: data.monthSalesCount,
      totalProducts: data.totalProducts,
      totalCustomers: data.totalCustomers,
      lowStockCount: data.lowStockCount,
    };
    } catch (error) {
      console.error("❌ Error in getCachedDashboardKpis:", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  },
  ["dashboard-kpis"],
  {
    tags: [CACHE_TAG.dashboard, CACHE_TAG.sales, CACHE_TAG.inventory],
    revalidate: READ_CACHE_SECONDS,
  }
);

export function getCachedDashboardKpis() {
  return getCachedDashboardKpisForBusinessDate(getEgyptBusinessDateKey());
}

/** 7-day chart grouped by Egypt business day (03:00 → 03:00 Cairo). */
const getCachedSalesChartDataForBusinessDate = unstable_cache(
  async (businessDateKey: string) => {
    try {
      const now = getBusinessDayBoundsForDateKey(businessDateKey).start;
    const salesChartData: { date: string; total: number; count: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      salesChartData.push({
        date: getOffsetBusinessDateKey(-i, now),
        total: 0,
        count: 0,
      });
    }

    const firstDay = salesChartData[0]?.date;
    const lastDay = salesChartData[salesChartData.length - 1]?.date;
    const firstDayStart = firstDay
      ? getBusinessDayBoundsForDateKey(firstDay).start
      : getEgyptBusinessDayBounds(now).start;
    const lastDayEnd = lastDay
      ? getBusinessDayBoundsForDateKey(lastDay).end
      : getEgyptBusinessDayBounds(now).end;

    const sales = await prisma.sale.findMany({
      where: {
        status: { in: ["COMPLETED", "PARTIALLY_REFUNDED", "REFUNDED"] },
        createdAt: { gte: firstDayStart, lt: lastDayEnd },
      },
      select: { totalAmount: true, createdAt: true },
    });
    const byDay = new Map<string, { total: number; count: number }>();
    for (const sale of sales) {
      const dayKey = getEgyptBusinessDateKey(sale.createdAt);
      const totals = byDay.get(dayKey) ?? { total: 0, count: 0 };
      totals.total += sale.totalAmount;
      totals.count += 1;
      byDay.set(dayKey, totals);
    }

    return salesChartData.map((day) => {
      const match = byDay.get(day.date);
      if (!match) return day;
      return {
        date: day.date,
        total: match.total,
        count: match.count,
      };
    });
    } catch (error) {
      console.error("❌ Error in getCachedSalesChartData:", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  },
  ["dashboard-chart"],
  {
    tags: [CACHE_TAG.dashboard, CACHE_TAG.sales],
    revalidate: READ_CACHE_SECONDS,
  }
);

export function getCachedSalesChartData() {
  return getCachedSalesChartDataForBusinessDate(getEgyptBusinessDateKey());
}

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
        payments: {
          select: { method: true, amount: true },
        },
        exchangeAsReplacement: {
          select: {
            settlementBalance: true,
            settlements: {
              select: {
                direction: true,
                amount: true,
                method: true,
              },
            },
          },
        },
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
  "store_address",
  "store_email",
  "currency_symbol",
  "whatsapp_promotion_default",
  "daily_discount_percent",
  "daily_discount_active",
  "daily_discount_date",
  // Social links
  "social_facebook_url",
  "social_instagram_url",
  "social_tiktok_url",
  "social_youtube_url",
  "social_snapchat_url",
  "social_x_url",
  // Google Maps
  "google_maps_embed_url",
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
        orderBy: { totalSpent: "desc" },
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
          _count: {
            select: {
              sales: { where: { status: { not: "CANCELLED" } } },
              returns: true,
            },
          },
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
          brand: true,
          publishToWebsite: true,
          featuredProduct: true,
          isActive: true,
          category: { select: { name: true, nameAr: true } },
          variants: {
            where: options.includeInactive ? undefined : { isActive: true },
            orderBy: [{ size: "asc" }, { color: "asc" }],
            select: {
              id: true,
              size: true,
              color: true,
              colorHex: true,
              stockQuantity: true,
              minStockLevel: true,
              sellingPrice: true,
              isActive: true,
              images: {
                where: { isActive: true },
                orderBy: [
                  { isPrimary: "desc" },
                  { sortOrder: "asc" },
                  { createdAt: "asc" },
                ],
                take: 1,
                select: {
                  id: true,
                  url: true,
                  altText: true,
                  isPrimary: true,
                },
              },
            },
          },
          images: {
            where: { isActive: true, productVariantId: null },
            orderBy: [
              { isPrimary: "desc" },
              { sortOrder: "asc" },
              { createdAt: "asc" },
            ],
            take: 1,
            select: {
              id: true,
              url: true,
              isPrimary: true,
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
      channel?: string;
      from?: string;
      to?: string;
      page?: number;
      pageSize?: number;
    };

    const where: Record<string, unknown> = {};
    if (options.status) where.status = options.status;
    Object.assign(where, getSalesChannelWhere(options.channel === "POS" || options.channel === "ONLINE" ? options.channel : "ALL"));

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
          channel: true,
          totalAmount: true,
          paymentMethod: true,
          status: true,
          createdAt: true,
          payments: {
            select: { method: true, amount: true },
          },
          exchangeAsReplacement: {
            select: {
              settlementBalance: true,
              settlements: {
                select: {
                  direction: true,
                  amount: true,
                  method: true,
                },
              },
            },
          },
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
  previousCostPrice: number | null;
  newCostPrice: number | null;
  valuationDifference: number | null;
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
      search?: string;
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
    const search = options.search?.trim();
    const searchClause = search
      ? Prisma.sql`AND (
          pv.sku ILIKE ${"%" + search + "%"}
          OR pv.barcode ILIKE ${"%" + search + "%"}
          OR p.name ILIKE ${"%" + search + "%"}
          OR p."nameAr" ILIKE ${"%" + search + "%"}
        )`
      : Prisma.empty;

    const rows = await prisma.$queryRaw<MovementRow[]>`
      SELECT
        sm.id,
        sm.type::text AS type,
        sm.quantity,
        sm."previousQty" AS "previousQty",
        sm."newQty" AS "newQty",
        sm."previousCostPrice" AS "previousCostPrice",
        sm."newCostPrice" AS "newCostPrice",
        sm."valuationDifference" AS "valuationDifference",
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
      ${searchClause}
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
      previousCostPrice: row.previousCostPrice,
      newCostPrice: row.newCostPrice,
      valuationDifference: row.valuationDifference,
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
      page?: number;
      pageSize?: number;
    };

    const pagination = resolvePagination(options.page, options.pageSize ?? 50);
    const where: Prisma.PurchaseWhereInput = {
      ...(options.status
        ? { status: options.status as "PENDING" | "RECEIVED" | "CANCELLED" }
        : {}),
      ...(options.supplierId ? { supplierId: options.supplierId } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.purchase.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.take,
        include: {
          supplier: { select: { id: true, name: true, phone: true } },
          user: { select: { id: true, name: true } },
          _count: { select: { items: true } },
        },
      }),
      prisma.purchase.count({ where }),
    ]);

    return toPaginatedResult(
      items,
      total,
      pagination.page,
      pagination.pageSize
    );
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

    const result = suppliers.map((supplier) => {
      const last = lastBySupplier.get(supplier.id);
      return {
        ...supplier,
        totalPurchaseAmount: totalBySupplier.get(supplier.id) ?? 0,
        lastPurchaseAmount: last?.totalAmount ?? null,
        lastPurchaseAt: last?.createdAt ?? null,
      };
    });

    return result.sort((a, b) => b.totalPurchaseAmount - a.totalPurchaseAmount);
  },
  ["suppliers-list"],
  { tags: [CACHE_TAG.suppliers], revalidate: READ_CACHE_SECONDS }
);

export const getCachedSalesReport = unstable_cache(
  async (paramsJson: string) => {
    try {
      const { from, to, channel = "ALL" } = JSON.parse(paramsJson) as {
        from?: string;
        to?: string;
        channel?: string;
      };
      const { start, end } = getReportDateRange(from, to);
      const channelWhere = getSalesChannelWhere(
        channel === "POS" || channel === "ONLINE" ? channel : "ALL",
      );

      // ✅ توحيد الفلتر مع مراجعة الخزنة والـ KPI - فقط المبيعات المكتملة أو المرتجعة جزئياً
      const completedSalesWhere = {
        status: { in: ["COMPLETED" as const, "PARTIALLY_REFUNDED" as const, "REFUNDED" as const] },
        createdAt: { gte: start, lt: end },
        ...channelWhere,
      };

      const [sales, returns, expenses, salesList] = await Promise.all([
      // ✅ استخدام نفس الفلتر المستخدم في مراجعة الخزنة
      prisma.sale.aggregate({
        where: completedSalesWhere,
        _sum: {
          totalAmount: true,
          subtotal: true,
          discountAmount: true,
          taxAmount: true,
        },
        _count: true,
      }),
      prisma.return.aggregate({
        where: {
          status: "APPROVED",
          createdAt: { gte: start, lt: end },
          ...(channelWhere.channel ? { sale: channelWhere } : {}),
        },
        _sum: { refundAmount: true, totalAmount: true },
        _count: true,
      }),
      prisma.expense.aggregate({
        where: {
          expenseDate: { gte: start, lt: end },
        },
        _sum: { amount: true },
      }),
      prisma.sale.findMany({
        where: completedSalesWhere,
        take: 1000,
        select: {
          id: true,
          invoiceNumber: true,
          channel: true,
          totalAmount: true,
          status: true,
          paymentMethod: true,
          createdAt: true,
          payments: {
            select: { method: true, amount: true },
          },
          customer: { select: { name: true } },
          user: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const totalReturns = returns._sum.refundAmount ?? 0;
    const totalExpenses = expenses._sum.amount ?? 0;
    const salesMetrics = calculateSalesReportMetrics({
      grossSalesBeforeDiscount: sales._sum.subtotal ?? 0,
      totalDiscount: sales._sum.discountAmount ?? 0,
      totalReturns,
      accrualRevenue: sales._sum.totalAmount ?? 0,
      salesCount: sales._count,
    });

    return {
      period: { from: start, to: end },
      totalSales: salesMetrics.accrualRevenue,
      grossSalesBeforeDiscount: salesMetrics.grossSalesBeforeDiscount,
      salesCount: sales._count,
      averageSale: salesMetrics.averageSale,
      totalDiscount: salesMetrics.totalDiscount,
      totalTax: sales._sum.taxAmount ?? 0,
      netSales: salesMetrics.netSales,
      returnsCount: returns._count,
      totalReturns,
      totalExpenses,
      salesListTruncated: sales._count > salesList.length,
      salesList: salesList.map((sale) => ({
        id: sale.id,
        invoiceNumber: sale.invoiceNumber,
        customerName: sale.customer?.name || "نقدي",
        cashierName: sale.user.name,
        channel: sale.channel,
        totalAmount: sale.totalAmount,
        status: sale.status,
        paymentMethod: sale.paymentMethod,
        payments: sale.payments,
        createdAt: sale.createdAt,
      })),
    };
    } catch (error) {
      console.error("❌ Error in getCachedSalesReport:", {
        error,
        paramsJson,
      });
      throw error;
    }
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
    try {
      const { from, to, channel = "ALL" } = JSON.parse(paramsJson) as {
        from?: string;
        to?: string;
        channel?: string;
      };
      const { start, end } = getReportDateRange(from, to);
      const channelWhere = getSalesChannelWhere(
        channel === "POS" || channel === "ONLINE" ? channel : "ALL",
      );
      const completedSalesWhere = {
        status: { in: ["COMPLETED" as const, "PARTIALLY_REFUNDED" as const, "REFUNDED" as const] },
        createdAt: { gte: start, lt: end },
        ...channelWhere,
      };

    const [
      salesAgg,
      cogsRows,
      returnedCogsRows,
      returns,
      expenses,
      purchases,
      inventoryLossRows,
    ] = await Promise.all([
        prisma.sale.aggregate({
          where: completedSalesWhere,
          _sum: { totalAmount: true },
        }),
        prisma.$queryRaw<[{ cogs: number }]>`
          SELECT COALESCE(SUM(si.quantity * si."costPrice"), 0)::float AS cogs
          FROM "SaleItem" si
          INNER JOIN "Sale" s ON si."saleId" = s.id
          WHERE s.status IN ('COMPLETED', 'PARTIALLY_REFUNDED', 'REFUNDED')
            AND s."createdAt" >= ${start}
            AND s."createdAt" < ${end}
            AND (${channel === "ALL"} OR s.channel::text = ${channel})
        `,
        prisma.$queryRaw<[{ returnedCogs: number }]>`
          SELECT COALESCE(SUM(ri.quantity * ri."costPrice"), 0)::float AS "returnedCogs"
          FROM "ReturnItem" ri
          INNER JOIN "Return" r ON ri."returnId" = r.id
          INNER JOIN "Sale" s ON s.id = r."saleId"
          WHERE r.status = 'APPROVED'
            AND r."createdAt" >= ${start}
            AND r."createdAt" < ${end}
            AND (${channel === "ALL"} OR s.channel::text = ${channel})
        `,
        prisma.return.aggregate({
          where: {
            status: "APPROVED",
            createdAt: { gte: start, lt: end },
            ...(channelWhere.channel ? { sale: channelWhere } : {}),
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
        prisma.$queryRaw<[{ inventoryLoss: number }]>`
          SELECT COALESCE(SUM(GREATEST(-COALESCE(sm."valuationDifference", 0), 0)), 0)::float AS "inventoryLoss"
          FROM "StockMovement" sm
          WHERE sm.type IN ('DAMAGE', 'ADJUSTMENT')
            AND sm.quantity < 0
            AND sm."createdAt" >= ${start}
            AND sm."createdAt" < ${end}
        `,
      ]);

    const revenue = salesAgg._sum.totalAmount ?? 0;
    const totalCogs = cogsRows[0]?.cogs ?? 0;
    const returnedCogs = returnedCogsRows[0]?.returnedCogs ?? 0;
    const costOfGoodsSold = calculateCostOfGoodsSoldFromSnapshots(totalCogs, returnedCogs);
    const totalReturns = returns._sum.refundAmount ?? 0;
    const totalExpenses = expenses._sum.amount ?? 0;
    const inventoryLoss = inventoryLossRows[0]?.inventoryLoss ?? 0;
    const { netRevenue, grossProfit, netProfit, profitMargin } = calculateProfitMetrics({
      revenue,
      totalReturns,
      costOfGoodsSold,
      totalExpenses: totalExpenses + inventoryLoss,
    });

    return {
      period: { from: start, to: end },
      revenue,
      netRevenue,
      costOfGoodsSold,
      grossProfit,
      totalReturns,
      totalExpenses,
      inventoryLoss,
      expensesCount: expenses._count,
      netProfit,
      profitMargin,
      purchasesTotal: purchases._sum.totalAmount ?? 0,
      purchasesCount: purchases._count,
    };
    } catch (error) {
      console.error("❌ Error in getCachedProfitReport:", {
        error,
        paramsJson,
      });
      throw error;
    }
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
    const { from, to, limit = 10, channel = "ALL" } = JSON.parse(paramsJson) as {
      from?: string;
      to?: string;
      limit?: number;
      channel?: string;
    };
    const { start, end } = getReportDateRange(from, to);
    const selectedChannel = channel === "POS" || channel === "ONLINE" ? channel : "ALL";

    return prisma.$queryRaw<
      {
        productId: string;
        productName: string;
        quantitySold: number;
        revenue: number;
        profit: number;
      }[]
    >`
      WITH sales_by_product AS (
        SELECT
          pv."productId",
          SUM(si.quantity)::int AS "quantitySold",
          SUM(si."totalPrice")::float AS revenue,
          SUM(si."totalPrice" - si."costPrice" * si.quantity)::float AS profit
        FROM "SaleItem" si
        INNER JOIN "Sale" s ON si."saleId" = s.id
        INNER JOIN "ProductVariant" pv ON si."variantId" = pv.id
        WHERE s.status IN ('COMPLETED', 'PARTIALLY_REFUNDED', 'REFUNDED')
          AND s."createdAt" >= ${start}
          AND s."createdAt" < ${end}
          AND (${selectedChannel === "ALL"} OR s.channel::text = ${selectedChannel})
        GROUP BY pv."productId"
      ),
      returns_by_product AS (
        SELECT
          pv."productId",
          SUM(ri.quantity)::int AS "returnedQuantity",
          SUM(ri."totalPrice")::float AS "returnedRevenue",
          SUM(ri."totalPrice" - ri."costPrice" * ri.quantity)::float AS "returnedProfit"
        FROM "ReturnItem" ri
        INNER JOIN "Return" r ON ri."returnId" = r.id
        INNER JOIN "Sale" s ON r."saleId" = s.id
        INNER JOIN "ProductVariant" pv ON ri."variantId" = pv.id
        WHERE r.status = 'APPROVED'
          AND r."createdAt" >= ${start}
          AND r."createdAt" < ${end}
          AND (${selectedChannel === "ALL"} OR s.channel::text = ${selectedChannel})
        GROUP BY pv."productId"
      ),
      net_product_totals AS (
        SELECT
          COALESCE(s."productId", r."productId") AS "productId",
          COALESCE(s."quantitySold", 0) - COALESCE(r."returnedQuantity", 0) AS "quantitySold",
          COALESCE(s.revenue, 0) - COALESCE(r."returnedRevenue", 0) AS revenue,
          COALESCE(s.profit, 0) - COALESCE(r."returnedProfit", 0) AS profit
        FROM sales_by_product s
        FULL OUTER JOIN returns_by_product r ON s."productId" = r."productId"
      )
      SELECT
        p.id AS "productId",
        COALESCE(p."nameAr", p.name) AS "productName",
        totals."quantitySold",
        totals.revenue,
        totals.profit
      FROM net_product_totals totals
      INNER JOIN "Product" p ON p.id = totals."productId"
      ORDER BY totals.revenue DESC
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
      page?: number;
      pageSize?: number;
    };

    const where: Prisma.ExpenseWhereInput = {
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
    };
    const page = Math.max(1, options.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, options.pageSize ?? 50));

    const [items, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        orderBy: [{ expenseDate: "desc" }, { id: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          title: true,
          amount: true,
          category: true,
          description: true,
          expenseDate: true,
          baseSalary: true,
          deductionsTotal: true,
          paymentMethod: true,
          user: { select: { id: true, name: true } },
          employee: { select: { id: true, name: true } },
        },
      }),
      prisma.expense.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  },
  ["expenses-list"],
  { tags: [CACHE_TAG.expenses], revalidate: READ_CACHE_SECONDS }
);
