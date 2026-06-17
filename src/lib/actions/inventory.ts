"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import type { StockMovementType } from "@prisma/client";
import {
  getCachedLowStockPreview,
  getCachedInventoryPage,
  getCachedStockMovementsPage,
} from "@/lib/cached-queries";
import { invalidateInventoryData } from "@/lib/revalidate-tags";
import { sendTelegramMessage } from "@/lib/telegram";

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

export async function getLowStockPreview(limit = 8) {
  await requireRole(["ADMIN", "MANAGER"]);
  return getCachedLowStockPreview(limit);
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

export async function adjustStock(data: {
  variantId: string;
  quantity: number;
  type?: StockMovementType;
  notes?: string;
}) {
  try {
    const user = await requireRole(["ADMIN", "MANAGER"]);

    if (!data.variantId) {
      return { success: false, error: "المتغير مطلوب" };
    }

    if (data.quantity === 0) {
      return { success: false, error: "الكمية يجب أن تكون مختلفة عن صفر" };
    }

    const movement = await prisma.$transaction(async (tx) => {
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

      const previousQty = variant.stockQuantity;
      const newQty = previousQty + data.quantity;

      if (newQty < 0) {
        throw new Error("الكمية الناتجة لا يمكن أن تكون سالبة");
      }

      await tx.productVariant.update({
        where: { id: data.variantId },
        data: { stockQuantity: newQty },
      });

      return tx.stockMovement.create({
        data: {
          variantId: data.variantId,
          userId: user.id,
          type: data.type ?? "ADJUSTMENT",
          quantity: data.quantity,
          previousQty,
          newQty,
          notes: data.notes,
        },
        select: {
          id: true,
          type: true,
          quantity: true,
          previousQty: true,
          newQty: true,
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
        },
      });
    });

    revalidateInventoryPaths();
    void checkLowStockAndNotify([data.variantId]);
    return { success: true, data: movement };
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
}) {
  await requireRole(["ADMIN", "MANAGER"]);
  return getCachedStockMovementsPage(
    JSON.stringify({
      variantId: options?.variantId,
      type: options?.type,
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
