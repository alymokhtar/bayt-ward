import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCachedStoreSettings } from "@/lib/cached-queries";
import { CACHE_TAG } from "@/lib/server-cache";
import {
  PUBLISHED_PRODUCT_WHERE,
  STORE_PAGE_SIZE,
  STORE_REVALIDATE_SECONDS,
} from "@/lib/store/constants";
import { storeProductInclude } from "@/lib/store/types";
import { resolvePagination, toPaginatedResult } from "@/lib/utils";

const publishedCategoryFilter = {
  isActive: true,
  products: {
    some: PUBLISHED_PRODUCT_WHERE,
  },
} as const;

export const getCachedStoreSettingsPublic = unstable_cache(
  async () => getCachedStoreSettings(),
  ["storefront-settings"],
  {
    tags: [CACHE_TAG.settings, CACHE_TAG.storefront],
    revalidate: 300,
  }
);

export const getCachedPublishedProducts = unstable_cache(
  async (paramsJson: string) => {
    const { categoryId, page, pageSize } = JSON.parse(paramsJson) as {
      categoryId?: string;
      page?: number;
      pageSize?: number;
    };

    const pagination = resolvePagination(page, pageSize ?? STORE_PAGE_SIZE);
    const where = {
      ...PUBLISHED_PRODUCT_WHERE,
      ...(categoryId ? { categoryId } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: pagination.take,
        skip: pagination.skip,
        include: storeProductInclude,
      }),
      prisma.product.count({ where }),
    ]);

    return toPaginatedResult(items, total, pagination.page, pagination.pageSize);
  },
  ["storefront-products"],
  {
    tags: [CACHE_TAG.products, CACHE_TAG.storefront],
    revalidate: STORE_REVALIDATE_SECONDS,
  }
);

export const getCachedFeaturedProducts = unstable_cache(
  async (limit = 8) =>
    prisma.product.findMany({
      where: {
        ...PUBLISHED_PRODUCT_WHERE,
        featuredProduct: true,
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
      include: storeProductInclude,
    }),
  ["storefront-featured"],
  {
    tags: [CACHE_TAG.products, CACHE_TAG.storefront],
    revalidate: STORE_REVALIDATE_SECONDS,
  }
);

export const getCachedNewestProducts = unstable_cache(
  async (limit = 8) =>
    prisma.product.findMany({
      where: PUBLISHED_PRODUCT_WHERE,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: storeProductInclude,
    }),
  ["storefront-newest"],
  {
    tags: [CACHE_TAG.products, CACHE_TAG.storefront],
    revalidate: STORE_REVALIDATE_SECONDS,
  }
);

export const getCachedStoreCategories = unstable_cache(
  async () =>
    prisma.category.findMany({
      where: publishedCategoryFilter,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        nameAr: true,
        description: true,
        _count: {
          select: {
            products: {
              where: PUBLISHED_PRODUCT_WHERE,
            },
          },
        },
      },
    }),
  ["storefront-categories"],
  {
    tags: [CACHE_TAG.categories, CACHE_TAG.products, CACHE_TAG.storefront],
    revalidate: STORE_REVALIDATE_SECONDS,
  }
);

export const getCachedStoreCategory = unstable_cache(
  async (categoryId: string) =>
    prisma.category.findFirst({
      where: {
        id: categoryId,
        isActive: true,
        products: { some: PUBLISHED_PRODUCT_WHERE },
      },
      select: {
        id: true,
        name: true,
        nameAr: true,
        description: true,
        _count: {
          select: {
            products: {
              where: PUBLISHED_PRODUCT_WHERE,
            },
          },
        },
      },
    }),
  ["storefront-category"],
  {
    tags: [CACHE_TAG.categories, CACHE_TAG.products, CACHE_TAG.storefront],
    revalidate: STORE_REVALIDATE_SECONDS,
  }
);

export const getCachedPublishedProduct = unstable_cache(
  async (productId: string) =>
    prisma.product.findFirst({
      where: {
        id: productId,
        ...PUBLISHED_PRODUCT_WHERE,
      },
      include: storeProductInclude,
    }),
  ["storefront-product"],
  {
    tags: [CACHE_TAG.products, CACHE_TAG.storefront],
    revalidate: STORE_REVALIDATE_SECONDS,
  }
);

export const getCachedSimilarProducts = unstable_cache(
  async (productId: string, categoryId: string, limit = 4) =>
    prisma.product.findMany({
      where: {
        ...PUBLISHED_PRODUCT_WHERE,
        categoryId,
        id: { not: productId },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: storeProductInclude,
    }),
  ["storefront-similar"],
  {
    tags: [CACHE_TAG.products, CACHE_TAG.storefront],
    revalidate: STORE_REVALIDATE_SECONDS,
  }
);

export const getCachedGalleryImages = unstable_cache(
  async (limit = 12) => {
    const media = await prisma.productMedia.findMany({
      where: {
        isActive: true,
        productColor: {
          isActive: true,
          product: PUBLISHED_PRODUCT_WHERE,
        },
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      take: limit,
      select: {
        id: true,
        url: true,
        altText: true,
        productColor: {
          select: {
            product: {
              select: { id: true, name: true, nameAr: true },
            },
          },
        },
      },
    });

    return media;
  },
  ["storefront-gallery"],
  {
    tags: [CACHE_TAG.products, CACHE_TAG.storefront],
    revalidate: STORE_REVALIDATE_SECONDS,
  }
);

export const getCachedPublishedProductIds = unstable_cache(
  async () =>
    prisma.product.findMany({
      where: PUBLISHED_PRODUCT_WHERE,
      select: { id: true },
      orderBy: { createdAt: "desc" },
    }),
  ["storefront-product-ids"],
  {
    tags: [CACHE_TAG.products, CACHE_TAG.storefront],
    revalidate: STORE_REVALIDATE_SECONDS,
  }
);
