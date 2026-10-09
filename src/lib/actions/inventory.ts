"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { Prisma, type StockMovementType } from "@prisma/client";
import {
  getCachedLowStockPreview,
  getCachedInventoryPage,
  getCachedStockMovementsPage,
} from "@/lib/cached-queries";
import { invalidateInventoryData, revalidateInventoryCache } from "@/lib/revalidate-tags";
import { sendTelegramMessage } from "@/lib/telegram";
import type { DashboardResult } from "@/lib/dashboard-result";
import {
  calculateStockReductionValue,
  validateManualStockAdjustment,
} from "@/lib/inventory-adjustments";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

function handleActionError(error: unknown): ActionResult<never> {
  if (error instanceof Error) {
    if (error.message === "UNAUTHORIZED") {
      return { success: false, error: "يجب تسجيل الدخول أولاً" };
    }
    if (error.message === "FORBIDDEN") {
      return { success: false, error: "ليس لديك صلاحية لهذا الإجراء" };
    }
    return { success: false, error: error.message };
  }
  return { success: false, error: "حدث خطأ غير متوقع" };
}

function revalidateInventoryPaths() {
  invalidateInventoryData();
  revalidateInventoryCache();
}

const stockMovementResponseSelect = {
  id: true,
  type: true,
  quantity: true,
  previousQty: true,
  newQty: true,
  previousCostPrice: true,
  newCostPrice: true,
  valuationDifference: true,
  reference: true,
  notes: true,
  createdAt: true,
  variant: {
    select: {
      sku: true,
      product: { select: { name: true, nameAr: true } },
    },
  },
  user: { select: { id: true, name: true } },
} satisfies Prisma.StockMovementSelect;

const stockMovementIdempotencySelect = {
  ...stockMovementResponseSelect,
  variantId: true,
  userId: true,
  idempotencyKey: true,
} satisfies Prisma.StockMovementSelect;

type StoredManualMovement = Prisma.StockMovementGetPayload<{
  select: typeof stockMovementIdempotencySelect;
}>;

type ManualMovementResponse = Prisma.StockMovementGetPayload<{
  select: typeof stockMovementResponseSelect;
}>;

function toManualMovementResponse(
  movement: StoredManualMovement,
): ManualMovementResponse {
  return {
    id: movement.id,
    type: movement.type,
    quantity: movement.quantity,
    previousQty: movement.previousQty,
    newQty: movement.newQty,
    previousCostPrice: movement.previousCostPrice,
    newCostPrice: movement.newCostPrice,
    valuationDifference: movement.valuationDifference,
    reference: movement.reference,
    notes: movement.notes,
    createdAt: movement.createdAt,
    variant: movement.variant,
    user: movement.user,
  };
}

type LowStockNotificationItem = {
  productId: string;
  productName: string;
  size: string;
  color: string;
  stockQuantity: number;
  minStockLevel: number;
};

async function notifyLowStockItems(items: LowStockNotificationItem[]) {
  if (items.length === 0) return;

  const groupedItems = new Map<string, LowStockNotificationItem[]>();
  for (const item of items) {
    const group = groupedItems.get(item.productId) ?? [];
    group.push(item);
    groupedItems.set(item.productId, group);
  }

  const message = [
    "⚠️ مخزون منخفض",
    "",
    ...Array.from(groupedItems.entries()).flatMap(([, group]) => {
      const productName = group[0]?.productName || "—";
      return [
        `• ${productName}`,
        ...group.map(
          (item) =>
            `  - ${item.color} / ${item.size}: ${item.stockQuantity} من ${item.minStockLevel}`
        ),
      ];
    }),
  ].join("\n");

  void sendTelegramMessage(message);
}

export async function checkLowStockAndNotify(variantIds?: string[]) {
  try {
    const variants = await prisma.productVariant.findMany({
      where: {
        isActive: true,
        ...(variantIds?.length ? { id: { in: variantIds } } : {}),
      },
      select: {
        id: true,
        productId: true,
        size: true,
        color: true,
        stockQuantity: true,
        minStockLevel: true,
        product: {
          select: { name: true, nameAr: true },
        },
      },
    });

    await notifyLowStockItems(
      variants
        .filter((variant) => variant.stockQuantity <= variant.minStockLevel)
        .map((variant) => ({
          productId: variant.productId,
          productName: variant.product.nameAr || variant.product.name,
          size: variant.size,
          color: variant.color,
          stockQuantity: variant.stockQuantity,
          minStockLevel: variant.minStockLevel,
        }))
    );
  } catch (error) {
    console.error("Low stock notification failed", error);
  }
}

export async function getLowStockPreview(
  limit = 8
): Promise<
  DashboardResult<Awaited<ReturnType<typeof getCachedLowStockPreview>>>
> {
  await requireRole(["ADMIN", "MANAGER"]);
  try {
    return { success: true, data: await getCachedLowStockPreview(limit) };
  } catch (error) {
    console.error("Failed to load dashboard low-stock preview", error);
    return {
      success: false,
      error: { message: "تعذر تحميل تنبيهات المخزون." },
    };
  }
}

export async function getInventory(options?: {
  search?: string;
  lowStockOnly?: boolean;
  page?: number;
  pageSize?: number;
}) {
  await requireRole(["ADMIN", "MANAGER"]);
  return getCachedInventoryPage(JSON.stringify(options ?? {}));
}

export async function findInventoryVariantByCode(code: string) {
  try {
    await requireRole(["ADMIN", "MANAGER"]);

    const normalizedCode = code.trim();
    if (!normalizedCode) {
      return { success: true as const, data: [] };
    }

    const variants = await prisma.productVariant.findMany({
      where: {
        isActive: true,
        product: { isActive: true },
        OR: [{ barcode: normalizedCode }, { sku: normalizedCode }],
      },
      take: 2,
      select: {
        id: true,
        productId: true,
        sku: true,
        barcode: true,
        size: true,
        color: true,
        stockQuantity: true,
        minStockLevel: true,
        costPrice: true,
        sellingPrice: true,
        product: {
          select: {
            name: true,
            nameAr: true,
            category: { select: { name: true, nameAr: true } },
          },
        },
      },
    });

    return { success: true as const, data: variants };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function adjustStock(data: {
  variantId: string;
  quantity: number;
  type: StockMovementType;
  notes?: string;
  idempotencyKey: string;
}) {
  try {
    const user = await requireRole(["ADMIN", "MANAGER"]);
    const type = data.type;

    if (!data.variantId) {
      return { success: false, error: "المتغير مطلوب" };
    }

    const validationError = validateManualStockAdjustment(type, data.quantity);
    if (validationError) {
      return { success: false, error: validationError };
    }

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        data.idempotencyKey,
      )
    ) {
      return { success: false, error: "مفتاح طلب التسوية غير صالح" };
    }

    const findExistingMovement = () =>
      prisma.stockMovement.findUnique({
        where: { idempotencyKey: data.idempotencyKey },
        select: stockMovementIdempotencySelect,
      });

    const matchesRequest = (
      movement: NonNullable<Awaited<ReturnType<typeof findExistingMovement>>>,
    ) =>
      movement.variantId === data.variantId &&
      movement.userId === user.id &&
      movement.type === type &&
      movement.quantity === data.quantity &&
      movement.notes === (data.notes || null);

    try {
      const result = await prisma.$transaction(async (tx) => {
        const existing = await tx.stockMovement.findUnique({
          where: { idempotencyKey: data.idempotencyKey },
          select: stockMovementIdempotencySelect,
        });
        if (existing) {
          if (!matchesRequest(existing)) {
            throw new Error("مفتاح الطلب مستخدم لتسوية مختلفة");
          }
          return {
            movement: toManualMovementResponse(existing),
            replayed: true,
          };
        }

        const updatedVariants = await tx.productVariant.updateManyAndReturn({
          where: {
            id: data.variantId,
            isActive: true,
            product: { isActive: true },
            ...(data.quantity < 0
              ? { stockQuantity: { gte: Math.abs(data.quantity) } }
              : {}),
          },
          data: { stockQuantity: { increment: data.quantity } },
          select: { id: true, stockQuantity: true, costPrice: true },
        });

        const updatedVariant = updatedVariants[0];
        if (!updatedVariant) {
          const variant = await tx.productVariant.findUnique({
            where: { id: data.variantId },
            select: {
              id: true,
              isActive: true,
              stockQuantity: true,
              product: { select: { isActive: true } },
            },
          });
          if (!variant || !variant.isActive || !variant.product.isActive) {
            throw new Error("المنتج غير موجود");
          }
          throw new Error("الكمية الناتجة لا يمكن أن تكون سالبة");
        }

        const newQty = updatedVariant.stockQuantity;
        const previousQty = newQty - data.quantity;
        const costImpact =
          data.quantity < 0 &&
          (type === "DAMAGE" || type === "ADJUSTMENT")
            ? calculateStockReductionValue(
                data.quantity,
                updatedVariant.costPrice,
              )
            : null;

        const movement = await tx.stockMovement.create({
          data: {
            variantId: data.variantId,
            userId: user.id,
            idempotencyKey: data.idempotencyKey,
            type,
            quantity: data.quantity,
            previousQty,
            newQty,
            ...(costImpact !== null
              ? {
                  previousCostPrice: updatedVariant.costPrice,
                  newCostPrice: updatedVariant.costPrice,
                  valuationDifference: costImpact,
                }
              : {}),
            notes: data.notes,
          },
          select: stockMovementResponseSelect,
        });
        return { movement, replayed: false };
      });

      if (result.replayed) {
        return { success: true, data: result.movement };
      }

      revalidateInventoryPaths();
      void checkLowStockAndNotify([data.variantId]);
      return { success: true, data: result.movement };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const existing = await findExistingMovement();
        if (existing) {
          if (matchesRequest(existing)) {
            return {
              success: true,
              data: toManualMovementResponse(existing),
            };
          }
          return {
            success: false,
            error: "مفتاح الطلب مستخدم لتسوية مختلفة",
          };
        }
      }
      throw error;
    }
  } catch (error) {
    return handleActionError(error);
  }
}

export async function getStockMovements(options?: {
  variantId?: string;
  type?: StockMovementType;
  limit?: number;
  page?: number;
  pageSize?: number;
  search?: string;
}) {
  await requireRole(["ADMIN", "MANAGER"]);
  const supportedTypes: StockMovementType[] = [
    "PURCHASE",
    "SALE",
    "RETURN",
    "ADJUSTMENT",
    "DAMAGE",
    "TRANSFER",
  ];
  const type =
    options?.type && supportedTypes.includes(options.type)
      ? options.type
      : undefined;
  if (options?.type && !type) {
    throw new Error("نوع حركة المخزون غير صالح");
  }

  return getCachedStockMovementsPage(
    JSON.stringify({
      variantId: options?.variantId,
      type,
      search: options?.search?.trim().slice(0, 100) || undefined,
      page: options?.page,
      pageSize: options?.pageSize ?? options?.limit ?? 50,
    })
  );
}

export async function getProductInventory(productId: string) {
  await requireRole(["ADMIN", "MANAGER"]);

  const product = await prisma.product.findUnique({
    where: { id: productId, isActive: true },
    select: {
      id: true,
      name: true,
      nameAr: true,
      brand: true,
      category: { select: { name: true, nameAr: true } },
      variants: {
        where: { isActive: true },
        orderBy: [{ size: "asc" }, { color: "asc" }],
        select: {
          id: true,
          sku: true,
          barcode: true,
          size: true,
          color: true,
          stockQuantity: true,
          minStockLevel: true,
          costPrice: true,
          sellingPrice: true,
        },
      },
    },
  });

  if (!product) {
    throw new Error("المنتج غير موجود");
  }

  const variants = product.variants;
  const totalStock = variants.reduce((sum, v) => sum + v.stockQuantity, 0);
  const totalCostValue = variants.reduce(
    (sum, v) => sum + v.costPrice * v.stockQuantity,
    0
  );
  const totalRetailValue = variants.reduce(
    (sum, v) => sum + v.sellingPrice * v.stockQuantity,
    0
  );
  const lowStockCount = variants.filter(
    (v) => v.stockQuantity > 0 && v.stockQuantity <= v.minStockLevel
  ).length;
  const outOfStockCount = variants.filter((v) => v.stockQuantity === 0).length;

  return {
    ...product,
    summary: {
      totalStock,
      totalCostValue,
      totalRetailValue,
      lowStockCount,
      outOfStockCount,
      variantCount: variants.length,
    },
  };
}
