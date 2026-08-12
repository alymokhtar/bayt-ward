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
  globalColorId?: string;
  costPrice: number;
  sellingPrice: number;
  stockQuantity?: number;
  minStockLevel?: number;
};

type VariantSaveInput = VariantInput & { id?: string; isActive?: boolean };
type ProductImageInput = {
  id?: string;
  productVariantId?: string;
  url: string;
  publicId: string;
  altText?: string;
  sortOrder?: number;
  isPrimary?: boolean;
  isActive?: boolean;
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
        where: { isActive: true },
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
    if (!variant.globalColorId?.trim()) {
      throw new Error("يرجى اختيار لون مركزي لكل متغير");
    }

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

    if (!variant.globalColorId) {
      throw new Error("يرجى اختيار لون مركزي لكل متغير");
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
  images?: ProductImageInput[];
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

    const product = await prisma.$transaction(
      async (tx) => {
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
                globalColorId: v.globalColorId || undefined,
                costPrice: typeof v.costPrice === "number" ? v.costPrice : parseFloat(String(v.costPrice) || "0"),
                sellingPrice: typeof v.sellingPrice === "number" ? v.sellingPrice : parseFloat(String(v.sellingPrice) || "0"),
                stockQuantity: typeof v.stockQuantity === "number" ? Math.max(0, v.stockQuantity) : parseInt(String(v.stockQuantity) || "0"),
                minStockLevel: typeof v.minStockLevel === "number" ? Math.max(0, v.minStockLevel) : 5,
                isActive: true,
              })),
            },
          },
          include: { variants: true, category: true },
        });

        const images = data.images ?? [];
        const firstPrimaryIndex = images.findIndex((image) => image.isPrimary);
        if (firstPrimaryIndex !== -1) {
          await tx.image.updateMany({
            where: {
              OR: [
                { productId: created.id },
                { productVariant: { productId: created.id } },
              ],
            },
            data: { isPrimary: false },
          });
        }

        const imageRows = images.map((image, index) => ({
          productId: image.productVariantId ? null : created.id,
          productVariantId: image.productVariantId || null,
          url: image.url.trim(),
          publicId: image.publicId.trim(),
          altText: image.altText?.trim() || null,
          sortOrder: image.sortOrder ?? 0,
          isPrimary: index === firstPrimaryIndex,
          isActive: image.isActive ?? true,
        }));

        const stockMovementRows = created.variants
          .filter((variant) => variant.stockQuantity > 0)
          .map((variant) => ({
            variantId: variant.id,
            userId: user.id,
            type: "ADJUSTMENT" as const,
            quantity: variant.stockQuantity,
            previousQty: 0,
            newQty: variant.stockQuantity,
            reference: "INITIAL_STOCK",
            notes: "رصيد افتتاحي عند إنشاء المنتج",
          }));

        await Promise.all([
          imageRows.length > 0
            ? tx.image.createMany({ data: imageRows })
            : Promise.resolve(),
          syncProductColors(tx, created.id, preparedVariants, []),
          stockMovementRows.length > 0
            ? tx.stockMovement.createMany({ data: stockMovementRows })
            : Promise.resolve(),
        ]);

        return created;
      },
      { maxWait: 10000, timeout: 20000 }
    );

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
    deletedVariantIds?: string[];
    images?: ProductImageInput[];
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

    const product = await prisma.$transaction(
      async (tx) => {
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

        const explicitDeletedVariantIds = (data.deletedVariantIds ?? [])
          .map((id) => id?.trim())
          .filter((id): id is string => Boolean(id));

        const toDelete = Array.from(
          new Set([
            ...explicitDeletedVariantIds,
            ...[...existingIds].filter((vid) => !incomingIds.has(vid)),
          ])
        ).filter((vid) => existingIds.has(vid));

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

        const variantOperations = preparedVariants.map((variant) => {
          if (variant.id && existingIds.has(variant.id)) {
            const updateData: Record<string, string | boolean | number | null | undefined> = {
              sku: variant.sku,
              barcode: variant.barcode,
              size: variant.size?.trim() || "",
              color: variant.color?.trim() || "",
              globalColorId: variant.globalColorId || undefined,
              costPrice: typeof variant.costPrice === "number" ? variant.costPrice : parseFloat(String(variant.costPrice) || "0"),
              sellingPrice: typeof variant.sellingPrice === "number" ? variant.sellingPrice : parseFloat(String(variant.sellingPrice) || "0"),
              minStockLevel: typeof variant.minStockLevel === "number" ? Math.max(0, variant.minStockLevel) : 5,
              isActive: variant.isActive ?? true,
            };

            if (variant.colorHex !== undefined) {
              updateData.colorHex = variant.colorHex?.trim() || null;
            }

            return tx.productVariant.update({
              where: { id: variant.id },
              data: updateData,
            });
          }

          return tx.productVariant.create({
            data: {
              productId: id,
              sku: variant.sku,
              barcode: variant.barcode,
              size: variant.size?.trim() || "",
              color: variant.color?.trim() || "",
              colorHex: variant.colorHex?.trim() || null,
              globalColorId: variant.globalColorId || undefined,
              costPrice: typeof variant.costPrice === "number" ? variant.costPrice : parseFloat(String(variant.costPrice) || "0"),
              sellingPrice: typeof variant.sellingPrice === "number" ? variant.sellingPrice : parseFloat(String(variant.sellingPrice) || "0"),
              stockQuantity: 0,
              minStockLevel: typeof variant.minStockLevel === "number" ? Math.max(0, variant.minStockLevel) : 5,
              isActive: true,
            },
          });
        });

        await Promise.all(variantOperations);
      }

      if (data.images) {
        const firstPrimaryIndex = data.images.findIndex((image) => image.isPrimary);
        if (firstPrimaryIndex !== -1) {
          await tx.image.updateMany({
            where: {
              OR: [
                { productId: id },
                { productVariant: { productId: id } },
              ],
            },
            data: { isPrimary: false },
          });
        }

        const preparedImages = data.images.map((image, index) => ({
          ...image,
          isPrimary: index === firstPrimaryIndex,
        }));

        const imageUpdates = preparedImages.filter((image) => image.id);
        const imageCreates = preparedImages
          .filter((image) => !image.id)
          .map((image) => ({
            productId: image.productVariantId ? null : id,
            productVariantId: image.productVariantId || null,
            url: image.url.trim(),
            publicId: image.publicId.trim(),
            altText: image.altText?.trim() || null,
            sortOrder: image.sortOrder ?? 0,
            isPrimary: image.isPrimary,
            isActive: image.isActive ?? true,
          }));

        await Promise.all([
          ...imageUpdates.map((image) =>
            tx.image.update({
              where: { id: image.id! },
              data: {
                url: image.url.trim(),
                publicId: image.publicId.trim(),
                altText: image.altText?.trim() || null,
                sortOrder: image.sortOrder ?? 0,
                isPrimary: image.isPrimary,
                isActive: image.isActive ?? true,
              },
            })
          ),
          imageCreates.length > 0
            ? tx.image.createMany({ data: imageCreates })
            : Promise.resolve(),
        ]);
      }

      return tx.product.findUnique({
        where: { id },
        include: {
          category: true,
          variants: {
            where: { isActive: true },
            orderBy: [{ size: "asc" }, { color: "asc" }],
            include: {
              images: {
                orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
              },
            },
          },
        },
      });
    }, { maxWait: 10000, timeout: 20000 });

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
    }, { maxWait: 10000, timeout: 20000 });

    revalidateProductPaths();
    return { success: true, data: undefined };
  } catch (error) {
    return handleActionError(error);
  }
}

function isNumericQuery(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 && /^[0-9]+$/.test(trimmed);
}

export function flattenProductSearchResults(
  products: Array<{
    id: string;
    name: string;
    nameAr: string | null;
    variants: Array<{
      id: string;
      sku: string;
      barcode: string | null;
      size: string;
      color: string;
      costPrice: number;
      sellingPrice: number;
      stockQuantity: number;
      isActive?: boolean;
    }>;
  }>
) {
  return products.flatMap((product) =>
    product.variants.map((variant) => ({
      ...variant,
      product: {
        id: product.id,
        name: product.name,
        nameAr: product.nameAr,
      },
    }))
  );
}

export async function searchVariants(query: string) {
  await requireAuth();

  const q = query?.trim();
  if (!q) return [];

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      OR: [
        { name: { contains: q } },
        { nameAr: { contains: q } },
        {
          variants: {
            some: {
              isActive: true,
              OR: [
                { sku: isNumericQuery(q) ? q : { contains: q } },
                { barcode: isNumericQuery(q) ? q : { contains: q } },
              ],
            },
          },
        },
      ],
    },
    take: 20,
    orderBy: [{ name: "asc" }, { nameAr: "asc" }],
    include: {
      variants: {
        where: { isActive: true },
        orderBy: [{ size: "asc" }, { color: "asc" }, { sku: "asc" }],
      },
    },
  });

  const results = flattenProductSearchResults(products);

  if (isNumericQuery(q) && results.length > 0) {
    const exactMatch = results.find(
      (variant) => variant.barcode === q || variant.sku === q
    );

    if (exactMatch) {
      return [exactMatch];
    }
  }

  return results;
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
