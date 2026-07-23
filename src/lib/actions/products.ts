"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole } from "@/lib/auth";
import { normalizeScanCode, resolveStoredBarcode } from "@/lib/barcode";
import { computeNextVariantCodes, validateVariantCodesPayload } from "@/lib/variant-codes";
import {
  getCachedProductsPage,
} from "@/lib/cached-queries";
import { invalidateProductsData } from "@/lib/revalidate-tags";
import { syncProductColors } from "@/lib/product-color-sync";
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

type VariantSaveInput = VariantInput & { id?: string; isActive?: boolean };

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
    console.error("Product action error:", error.message);
    return { success: false, error: error.message };
  }
  console.error("Product action unknown error:", error);
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
      variants: {
        orderBy: [{ size: "asc" }, { color: "asc" }],
        include: {
          images: {
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          },
        },
      },
      colors: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: {
          media: {
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          },
        },
      },
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

export type VariantCodePair = { sku: string; barcode: string };

export async function getNextVariantCodes(
  count: number = 1,
  pending: { sku: string; barcode?: string | null }[] = []
): Promise<ActionResult<VariantCodePair[]>> {
  try {
    await requireRole(["ADMIN", "MANAGER"]);

    if (!Number.isInteger(count) || count < 1 || count > 50) {
      return { success: false, error: "عدد الأكواد غير صالح" };
    }

    const rows = await prisma.productVariant.findMany({
      select: { sku: true, barcode: true },
    });

    const merged = [
      ...rows,
      ...pending
        .filter((item) => item.sku.trim())
        .map((item) => ({
          sku: item.sku.trim(),
          barcode: item.barcode?.trim() || null,
        })),
    ];

    return { success: true, data: computeNextVariantCodes(merged, count) };
  } catch (error) {
    return handleActionError(error);
  }
}

async function ensureVariantCodes(
  variants: VariantInput[],
  existingRows: { id?: string; sku: string; barcode: string | null }[]
): Promise<VariantInput[]> {
  const needsAllocation = variants.filter((v) => !v.sku?.trim()).length;

  const freshCodes =
    needsAllocation > 0
      ? computeNextVariantCodes(existingRows, needsAllocation)
      : [];

  let codeIndex = 0;

  const prepared = variants.map((variant) => {
    let sku = variant.sku?.trim() ?? "";
    let barcode = variant.barcode?.trim() ?? "";

    if (!sku) {
      const allocated = freshCodes[codeIndex++];
      sku = allocated.sku;
      if (!barcode) barcode = allocated.barcode;
    } else if (!barcode) {
      barcode = resolveStoredBarcode(sku, "");
    } else {
      barcode = resolveStoredBarcode(sku, barcode);
    }

    return { ...variant, sku, barcode };
  });

  validateVariantCodesPayload(prepared, existingRows);

  return prepared;
}

function prepareVariantsForSave(
  variants: VariantSaveInput[]
): (VariantSaveInput & { barcode: string })[] {
  return variants.map((variant) => {
    const sku = String(variant.sku || "").trim();
    if (!sku) {
      throw new Error("رمز SKU مطلوب لكل متغير");
    }

    const barcode = resolveStoredBarcode(sku, variant.barcode);
    
    // Validate numeric fields
    const costPrice = typeof variant.costPrice === "number" ? variant.costPrice : parseFloat(String(variant.costPrice) || "0");
    const sellingPrice = typeof variant.sellingPrice === "number" ? variant.sellingPrice : parseFloat(String(variant.sellingPrice) || "0");
    
    if (!Number.isFinite(costPrice) || costPrice < 0) {
      throw new Error("سعر التكلفة يجب أن يكون رقماً صحيحاً موجباً");
    }
    
    if (!Number.isFinite(sellingPrice) || sellingPrice < 0) {
      throw new Error("سعر البيع يجب أن يكون رقماً صحيحاً موجباً");
    }

    return { 
      ...variant, 
      sku, 
      barcode,
      costPrice,
      sellingPrice,
    };
  });
}

export async function createProduct(data: {
  name: string;
  nameAr?: string;
  description?: string;
  brand?: string;
  categoryId: string;
  publishToWebsite?: boolean;
  featuredProduct?: boolean;
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
      const existingRows = await tx.productVariant.findMany({
        select: { id: true, sku: true, barcode: true },
      });
      const preparedVariants = await ensureVariantCodes(
        data.variants,
        existingRows
      );

      const created = await tx.product.create({
        data: {
          name: data.name.trim(),
          nameAr: data.nameAr?.trim() || null,
          description: data.description?.trim() || null,
          brand: data.brand?.trim() || null,
          categoryId: data.categoryId,
          publishToWebsite: data.publishToWebsite ?? false,
          featuredProduct: data.featuredProduct ?? false,
          variants: {
            create: preparedVariants.map((v) => ({
              sku: v.sku,
              barcode: v.barcode,
              size: String(v.size).trim() || "",
              color: String(v.color).trim() || "",
              colorHex: v.colorHex?.trim() || null,
              costPrice: typeof v.costPrice === "number" ? v.costPrice : parseFloat(String(v.costPrice) || "0"),
              sellingPrice: typeof v.sellingPrice === "number" ? v.sellingPrice : parseFloat(String(v.sellingPrice) || "0"),
              stockQuantity: typeof v.stockQuantity === "number" ? Math.max(0, v.stockQuantity) : parseInt(String(v.stockQuantity) || "0"),
              minStockLevel: typeof v.minStockLevel === "number" ? Math.max(0, v.minStockLevel) : 5,
            })),
          },
        },
        include: { variants: true, category: true },
      });

      await syncProductColors(tx, created.id, preparedVariants, []);

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
    publishToWebsite?: boolean;
    featuredProduct?: boolean;
    isActive?: boolean;
    variants?: VariantSaveInput[];
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
      const updateData: Record<string, string | boolean | null> = {};
      
      if (data.name !== undefined) updateData.name = data.name?.trim() || null;
      if (data.nameAr !== undefined) updateData.nameAr = data.nameAr?.trim() || null;
      if (data.description !== undefined) updateData.description = data.description?.trim() || null;
      if (data.brand !== undefined) updateData.brand = data.brand?.trim() || null;
      if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
      if (data.publishToWebsite !== undefined) updateData.publishToWebsite = data.publishToWebsite;
      if (data.featuredProduct !== undefined) updateData.featuredProduct = data.featuredProduct;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;

      await tx.product.update({
        where: { id },
        data: updateData,
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

        const allRows = await tx.productVariant.findMany({
          select: { id: true, sku: true, barcode: true },
        });

        const variantsNeedingCodes = data.variants.filter((v) => !v.sku?.trim());
        const allocatedCodes =
          variantsNeedingCodes.length > 0
            ? computeNextVariantCodes(allRows, variantsNeedingCodes.length)
            : [];
        let allocationIndex = 0;

        const incomingPrepared = data.variants.map((variant) => {
          if (!variant.sku?.trim()) {
            const codes = allocatedCodes[allocationIndex++];
            return {
              ...variant,
              sku: codes.sku,
              barcode: variant.barcode?.trim() || codes.barcode,
            };
          }
          return variant;
        });

        const preparedVariants = prepareVariantsForSave(incomingPrepared);
        validateVariantCodesPayload(preparedVariants, allRows);

        await syncProductColors(tx, id, preparedVariants, existing.variants);

        for (const variant of preparedVariants) {
          if (variant.id && existingIds.has(variant.id)) {
            const updateData: Record<string, string | boolean | number | null> = {
              sku: variant.sku,
              barcode: variant.barcode,
              size: variant.size?.trim() || "",
              color: variant.color?.trim() || "",
              costPrice: typeof variant.costPrice === "number" ? variant.costPrice : parseFloat(String(variant.costPrice) || "0"),
              sellingPrice: typeof variant.sellingPrice === "number" ? variant.sellingPrice : parseFloat(String(variant.sellingPrice) || "0"),
              minStockLevel: typeof variant.minStockLevel === "number" ? Math.max(0, variant.minStockLevel) : 5,
              isActive: variant.isActive ?? true,
            };

            if (variant.colorHex !== undefined) {
              updateData.colorHex = variant.colorHex?.trim() || null;
            }

            await tx.productVariant.update({
              where: { id: variant.id },
              data: updateData,
            });
          } else if (!variant.id) {
            await tx.productVariant.create({
              data: {
                productId: id,
                sku: variant.sku,
                barcode: variant.barcode,
                size: variant.size?.trim() || "",
                color: variant.color?.trim() || "",
                colorHex: variant.colorHex?.trim() || null,
                costPrice: typeof variant.costPrice === "number" ? variant.costPrice : parseFloat(String(variant.costPrice) || "0"),
                sellingPrice: typeof variant.sellingPrice === "number" ? variant.sellingPrice : parseFloat(String(variant.sellingPrice) || "0"),
                stockQuantity: 0,
                minStockLevel: typeof variant.minStockLevel === "number" ? Math.max(0, variant.minStockLevel) : 5,
              },
            });
          }
        }
      }

      return tx.product.findUnique({
        where: { id },
        include: {
          category: true,
          variants: {
            orderBy: [{ size: "asc" }, { color: "asc" }],
            include: {
              images: {
                orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
              },
            },
          },
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

    const existing = await prisma.product.findUnique({
      where: { id },
      include: { variants: true },
    });

    if (!existing) {
      return { success: false, error: "المنتج غير موجود" };
    }

    await prisma.$transaction(async (tx) => {
      const variantIds = existing.variants.map((variant) => variant.id);

      if (variantIds.length > 0) {
        await tx.saleItem.deleteMany({
          where: { variantId: { in: variantIds } },
        });
        await tx.purchaseItem.deleteMany({
          where: { variantId: { in: variantIds } },
        });
        await tx.returnItem.deleteMany({
          where: { variantId: { in: variantIds } },
        });
        await tx.stockMovement.deleteMany({
          where: { variantId: { in: variantIds } },
        });
      }

      await tx.product.delete({
        where: { id },
      });
    });

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

/** Exact barcode or SKU lookup — returns null if ambiguous or not found */
export async function lookupVariantByCode(code: string) {
  await requireAuth();

  const q = normalizeScanCode(code);
  if (!q) return null;

  const matches = await prisma.productVariant.findMany({
    where: {
      isActive: true,
      product: { isActive: true },
      OR: [{ barcode: q }, { sku: q }],
    },
    select: variantSearchSelect,
    take: 2,
  });

  if (matches.length !== 1) return null;
  return matches[0];
}

export async function findVariantsByExactCode(code: string) {
  await requireAuth();

  const q = normalizeScanCode(code);
  if (!q) return [];

  return prisma.productVariant.findMany({
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
