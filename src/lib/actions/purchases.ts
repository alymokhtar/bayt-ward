"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { generateInvoiceNumber } from "@/lib/utils";
import { invalidatePurchasesData } from "@/lib/revalidate-tags";
import { getCachedPurchasesList } from "@/lib/cached-queries";
import type { Prisma } from "@prisma/client";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

export type PurchaseItemInput = {
  variantId: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
};

type PurchaseItemRow = {
  variantId: string;
  quantity: number;
  unitCost: number;
};

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

function revalidatePurchasePaths() {
  invalidatePurchasesData();
}

async function applyPurchaseItemsToInventory(
  tx: Prisma.TransactionClient,
  items: PurchaseItemRow[],
  invoiceNumber: string,
  userId: string
) {
  for (const item of items) {
    const variant = await tx.productVariant.findUnique({
      where: { id: item.variantId },
    });

    if (!variant) {
      throw new Error("أحد المنتجات غير موجود");
    }

    const previousQty = variant.stockQuantity;
    const newQty = previousQty + item.quantity;

    await tx.productVariant.update({
      where: { id: item.variantId },
      data: {
        stockQuantity: newQty,
        costPrice: item.unitCost,
      },
    });

    await tx.stockMovement.create({
      data: {
        variantId: item.variantId,
        userId,
        type: "PURCHASE",
        quantity: item.quantity,
        previousQty,
        newQty,
        reference: invoiceNumber,
        notes: "شراء من مورد",
      },
    });
  }
}

export async function getPurchases(options?: {
  status?: string;
  supplierId?: string;
  limit?: number;
}) {
  await requireRole(["ADMIN", "MANAGER"]);
  return getCachedPurchasesList(JSON.stringify(options ?? {}));
}

export async function getPurchase(id: string) {
  await requireRole(["ADMIN", "MANAGER"]);

  const purchase = await prisma.purchase.findUnique({
    where: { id },
    include: {
      supplier: { select: { id: true, name: true, phone: true } },
      user: { select: { id: true, name: true } },
      items: {
        include: {
          variant: {
            include: {
              product: { select: { name: true, nameAr: true } },
            },
          },
        },
      },
    },
  });

  if (!purchase) {
    throw new Error("أمر الشراء غير موجود");
  }

  return purchase;
}

export async function createPurchase(data: {
  supplierId: string;
  items: PurchaseItemInput[];
  subtotal: number;
  taxAmount?: number;
  totalAmount: number;
  notes?: string;
}) {
  try {
    const user = await requireRole(["ADMIN", "MANAGER"]);

    if (!data.supplierId) {
      return { success: false, error: "المورد مطلوب" };
    }

    if (!data.items?.length) {
      return { success: false, error: "يجب إضافة منتج واحد على الأقل" };
    }

    const supplier = await prisma.supplier.findUnique({
      where: { id: data.supplierId },
    });
    if (!supplier || !supplier.isActive) {
      return { success: false, error: "المورد غير موجود" };
    }

    const variantIds = data.items.map((item) => item.variantId);
    const foundVariants = await prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      select: { id: true },
    });
    if (foundVariants.length !== variantIds.length) {
      return { success: false, error: "أحد المنتجات غير موجود" };
    }

    const invoiceNumber = generateInvoiceNumber("PUR");
    const now = new Date();

    const purchase = await prisma.$transaction(async (tx) => {
      const created = await tx.purchase.create({
        data: {
          invoiceNumber,
          supplierId: data.supplierId,
          userId: user.id,
          subtotal: data.subtotal,
          taxAmount: data.taxAmount ?? 0,
          totalAmount: data.totalAmount,
          status: "RECEIVED",
          receivedAt: now,
          notes: data.notes,
          items: {
            create: data.items.map((item) => ({
              variantId: item.variantId,
              quantity: item.quantity,
              unitCost: item.unitCost,
              totalCost: item.totalCost,
            })),
          },
        },
        include: { items: true },
      });

      await applyPurchaseItemsToInventory(
        tx,
        created.items,
        invoiceNumber,
        user.id
      );

      return tx.purchase.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          supplier: true,
          items: {
            include: {
              variant: {
                include: { product: true },
              },
            },
          },
          user: { select: { id: true, name: true } },
        },
      });
    });

    revalidatePurchasePaths();
    return { success: true, data: purchase };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function receivePurchase(id: string) {
  try {
    const user = await requireRole(["ADMIN", "MANAGER"]);

    const purchase = await prisma.purchase.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!purchase) {
      return { success: false, error: "أمر الشراء غير موجود" };
    }

    if (purchase.status === "RECEIVED") {
      return { success: false, error: "تم استلام هذا الأمر مسبقاً" };
    }

    if (purchase.status === "CANCELLED") {
      return { success: false, error: "أمر الشراء ملغى" };
    }

    const received = await prisma.$transaction(async (tx) => {
      await applyPurchaseItemsToInventory(
        tx,
        purchase.items,
        purchase.invoiceNumber,
        user.id
      );

      return tx.purchase.update({
        where: { id },
        data: {
          status: "RECEIVED",
          receivedAt: new Date(),
        },
        include: {
          supplier: true,
          items: {
            include: {
              variant: {
                include: { product: true },
              },
            },
          },
          user: { select: { id: true, name: true } },
        },
      });
    });

    revalidatePurchasePaths();
    return { success: true, data: received };
  } catch (error) {
    return handleActionError(error);
  }
}
