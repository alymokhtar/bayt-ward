"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole } from "@/lib/auth";
import { normalizeScanCode, resolveStoredBarcode } from "@/lib/barcode";
import {
  getCachedProductsPage,
} from "@/lib/cached-queries";
import { invalidateProductsData } from "@/lib/revalidate-tags";
import { resolvePagination, toPaginatedResult } from "@/lib/utils";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

export type VariantInput = {
  sku: string;
  barcode?: string;
  size: string;
  color: string;
  colorHex?: string;
  costPrice: number;
  sellingPrice: number;
  stockQuantity?: number;
  minStockLevel?: number;
};

function handleActionError(error: unknown): ActionResult<never> {
  if (error instanceof Error) {
    if (error.message === "UNAUTHORIZED") {
      return { success: false, error: "يجب تسجيل الدخول أولاً" };
    }
    if (error.message === "FORBIDDEN") {
      return { success: false, error: "ليس لديك صلاحية لهذا الإجراء" };
    }
    if (error.message.includes("Unique constraint")) {
      return { success: false, error: "رمز SKU أو الباركود مستخدم بالفعل" };
    }
    return { success: false, error: error.message };
  }
  return { success: false, error: "حدث خطأ غير متوقع" };
}

function revalidateProductPaths() {
  invalidateProductsData();
}

export async function getProducts(options?: {
  search?: string;
  categoryId?: string;
  includeInactive?: boolean;
  page?: number;
  pageSize?: number;
}) {
  await requireRole(["ADMIN", "MANAGER"]);
  return getCachedProductsPage(JSON.stringify(options ?? {}));
}

export async function getProduct(id: string) {
  await requireRole(["ADMIN", "MANAGER"]);

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      variants: { orderBy: [{ size: "asc" }, { color: "asc" }] },
    },
  });

  if (!product) {
    throw new Error("المنتج غير موجود");
  }

  return product;
}

export async function getUsedColors(): Promise<string[]> {
  await requireRole(["ADMIN", "MANAGER"]);

  const rows = await prisma.productVariant.findMany({
    where: { color: { not: "" } },
    select: { color: true },
    distinct: ["color"],
    orderBy: { color: "asc" },
  });

  return rows.map((row) => row.color);
}

export async function createProduct(data: {
  name: string;
  nameAr?: string;
  description?: string;
  brand?: string;
  categoryId: string;
  imageUrl?: string;
  variants: VariantInput[];
}) {
  try {
    const user = await requireRole(["ADMIN", "MANAGER"]);

    if (!data.name?.trim()) {
      return { success: false, error: "اسم المنتج مطلوب" };
    }

    if (!data.categoryId) {
      return { success: false, error: "التصنيف مطلوب" };
    }

    if (!data.variants?.length) {
      return { success: false, error: "يجب إضافة متغير واحد على الأقل" };
    }

    const category = await prisma.category.findUnique({
      where: { id: data.categoryId },
    });
    if (!category) {
      return { success: false, error: "التصنيف غير موجود" };
    }

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          name: data.name.trim(),
          nameAr: data.nameAr?.trim(),
          description: data.description?.trim(),
          brand: data.brand?.trim(),
          categoryId: data.categoryId,
          imageUrl: data.imageUrl,
          variants: {
            create: data.variants.map((v) => ({
              sku: v.sku.trim(),
              barcode: resolveStoredBarcode(v.sku, v.barcode),
              size: v.size,
              color: v.color,
              colorHex: v.colorHex,
              costPrice: v.costPrice,
              sellingPrice: v.sellingPrice,
              stockQuantity: v.stockQuantity ?? 0,
              minStockLevel: v.minStockLevel ?? 5,
            })),
          },
        },
        include: { variants: true, category: true },
      });

      for (const variant of created.variants) {
        if (variant.stockQuantity > 0) {
          await tx.stockMovement.create({
            data: {
              variantId: variant.id,
              userId: user.id,
              type: "ADJUSTMENT",
              quantity: variant.stockQuantity,
              previousQty: 0,
              newQty: variant.stockQuantity,
              reference: "INITIAL_STOCK",
              notes: "رصيد افتتاحي عند إنشاء المنتج",
            },
          });
        }
      }

      return created;
    });

    revalidateProductPaths();
    return { success: true, data: product };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function updateProduct(
  id: string,
  data: {
    name?: string;
    nameAr?: string;
    description?: string;
    brand?: string;
    categoryId?: string;
    imageUrl?: string;
    isActive?: boolean;
    variants?: (VariantInput & { id?: string; isActive?: boolean })[];
  }
) {
  try {
    await requireRole(["ADMIN", "MANAGER"]);

    const existing = await prisma.product.findUnique({
      where: { id },
      include: { variants: true },
    });

    if (!existing) {
      return { success: false, error: "المنتج غير موجود" };
    }

    if (data.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: data.categoryId },
      });
      if (!category) {
        return { success: false, error: "التصنيف غير موجود" };
      }
    }

    const product = await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: {
          name: data.name?.trim(),
          nameAr: data.nameAr?.trim(),
          description: data.description?.trim(),
          brand: data.brand?.trim(),
          categoryId: data.categoryId,
          imageUrl: data.imageUrl,
          isActive: data.isActive,
        },
      });

      if (data.variants) {
        const existingIds = new Set(existing.variants.map((v) => v.id));
        const incomingIds = new Set(
          data.variants.filter((v) => v.id).map((v) => v.id!)
        );

        const toDelete = [...existingIds].filter((vid) => !incomingIds.has(vid));
        if (toDelete.length > 0) {
          await tx.productVariant.updateMany({
            where: { id: { in: toDelete } },
            data: { isActive: false },
          });
        }

        for (const variant of data.variants) {
          if (variant.id && existingIds.has(variant.id)) {
            await tx.productVariant.update({
              where: { id: variant.id },
              data: {
                sku: variant.sku.trim(),
                barcode: resolveStoredBarcode(variant.sku, variant.barcode),
                size: variant.size,
                color: variant.color,
                colorHex: variant.colorHex,
                costPrice: variant.costPrice,
                sellingPrice: variant.sellingPrice,
                minStockLevel: variant.minStockLevel ?? 5,
                isActive: variant.isActive ?? true,
              },
            });
          } else if (!variant.id) {
            await tx.productVariant.create({
              data: {
                productId: id,
                sku: variant.sku.trim(),
                barcode: resolveStoredBarcode(variant.sku, variant.barcode),
                size: variant.size,
                color: variant.color,
                colorHex: variant.colorHex,
                costPrice: variant.costPrice,
                sellingPrice: variant.sellingPrice,
                stockQuantity: variant.stockQuantity ?? 0,
                minStockLevel: variant.minStockLevel ?? 5,
              },
            });
          }
        }
      }

      return tx.product.findUnique({
        where: { id },
        include: {
          category: true,
          variants: { orderBy: [{ size: "asc" }, { color: "asc" }] },
        },
      });
    });

    revalidateProductPaths();
    return { success: true, data: product! };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function deleteProduct(id: string) {
  try {
    await requireRole(["ADMIN", "MANAGER"]);

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: "المنتج غير موجود" };
    }

    await prisma.$transaction([
      prisma.productVariant.updateMany({
        where: { productId: id },
        data: { isActive: false },
      }),
      prisma.product.update({
        where: { id },
        data: { isActive: false },
      }),
    ]);

    revalidateProductPaths();
    return { success: true, data: undefined };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function searchVariants(query: string) {
  await requireAuth();

  const q = query?.trim();
  if (!q) return [];

  return prisma.productVariant.findMany({
    where: {
      isActive: true,
      product: { isActive: true },
      OR: [
        { sku: { contains: q } },
        { barcode: { contains: q } },
        { product: { name: { contains: q } } },
        { product: { nameAr: { contains: q } } },
      ],
    },
    take: 20,
    select: variantSearchSelect,
    orderBy: { sku: "asc" },
  });
}

const variantSearchSelect = {
  id: true,
  sku: true,
  barcode: true,
  size: true,
  color: true,
  costPrice: true,
  sellingPrice: true,
  stockQuantity: true,
  product: {
    select: { id: true, name: true, nameAr: true },
  },
} as const;

/** Exact barcode or SKU lookup — for scanners and Enter key in purchases/POS */
export async function lookupVariantByCode(code: string) {
  await requireAuth();

  const q = normalizeScanCode(code);
  if (!q) return null;

  return prisma.productVariant.findFirst({
    where: {
      isActive: true,
      product: { isActive: true },
      OR: [{ barcode: q }, { sku: q }],
    },
    select: variantSearchSelect,
  });
}

export async function getAllVariantsForBarcodes(options?: {
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  await requireRole(["ADMIN", "MANAGER"]);

  const where: Record<string, unknown> = {
    isActive: true,
    product: { isActive: true },
  };

  if (options?.search?.trim()) {
    const q = options.search.trim();
    where.OR = [
      { sku: { contains: q } },
      { barcode: { contains: q } },
      { product: { name: { contains: q } } },
      { product: { nameAr: { contains: q } } },
    ];
  }

  const { take, skip, page, pageSize } = resolvePagination(
    options?.page,
    options?.pageSize ?? 100
  );

  const [items, total] = await Promise.all([
    prisma.productVariant.findMany({
      where,
      take,
      skip,
      select: {
        id: true,
        sku: true,
        barcode: true,
        size: true,
        color: true,
        sellingPrice: true,
        product: { select: { name: true, nameAr: true } },
      },
      orderBy: [{ product: { name: "asc" } }, { sku: "asc" }],
    }),
    prisma.productVariant.count({ where }),
  ]);

  return toPaginatedResult(items, total, page, pageSize);
}
