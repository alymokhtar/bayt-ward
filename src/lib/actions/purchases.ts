"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { generateInvoiceNumber } from "@/lib/utils";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

export type PurchaseItemInput = {
  variantId: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
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
  revalidatePath("/purchases");
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
}

export async function getPurchases(options?: {
  status?: string;
  supplierId?: string;
  limit?: number;
}) {
  await requireRole(["ADMIN", "MANAGER"]);

  return prisma.purchase.findMany({
    where: {
      ...(options?.status ? { status: options.status as "PENDING" | "RECEIVED" | "CANCELLED" } : {}),
      ...(options?.supplierId ? { supplierId: options.supplierId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: options?.limit ?? 50,
    include: {
      supplier: { select: { id: true, name: true, phone: true } },
      user: { select: { id: true, name: true } },
      _count: { select: { items: true } },
    },
  });
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

    const purchase = await prisma.purchase.create({
      data: {
        invoiceNumber: generateInvoiceNumber("PUR"),
        supplierId: data.supplierId,
        userId: user.id,
        subtotal: data.subtotal,
        taxAmount: data.taxAmount ?? 0,
        totalAmount: data.totalAmount,
        status: "PENDING",
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
      for (const item of purchase.items) {
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
            userId: user.id,
            type: "PURCHASE",
            quantity: item.quantity,
            previousQty,
            newQty,
            reference: purchase.invoiceNumber,
            notes: "استلام مشتريات",
          },
        });
      }

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
