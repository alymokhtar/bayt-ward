"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { generateInvoiceNumberSafe } from "@/lib/invoice-generator";
import { invalidatePurchasesData, revalidateInventoryCache } from "@/lib/revalidate-tags";
import { getCachedPurchasesList } from "@/lib/cached-queries";
import { Prisma } from "@prisma/client";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

export type PurchaseItemInput = {
  variantId: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
};

type PurchaseCreateInput = {
  idempotencyKey: string;
  supplierId: string;
  items: PurchaseItemInput[];
  subtotal?: number;
  taxAmount?: number;
  totalAmount?: number;
  notes?: string;
};

type PurchaseItemRow = {
  variantId: string;
  quantity: number;
  unitCost: number;
};

type ValidatedPurchaseItem = PurchaseItemRow & {
  totalCost: number;
};

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function validatePurchaseInput(data: {
  supplierId: string;
  items: PurchaseItemInput[];
  taxAmount?: number;
}) {
  if (typeof data.supplierId !== "string" || !data.supplierId.trim()) {
    throw new Error("المورد مطلوب");
  }
  if (!Array.isArray(data.items) || data.items.length === 0) {
    throw new Error("يجب إضافة منتج واحد على الأقل");
  }
  if (data.items.some((item) => !item || typeof item !== "object")) {
    throw new Error("أحد بنود الشراء غير صالح");
  }
  if (data.items.some((item) => typeof item.variantId !== "string" || !item.variantId.trim())) {
    throw new Error("أحد المنتجات غير صالح");
  }
  if (new Set(data.items.map((item) => item.variantId)).size !== data.items.length) {
    throw new Error("لا يمكن تكرار المنتج نفسه في فاتورة الشراء");
  }
  if (data.items.some((item) => !Number.isInteger(item.quantity) || item.quantity <= 0)) {
    throw new Error("كميات الشراء يجب أن تكون أعداداً صحيحة موجبة");
  }
  if (data.items.some((item) => !Number.isFinite(item.unitCost) || item.unitCost < 0)) {
    throw new Error("تكلفة الوحدة يجب أن تكون رقماً منتهياً غير سالب");
  }
  const taxAmount = data.taxAmount ?? 0;
  if (!Number.isFinite(taxAmount) || taxAmount < 0) {
    throw new Error("قيمة الضريبة يجب أن تكون رقماً منتهياً غير سالب");
  }

  const items: ValidatedPurchaseItem[] = data.items.map((item) => {
    const unitCost = roundMoney(item.unitCost);
    return {
      variantId: item.variantId.trim(),
      quantity: item.quantity,
      unitCost,
      totalCost: roundMoney(unitCost * item.quantity),
    };
  });
  const subtotal = roundMoney(items.reduce((sum, item) => sum + item.totalCost, 0));
  const normalizedTaxAmount = roundMoney(taxAmount);
  if (
    items.some((item) => !Number.isFinite(item.unitCost) || !Number.isFinite(item.totalCost)) ||
    !Number.isFinite(subtotal) ||
    !Number.isFinite(normalizedTaxAmount) ||
    !Number.isFinite(subtotal + normalizedTaxAmount)
  ) {
    throw new Error("إجمالي فاتورة الشراء خارج النطاق المسموح");
  }

  return {
    items,
    subtotal,
    taxAmount: normalizedTaxAmount,
    totalAmount: roundMoney(subtotal + normalizedTaxAmount),
  };
}

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
  revalidateInventoryCache();
}

async function applyPurchaseItemsToInventory(
  tx: Prisma.TransactionClient,
  items: PurchaseItemRow[],
  invoiceNumber: string,
  userId: string
) {
  if (items.length === 0) return;

  for (const item of items) {
    const currentVariant = await tx.productVariant.findFirst({
      where: {
        id: item.variantId,
        isActive: true,
        product: { isActive: true },
      },
      select: { stockQuantity: true, costPrice: true },
    });
    if (!currentVariant) {
      throw new Error("أحد المنتجات غير موجود أو مؤرشف");
    }

    const currentStock = currentVariant.stockQuantity;
    const currentCost = currentVariant.costPrice;
    if (!Number.isFinite(currentCost) || currentCost < 0) {
      throw new Error("تكلفة المنتج الحالية غير صالحة");
    }
    const nextStock = currentStock + item.quantity;
    const weightedCost =
      currentStock <= 0
        ? item.unitCost
        : roundMoney(
            (currentStock * currentCost + item.quantity * item.unitCost) /
              nextStock
          );
    if (!Number.isFinite(weightedCost)) {
      throw new Error("تعذر احتساب متوسط تكلفة المنتج");
    }
    const updatedVariants = await tx.productVariant.updateManyAndReturn({
      where: {
        id: item.variantId,
        isActive: true,
        product: { isActive: true },
        stockQuantity: currentStock,
        costPrice: currentCost,
      },
      data: {
        stockQuantity: { increment: item.quantity },
        costPrice: weightedCost,
      },
      select: { stockQuantity: true },
    });
    const updatedVariant = updatedVariants[0];
    if (!updatedVariant) {
      throw new Error("تغير رصيد أو تكلفة المنتج أثناء استلام الشراء. أعد المحاولة");
    }

    const newQty = updatedVariant.stockQuantity;
    const previousQty = newQty - item.quantity;
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
  page?: number;
  pageSize?: number;
}) {
  await requireRole(["ADMIN", "MANAGER"]);
  const status = ["PENDING", "RECEIVED", "CANCELLED"].includes(options?.status ?? "")
    ? options?.status
    : undefined;
  return getCachedPurchasesList(JSON.stringify({ ...options, status }));
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

function findPurchaseByIdempotencyKey(idempotencyKey: string, userId: string) {
  return prisma.purchase.findFirst({
    where: { idempotencyKey, userId },
    include: {
      supplier: true,
      items: { include: { variant: { include: { product: true } } } },
      user: { select: { id: true, name: true } },
    },
  });
}

export async function createPurchase(data: PurchaseCreateInput) {
  let userId: string | undefined;
  let idempotencyKey: string | undefined;
  try {
    const user = await requireRole(["ADMIN", "MANAGER"]);
    userId = user.id;
    idempotencyKey = data.idempotencyKey;

    if (
      typeof idempotencyKey !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        idempotencyKey
      )
    ) {
      return { success: false, error: "معرّف عملية الشراء غير صالح" };
    }

    const existingPurchase = await findPurchaseByIdempotencyKey(
      idempotencyKey,
      user.id
    );
    if (existingPurchase) {
      return { success: true, data: existingPurchase };
    }

    const validated = validatePurchaseInput(data);

    const supplier = await prisma.supplier.findUnique({
      where: { id: data.supplierId.trim() },
    });
    if (!supplier || !supplier.isActive) {
      return { success: false, error: "المورد غير موجود" };
    }

    const invoiceNumber = await generateInvoiceNumberSafe("PUR");
    const now = new Date();

    let purchase;
    try {
      purchase = await prisma.$transaction(
        async (tx) => {
          const variantIds = validated.items.map((item) => item.variantId);
          const foundVariants = await tx.productVariant.findMany({
            where: {
              id: { in: variantIds },
              isActive: true,
              product: { isActive: true },
            },
            select: { id: true },
          });
          if (foundVariants.length !== variantIds.length) {
            throw new Error("أحد المنتجات غير موجود أو مؤرشف");
          }

          const created = await tx.purchase.create({
            data: {
              invoiceNumber,
              idempotencyKey,
              supplierId: data.supplierId.trim(),
              userId: user.id,
              subtotal: validated.subtotal,
              taxAmount: validated.taxAmount,
              totalAmount: validated.totalAmount,
              status: "RECEIVED",
              receivedAt: now,
              notes: data.notes,
              items: {
                create: validated.items.map((item) => ({
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
        },
        { maxWait: 15000, timeout: 30000 }
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const duplicatePurchase = await findPurchaseByIdempotencyKey(
          idempotencyKey,
          user.id
        );
        if (duplicatePurchase) {
          return { success: true, data: duplicatePurchase };
        }
      }
      throw error;
    }

    revalidatePurchasePaths();
    return { success: true, data: purchase };
  } catch (error) {
    if (userId && idempotencyKey) {
      try {
        const existingPurchase = await findPurchaseByIdempotencyKey(
          idempotencyKey,
          userId
        );
        if (existingPurchase) {
          return { success: true, data: existingPurchase };
        }
      } catch (lookupError) {
        console.error("Failed to verify purchase idempotency result", lookupError);
      }
    }
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
      const claimed = await tx.purchase.updateMany({
        where: { id, status: "PENDING" },
        data: {
          status: "RECEIVED",
          receivedAt: new Date(),
        },
      });
      if (claimed.count !== 1) {
        throw new Error("تم تغيير حالة أمر الشراء. أعد تحميل الصفحة");
      }

      await applyPurchaseItemsToInventory(
        tx,
        purchase.items,
        purchase.invoiceNumber,
        user.id
      );

      return tx.purchase.findUniqueOrThrow({
        where: { id },
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
