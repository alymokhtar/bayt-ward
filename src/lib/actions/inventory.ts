"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import type { StockMovementType } from "@prisma/client";

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
  revalidatePath("/inventory");
  revalidatePath("/products");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
}

export async function getInventory(options?: {
  search?: string;
  lowStockOnly?: boolean;
}) {
  await requireRole(["ADMIN", "MANAGER"]);

  const variants = await prisma.productVariant.findMany({
    where: {
      isActive: true,
      product: { isActive: true },
      ...(options?.search?.trim()
        ? {
            OR: [
              { sku: { contains: options.search.trim() } },
              { barcode: { contains: options.search.trim() } },
              { product: { name: { contains: options.search.trim() } } },
              { product: { nameAr: { contains: options.search.trim() } } },
            ],
          }
        : {}),
    },
    include: {
      product: {
        include: { category: true },
      },
    },
    orderBy: [{ product: { name: "asc" } }, { size: "asc" }, { color: "asc" }],
  });

  if (options?.lowStockOnly) {
    return variants.filter((v) => v.stockQuantity <= v.minStockLevel);
  }

  return variants;
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
        include: { product: true },
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
        include: {
          variant: {
            include: { product: true },
          },
          user: { select: { id: true, name: true } },
        },
      });
    });

    revalidateInventoryPaths();
    return { success: true, data: movement };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function getStockMovements(options?: {
  variantId?: string;
  type?: StockMovementType;
  limit?: number;
}) {
  await requireRole(["ADMIN", "MANAGER"]);

  return prisma.stockMovement.findMany({
    where: {
      ...(options?.variantId ? { variantId: options.variantId } : {}),
      ...(options?.type ? { type: options.type } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: options?.limit ?? 100,
    include: {
      variant: {
        include: {
          product: { select: { id: true, name: true, nameAr: true } },
        },
      },
      user: { select: { id: true, name: true } },
    },
  });
}
