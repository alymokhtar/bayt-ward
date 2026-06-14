import { unstable_cache } from "next/cache";
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
export const getCachedDashboardStats = unstable_cache(
  async () => {
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
      lowStockResult,
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
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*)::int AS count
        FROM "ProductVariant"
        WHERE "isActive" = true
          AND "stockQuantity" <= "minStockLevel"
      `,
    ]);

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
