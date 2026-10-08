"use server";

import { updateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole } from "@/lib/auth";
import { normalizeScanCode, resolveStoredBarcode } from "@/lib/barcode";
import {
  BARCODE_PREFIX,
  computeNextVariantCodes,
  SKU_PREFIX,
  validateVariantCodesPayload,
  type VariantCodeRow,
} from "@/lib/variant-codes";
import {
  getCachedProductsPage,
} from "@/lib/cached-queries";
import { invalidateProductsData } from "@/lib/revalidate-tags";
import { syncProductColors } from "@/lib/product-color-sync";
import { resolvePagination, toPaginatedResult } from "@/lib/utils";
import {
  flattenProductSearchResults,
  isLikelyVariantCodeQuery,
} from "@/lib/product-search";

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

function validateOptionalText(value: unknown, fieldName: string) {
  if (value !== undefined && typeof value !== "string") {
    throw new Error(`${fieldName} غير صالح`);
  }
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

    return { success: true, data: await allocateVariantCodes(count, pending) };
  } catch (error) {
    return handleActionError(error);
  }
}

async function allocateVariantCodes(
  count: number,
  pending: { sku: string; barcode?: string | null }[] = []
): Promise<VariantCodePair[]> {
  const prefixes = await Promise.all([
    prisma.productVariant.findFirst({
      where: { sku: { startsWith: SKU_PREFIX } },
      orderBy: { sku: "desc" },
      select: { sku: true, barcode: true },
    }),
    prisma.productVariant.findFirst({
      where: { sku: { startsWith: BARCODE_PREFIX } },
      orderBy: { sku: "desc" },
      select: { sku: true, barcode: true },
    }),
    prisma.productVariant.findFirst({
      where: { barcode: { startsWith: SKU_PREFIX } },
      orderBy: { barcode: "desc" },
      select: { sku: true, barcode: true },
    }),
    prisma.productVariant.findFirst({
      where: { barcode: { startsWith: BARCODE_PREFIX } },
      orderBy: { barcode: "desc" },
      select: { sku: true, barcode: true },
    }),
  ]);
  const knownRows = prefixes.filter((row): row is VariantCodeRow => row !== null);
  const reservedCodes = new Set<string>();
  for (const variant of pending) {
    if (variant.sku.trim()) reservedCodes.add(variant.sku.trim().toLowerCase());
    if (variant.barcode?.trim()) reservedCodes.add(variant.barcode.trim().toLowerCase());
  }

  const allocated: VariantCodePair[] = [];
  for (let index = 0; index < count; index += 1) {
    let candidate = computeNextVariantCodes(
      [...knownRows, ...pending.map((variant) => ({
        sku: variant.sku.trim(),
        barcode: variant.barcode?.trim() || null,
      })), ...allocated],
      1
    )[0];

    while (true) {
      const candidateCodes = [candidate.sku, candidate.barcode];
      const conflictsWithPending = candidateCodes.some((code) =>
        reservedCodes.has(code.toLowerCase())
      );
      const existing = conflictsWithPending
        ? true
        : await prisma.productVariant.findFirst({
            where: {
              OR: [
                { sku: { in: candidateCodes } },
                { barcode: { in: candidateCodes } },
              ],
            },
            select: { id: true },
          });
      if (!existing) break;
      knownRows.push(candidate);
      candidate = computeNextVariantCodes(
        [...knownRows, ...pending.map((variant) => ({
          sku: variant.sku.trim(),
          barcode: variant.barcode?.trim() || null,
        })), ...allocated],
        1
      )[0];
    }

    allocated.push(candidate);
    reservedCodes.add(candidate.sku.toLowerCase());
    reservedCodes.add(candidate.barcode.toLowerCase());
  }

  return allocated;
}

function prepareVariantsForSave(
  variants: VariantSaveInput[]
): (VariantSaveInput & { barcode: string; stockQuantity: number; minStockLevel: number })[] {
  const prepared = variants.map((variant) => {
    if (!variant || typeof variant !== "object") {
      throw new Error("بيانات المتغير غير صالحة");
    }
    if (typeof variant.sku !== "string") {
      throw new Error("رمز SKU غير صالح");
    }
    if (variant.barcode !== undefined && typeof variant.barcode !== "string") {
      throw new Error("الباركود غير صالح");
    }
    if (variant.colorHex !== undefined && typeof variant.colorHex !== "string") {
      throw new Error("رمز اللون غير صالح");
    }
    if (typeof variant.globalColorId !== "string" || !variant.globalColorId.trim()) {
      throw new Error("يرجى اختيار لون مركزي لكل متغير");
    }

    const sku = variant.sku?.trim() ?? "";
    let barcode = variant.barcode?.trim() ?? "";

    if (!sku) {
      throw new Error("لم يتم تخصيص أكواد SKU للمتغيرات الجديدة");
    } else if (!barcode) {
      barcode = resolveStoredBarcode(sku, "");
    } else {
      barcode = resolveStoredBarcode(sku, barcode);
    }

    if (!sku) {
      throw new Error("رمز SKU مطلوب لكل متغير");
    }
    const size = typeof variant.size === "string" ? variant.size.trim() : "";
    const color = typeof variant.color === "string" ? variant.color.trim() : "";
    if (!size || !color) {
      throw new Error("المقاس واللون مطلوبان لكل متغير");
    }

    if (typeof variant.costPrice !== "number" || !Number.isFinite(variant.costPrice) || variant.costPrice < 0) {
      throw new Error("سعر التكلفة يجب أن يكون رقماً صحيحاً موجباً");
    }
    if (typeof variant.sellingPrice !== "number" || !Number.isFinite(variant.sellingPrice) || variant.sellingPrice < 0) {
      throw new Error("سعر البيع يجب أن يكون رقماً صحيحاً موجباً");
    }

    const stockQuantity = variant.stockQuantity ?? 0;
    if (!Number.isInteger(stockQuantity) || stockQuantity < 0) {
      throw new Error("الكمية الافتتاحية يجب أن تكون عدداً صحيحاً غير سالب");
    }
    const minStockLevel = variant.minStockLevel ?? 5;
    if (!Number.isInteger(minStockLevel) || minStockLevel < 0) {
      throw new Error("الحد الأدنى للمخزون يجب أن يكون عدداً صحيحاً غير سالب");
    }

    return {
      ...variant,
      sku, 
      barcode,
      size,
      color,
      stockQuantity,
      minStockLevel,
    };
  });

  validateVariantCodesPayload(prepared, []);
  return prepared;
}

async function assignMissingVariantCodes(variants: VariantSaveInput[]) {
  const missingCount = variants.filter((variant) => !variant.sku?.trim()).length;
  if (missingCount === 0) return variants;

  const pending = variants
    .filter((variant) => variant.sku?.trim())
    .map((variant) => ({ sku: variant.sku.trim(), barcode: variant.barcode || null }));
  const codes = await allocateVariantCodes(missingCount, pending);
  let index = 0;

  return variants.map((variant) => {
    if (variant.sku?.trim()) return variant;
    const allocated = codes[index++];
    return {
      ...variant,
      sku: allocated.sku,
      barcode: variant.barcode?.trim() || allocated.barcode,
    };
  });
}

async function validateVariantCodesAgainstStore(
  variants: Array<{ id?: string; sku: string; barcode: string }>,
  excludedIds: string[] = []
) {
  for (const variant of variants) {
    const codes = [variant.sku.trim(), variant.barcode.trim()];
    const existing = await prisma.productVariant.findFirst({
      where: {
        OR: [
          { sku: { in: codes } },
          { barcode: { in: codes } },
        ],
        ...(excludedIds.length > 0 ? { id: { notIn: excludedIds } } : {}),
      },
      select: { id: true },
    });
    if (existing) {
      throw new Error("رمز SKU أو الباركود مستخدم بالفعل");
    }
  }
}

async function validateProductCategory(categoryId: string) {
  if (typeof categoryId !== "string" || !categoryId.trim()) {
    throw new Error("التصنيف مطلوب");
  }
  const category = await prisma.category.findUnique({
    where: { id: categoryId.trim() },
    select: { id: true },
  });
  if (!category) throw new Error("التصنيف غير موجود");
}

async function validateGlobalColors(
  variants: Array<{ globalColorId?: string | null }>
) {
  const colorIds = [...new Set(
    variants
      .map((variant) => variant.globalColorId?.trim())
      .filter((colorId): colorId is string => Boolean(colorId)),
  )];
  if (colorIds.length === 0) return;

  const colors = await prisma.globalColor.findMany({
    where: { id: { in: colorIds } },
    select: { id: true },
  });
  if (colors.length !== colorIds.length) {
    throw new Error("أحد الألوان المركزية غير موجود");
  }
}

function assertUniqueVariantCombinations(
  variants: Array<{
    size: string;
    globalColorId?: string | null;
    isActive?: boolean;
  }>
) {
  const seen = new Set<string>();
  for (const variant of variants) {
    if (variant.isActive === false) continue;
    const size = variant.size.trim();
    const globalColorId = variant.globalColorId?.trim();
    if (!size || !globalColorId) continue;

    const combination = `${size}\u0000${globalColorId}`;
    if (seen.has(combination)) {
      throw new Error("لا يمكن تكرار نفس المقاس واللون للمنتج");
    }
    seen.add(combination);
  }
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

    if (typeof data.name !== "string" || !data.name.trim()) {
      return { success: false, error: "اسم المنتج مطلوب" };
    }
    validateOptionalText(data.nameAr, "الاسم العربي");
    validateOptionalText(data.description, "الوصف");
    validateOptionalText(data.brand, "العلامة التجارية");

    if (!Array.isArray(data.variants) || data.variants.length === 0) {
      return { success: false, error: "يجب إضافة متغير واحد على الأقل" };
    }

    await validateProductCategory(data.categoryId);
    const assignedVariants = await assignMissingVariantCodes(data.variants);
    const preparedVariants = prepareVariantsForSave(assignedVariants);
    assertUniqueVariantCombinations(preparedVariants);
    await validateVariantCodesAgainstStore(preparedVariants);
    await validateGlobalColors(preparedVariants);

    const product = await prisma.$transaction(
      async (tx) => {
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
                costPrice: v.costPrice,
                sellingPrice: v.sellingPrice,
                stockQuantity: v.stockQuantity,
                minStockLevel: v.minStockLevel,
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
    // Immediate cache invalidation for storefront
    updateTag('products-list');
    updateTag('product-' + product.id);
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
    const user = await requireRole(["ADMIN", "MANAGER"]);

    if (data.name !== undefined && (typeof data.name !== "string" || !data.name.trim())) {
      return { success: false, error: "اسم المنتج مطلوب" };
    }
    validateOptionalText(data.nameAr, "الاسم العربي");
    validateOptionalText(data.description, "الوصف");
    validateOptionalText(data.brand, "العلامة التجارية");
    if (data.categoryId !== undefined) {
      await validateProductCategory(data.categoryId);
    }

    const existing = await prisma.product.findUnique({
      where: { id },
      include: { variants: true },
    });

    if (!existing) {
      return { success: false, error: "المنتج غير موجود" };
    }

    const existingIds = new Set(existing.variants.map((variant) => variant.id));
    let preparedVariants: ReturnType<typeof prepareVariantsForSave> | undefined;
    if (data.variants !== undefined) {
      if (!Array.isArray(data.variants) || data.variants.length === 0) {
        return { success: false, error: "يجب إضافة متغير واحد على الأقل" };
      }

      const incomingIds = data.variants
        .map((variant) => variant.id?.trim())
        .filter((variantId): variantId is string => Boolean(variantId));
      if (incomingIds.some((variantId) => !existingIds.has(variantId))) {
        return { success: false, error: "أحد المتغيرات لا ينتمي إلى هذا المنتج" };
      }
      const deletedIds = (data.deletedVariantIds ?? [])
        .map((variantId) => variantId.trim())
        .filter(Boolean);
      if (deletedIds.some((variantId) => !existingIds.has(variantId))) {
        return { success: false, error: "أحد المتغيرات المراد أرشفتها غير صالح" };
      }

      const assignedVariants = await assignMissingVariantCodes(data.variants);
      preparedVariants = prepareVariantsForSave(assignedVariants);
      assertUniqueVariantCombinations(preparedVariants);
      await validateVariantCodesAgainstStore(
        preparedVariants,
        preparedVariants.map((variant) => variant.id).filter((variantId): variantId is string => Boolean(variantId))
      );
      await validateGlobalColors(preparedVariants);
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

      if (preparedVariants) {
        const incomingIds = new Set(
          preparedVariants.filter((v) => v.id).map((v) => v.id!)
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

        await syncProductColors(tx, id, preparedVariants, existing.variants);

        const variantOperations = preparedVariants.map(async (variant) => {
          if (variant.id && existingIds.has(variant.id)) {
            const original = existing.variants.find((row) => row.id === variant.id);
            const updateData: Record<string, string | boolean | number | null | undefined> = {
              sku: variant.sku,
              barcode: variant.barcode,
              size: variant.size?.trim() || "",
              color: variant.color?.trim() || "",
              globalColorId: variant.globalColorId || undefined,
              sellingPrice: variant.sellingPrice,
              minStockLevel: variant.minStockLevel,
              isActive: variant.isActive ?? true,
            };
            if (!original || original.costPrice !== variant.costPrice) {
              updateData.costPrice = variant.costPrice;
            }

            if (variant.colorHex !== undefined) {
              updateData.colorHex = variant.colorHex?.trim() || null;
            }

            if (original && original.stockQuantity > 0 && original.costPrice !== variant.costPrice) {
              const updatedVariants = await tx.productVariant.updateManyAndReturn({
                where: {
                  id: variant.id,
                  stockQuantity: original.stockQuantity,
                  costPrice: original.costPrice,
                },
                data: updateData,
                select: { stockQuantity: true },
              });
              const updated = updatedVariants[0];
              if (!updated) {
                throw new Error("تغير رصيد أو تكلفة المنتج أثناء التعديل. أعد المحاولة");
              }
              await tx.stockMovement.create({
                data: {
                  variantId: variant.id,
                  userId: user.id,
                  type: "ADJUSTMENT",
                  quantity: 0,
                  previousQty: original.stockQuantity,
                  newQty: updated.stockQuantity,
                  previousCostPrice: original.costPrice,
                  newCostPrice: variant.costPrice,
                  valuationDifference:
                    Math.round(
                      (variant.costPrice - original.costPrice) *
                        original.stockQuantity *
                        100
                    ) / 100,
                  notes: "تعديل تكلفة يدوي من نموذج المنتج",
                },
              });
              return updated;
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
              costPrice: variant.costPrice,
              sellingPrice: variant.sellingPrice,
              stockQuantity: 0,
              minStockLevel: variant.minStockLevel,
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
    // Immediate cache invalidation for storefront
    updateTag('products-list');
    updateTag('product-' + id);
    return { success: true, data: product! };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function deleteProduct(
  id: string,
): Promise<ActionResult<{ archived: boolean; message: string }>> {
  try {
    await requireRole(["ADMIN", "MANAGER"]);

    const archived = await prisma.$transaction(async (tx) => {
      const existing = await tx.product.findUnique({
        where: { id },
        select: {
          id: true,
          variants: {
            select: { id: true, stockQuantity: true },
          },
        },
      });

      if (!existing) {
        throw new Error("المنتج غير موجود");
      }

      const variantIds = existing.variants.map((variant) => variant.id);
      const hasStock = existing.variants.some((variant) => variant.stockQuantity !== 0);
      const [saleItems, purchaseItems, returnItems, stockMovements] =
        variantIds.length > 0
          ? await Promise.all([
              tx.saleItem.count({ where: { variantId: { in: variantIds } } }),
              tx.purchaseItem.count({ where: { variantId: { in: variantIds } } }),
              tx.returnItem.count({ where: { variantId: { in: variantIds } } }),
              tx.stockMovement.count({ where: { variantId: { in: variantIds } } }),
            ])
          : [0, 0, 0, 0];

      const hasHistory =
        hasStock ||
        saleItems > 0 ||
        purchaseItems > 0 ||
        returnItems > 0 ||
        stockMovements > 0;

      if (hasHistory) {
        await tx.product.update({
          where: { id },
          data: { isActive: false },
        });
        if (variantIds.length > 0) {
          await tx.productVariant.updateMany({
            where: { id: { in: variantIds } },
            data: { isActive: false },
          });
        }
        return true;
      }

      await tx.product.delete({ where: { id } });
      return false;
    }, { maxWait: 10000, timeout: 20000 });

    revalidateProductPaths();
    // Immediate cache invalidation for storefront
    updateTag('products-list');
    updateTag('product-' + id);
    return {
      success: true,
      data: {
        archived,
        message: archived
          ? "تمت أرشفة المنتج والمتغيرات للحفاظ على سجلات الحركات السابقة"
          : "تم حذف المنتج لعدم وجود حركات أو سجلات تاريخية مرتبطة به",
      },
    };
  } catch (error) {
    return handleActionError(error);
  }
}

function isNumericQuery(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 && /^[0-9]+$/.test(trimmed);
}

export async function searchVariants(query: string) {
  await requireAuth();

  const q = query?.trim();
  if (!q) return [];

  if (isLikelyVariantCodeQuery(q)) {
    const variants = await prisma.productVariant.findMany({
      where: {
        isActive: true,
        product: { isActive: true },
        OR: [{ barcode: q }, { sku: q }],
      },
      select: {
        ...variantSearchSelect,
      },
      take: 20,
      orderBy: [{ sku: "asc" }, { barcode: "asc" }],
    });

    return variants.map((variant) => ({
      ...variant,
      product: {
        id: variant.product.id,
        name: variant.product.name,
        nameAr: variant.product.nameAr,
        categoryId: variant.product.categoryId,
      },
    }));
  }

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
    select: { id: true, name: true, nameAr: true, categoryId: true },
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
