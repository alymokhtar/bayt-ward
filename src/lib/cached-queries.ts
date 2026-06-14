import { unstable_cache } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { CACHE_TAG, READ_CACHE_SECONDS } from "@/lib/server-cache";
import { resolvePagination, toPaginatedResult } from "@/lib/utils";

function getDayBounds(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

/** Dashboard aggregates — cached 30s, invalidated on sales/inventory mutations */
/** KPIs in a single SQL round-trip (replaces 5 separate Prisma calls) */
export const getCachedDashboardKpis = unstable_cache(
  async () => {
    const now = new Date();
    const { start: todayStart, end: todayEnd } = getDayBounds(now);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [row] = await prisma.$queryRaw<
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
          WHERE status = 'COMPLETED' AND "createdAt" >= ${todayStart} AND "createdAt" < ${todayEnd}) AS "todaySales",
        (SELECT COUNT(*)::int FROM "Sale"
          WHERE status = 'COMPLETED' AND "createdAt" >= ${todayStart} AND "createdAt" < ${todayEnd}) AS "todaySalesCount",
        (SELECT COALESCE(SUM("totalAmount"), 0)::float FROM "Sale"
          WHERE status = 'COMPLETED' AND "createdAt" >= ${monthStart} AND "createdAt" < ${monthEnd}) AS "monthSales",
        (SELECT COUNT(*)::int FROM "Sale"
          WHERE status = 'COMPLETED' AND "createdAt" >= ${monthStart} AND "createdAt" < ${monthEnd}) AS "monthSalesCount",
        (SELECT COUNT(*)::int FROM "Product" WHERE "isActive" = true) AS "totalProducts",
        (SELECT COUNT(*)::int FROM "Customer") AS "totalCustomers",
        (SELECT COUNT(*)::int FROM "ProductVariant"
          WHERE "isActive" = true AND "stockQuantity" <= "minStockLevel") AS "lowStockCount"
    `;

    return (
      row ?? {
        todaySales: 0,
        todaySalesCount: 0,
        monthSales: 0,
        monthSalesCount: 0,
        totalProducts: 0,
        totalCustomers: 0,
        lowStockCount: 0,
      }
    );
  },
  ["dashboard-kpis"],
  {
    tags: [CACHE_TAG.dashboard, CACHE_TAG.sales, CACHE_TAG.inventory],
    revalidate: READ_CACHE_SECONDS,
  }
);

/** 7-day chart via GROUP BY (replaces findMany of all week sales) */
export const getCachedSalesChartData = unstable_cache(
  async () => {
    const now = new Date();
    const weekStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 6
    );
    weekStart.setHours(0, 0, 0, 0);

    const dailyRows = await prisma.$queryRaw<
      { day: Date; total: number; count: number }[]
    >`
      SELECT
        DATE("createdAt") AS day,
        COALESCE(SUM("totalAmount"), 0)::float AS total,
        COUNT(*)::int AS count
      FROM "Sale"
      WHERE status = 'COMPLETED' AND "createdAt" >= ${weekStart}
      GROUP BY DATE("createdAt")
      ORDER BY day ASC
    `;

    const byDay = new Map(
      dailyRows.map((r) => [
        new Date(r.day).toISOString().split("T")[0],
        { total: r.total, count: r.count },
      ])
    );

    const salesChartData: { date: string; total: number; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now);
      day.setDate(day.getDate() - i);
      const { start } = getDayBounds(day);
      const key = start.toISOString().split("T")[0];
      const entry = byDay.get(key);
      salesChartData.push({
        date: key,
        total: entry?.total ?? 0,
        count: entry?.count ?? 0,
      });
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
          brand: true,
          isActive: true,
          category: { select: { name: true, nameAr: true } },
          variants: {
            where: options.includeInactive ? undefined : { isActive: true },
            orderBy: [{ size: "asc" }, { color: "asc" }],
            select: {
              stockQuantity: true,
              minStockLevel: true,
              sellingPrice: true,
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
      where.createdAt = {
        ...(options.from ? { gte: new Date(options.from) } : {}),
        ...(options.to ? { lte: new Date(options.to) } : {}),
      };
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
