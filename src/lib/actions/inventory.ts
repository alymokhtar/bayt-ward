"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import type { StockMovementType } from "@prisma/client";
import { resolvePagination, toPaginatedResult } from "@/lib/utils";

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

const inventoryVariantSelect = {
  id: true,
  sku: true,
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
} as const;

function buildInventoryWhere(options?: {
  search?: string;
  lowStockOnly?: boolean;
}) {
  const search = options?.search?.trim();

  return {
    isActive: true,
    product: { isActive: true },
    ...(search
      ? {
          OR: [
            { sku: { contains: search } },
            { barcode: { contains: search } },
            { product: { name: { contains: search } } },
            { product: { nameAr: { contains: search } } },
          ],
        }
      : {}),
    ...(options?.lowStockOnly
      ? {
          stockQuantity: { lte: prisma.productVariant.fields.minStockLevel },
        }
      : {}),
  };
}

export async function getLowStockPreview(limit = 8) {
  await requireRole(["ADMIN", "MANAGER"]);

  return prisma.productVariant.findMany({
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
  });
}

export async function getInventory(options?: {
  search?: string;
  lowStockOnly?: boolean;
  page?: number;
  pageSize?: number;
}) {
  await requireRole(["ADMIN", "MANAGER"]);

  const where = buildInventoryWhere(options);
  const { take, skip, page, pageSize } = resolvePagination(
    options?.page,
    options?.pageSize
  );

  const [items, total] = await Promise.all([
    prisma.productVariant.findMany({
      where,
      select: inventoryVariantSelect,
      orderBy: [{ product: { name: "asc" } }, { size: "asc" }, { color: "asc" }],
      take,
      skip,
    }),
    prisma.productVariant.count({ where }),
  ]);

  return toPaginatedResult(items, total, page, pageSize);
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

  const where = {
    ...(options?.variantId ? { variantId: options.variantId } : {}),
    ...(options?.type ? { type: options.type } : {}),
  };

  const { take, skip, page, pageSize } = resolvePagination(
    options?.page,
    options?.pageSize ?? options?.limit ?? 50
  );

  const [items, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      skip,
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
            product: { select: { id: true, name: true, nameAr: true } },
          },
        },
        user: { select: { id: true, name: true } },
      },
    }),
    prisma.stockMovement.count({ where }),
  ]);

  return toPaginatedResult(items, total, page, pageSize);
}
