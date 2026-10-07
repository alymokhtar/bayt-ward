"use server";

import { updateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { generateInvoiceNumberSafe } from "@/lib/invoice-generator";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { invalidateReturnsData, revalidateInventoryCache } from "@/lib/revalidate-tags";
import { getCachedReturnsList } from "@/lib/cached-queries";
import { checkLowStockAndNotify } from "@/lib/actions/inventory";
import { sendTelegramMessage } from "@/lib/telegram";
import { calculateReturnRefundAmount } from "@/lib/return-pricing";
import { Prisma } from "@prisma/client";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

export type ReturnItemInput = {
  variantId: string;
  quantity: number;
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

function revalidateReturnPaths() {
  invalidateReturnsData();
  revalidateInventoryCache();
}

function buildReturnTelegramMessage(returnRecord: {
  returnNumber: string;
  sale: { invoiceNumber: string };
  refundAmount: number;
  user?: { name: string } | null;
}) {
  const dateTime = formatDateTime(new Date());

  return [
    "🔁 مرتجع جديد",
    "",
    `رقم المرتجع: ${returnRecord.returnNumber}`,
    `رقم الفاتورة الأصلية: ${returnRecord.sale.invoiceNumber}`,
    `المبلغ المسترد: ${formatCurrency(returnRecord.refundAmount)}`,
    `اسم المستخدم: ${returnRecord.user?.name || "—"}`,
    `التاريخ والوقت: ${dateTime}`,
  ].join("\n");
}

export async function getReturns(options?: {
  saleId?: string;
  customerId?: string;
  limit?: number;
}) {
  await requireRole(["ADMIN", "MANAGER", "CASHIER"]);
  return getCachedReturnsList(JSON.stringify(options ?? {}));
}

export async function getReturn(id: string) {
  await requireRole(["ADMIN", "MANAGER", "CASHIER"]);

  const returnRecord = await prisma.return.findUnique({
    where: { id },
    include: {
      sale: {
        select: { id: true, invoiceNumber: true, totalAmount: true },
      },
      customer: { select: { id: true, name: true, phone: true } },
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

  if (!returnRecord) {
    throw new Error("المرتجع غير موجود");
  }

  return returnRecord;
}

export async function createReturn(data: {
  saleId: string;
  items: ReturnItemInput[];
  refundMethod: "CASH" | "CARD" | "INSTAPAY" | "WALLET";
  reason?: string;
  notes?: string;
}) {
  try {
    const user = await requireRole(["ADMIN", "MANAGER", "CASHIER"]);

    if (!data.saleId) {
      return { success: false, error: "فاتورة البيع مطلوبة" };
    }

    if (!data.items?.length) {
      return { success: false, error: "يجب إضافة منتج واحد على الأقل" };
    }

    if (!["CASH", "CARD", "INSTAPAY", "WALLET"].includes(data.refundMethod)) {
      return { success: false, error: "يجب اختيار وسيلة صحيحة لاسترداد المبلغ" };
    }

    if (data.items.some((item) =>
      !item.variantId || !Number.isInteger(item.quantity) || item.quantity <= 0
    )) {
      return { success: false, error: "عناصر المرتجع أو كمياتها غير صالحة" };
    }

    if (new Set(data.items.map((item) => item.variantId)).size !== data.items.length) {
      return { success: false, error: "يوجد منتج مكرر في المرتجع" };
    }

    const sale = await prisma.sale.findUnique({
      where: { id: data.saleId },
      include: { items: true },
    });

    if (!sale) {
      return { success: false, error: "فاتورة البيع غير موجودة" };
    }

    if (sale.status !== "COMPLETED" && sale.status !== "REFUNDED" && sale.status !== "PARTIALLY_REFUNDED") {
      return { success: false, error: "لا يمكن إرجاع منتجات من هذه الفاتورة" };
    }

    const returnRecord = await prisma.$transaction(async (tx) => {
      const saleItemsByVariant = new Map(sale.items.map((item) => [item.variantId, item]));
      const previousReturnItems = await tx.returnItem.findMany({
        where: {
          variantId: { in: data.items.map((item) => item.variantId) },
          return: { saleId: data.saleId, status: "APPROVED" },
        },
        select: {
          variantId: true,
          quantity: true,
          totalPrice: true,
        },
      });
      const previousReturnsByVariant = new Map<
        string,
        { quantity: number; refundAmount: number }
      >();

      for (const returnedItem of previousReturnItems) {
        const totals = previousReturnsByVariant.get(returnedItem.variantId) ?? {
          quantity: 0,
          refundAmount: 0,
        };
        totals.quantity += returnedItem.quantity;
        totals.refundAmount += returnedItem.totalPrice;
        previousReturnsByVariant.set(returnedItem.variantId, totals);
      }

      const pricedItems = data.items.map((item) => {
        const saleItem = saleItemsByVariant.get(item.variantId);
        if (!saleItem) {
          throw new Error("المنتج غير موجود في فاتورة البيع الأصلية");
        }

        const previousReturn = previousReturnsByVariant.get(item.variantId);
        const calculation = calculateReturnRefundAmount(
          saleItem,
          item.quantity,
          previousReturn?.quantity ?? 0,
          previousReturn?.refundAmount ?? 0,
        );

        return {
          ...item,
          saleItem,
          unitPrice: calculation.netUnitPrice,
          totalPrice: calculation.refundAmount,
        };
      });
      const refundAmount = pricedItems.reduce((sum, item) => sum + item.totalPrice, 0);
      if (refundAmount <= 0) {
        throw new Error("مبلغ الاسترداد يجب أن يكون أكبر من صفر");
      }

      for (const item of pricedItems) {
        const variant = await tx.productVariant.findUnique({
          where: { id: item.variantId },
        });

        if (!variant) {
          throw new Error("المنتج غير موجود");
        }

        const previousQty = variant.stockQuantity;
        const newQty = previousQty + item.quantity;

        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stockQuantity: newQty },
        });

        await tx.stockMovement.create({
          data: {
            variantId: item.variantId,
            userId: user.id,
            type: "RETURN",
            quantity: item.quantity,
            previousQty,
            newQty,
            reference: sale.invoiceNumber,
            notes: data.reason || "مرتجع من العميل",
          },
        });
      }

      const returnNumber = await generateInvoiceNumberSafe("RET");

      const created = await tx.return.create({
        data: {
          returnNumber,
          saleId: data.saleId,
          customerId: sale.customerId,
          userId: user.id,
          totalAmount: refundAmount,
          refundAmount,
          refundMethod: data.refundMethod,
          reason: data.reason,
          notes: data.notes,
          status: "APPROVED",
          items: {
            create: pricedItems.map((item) => ({
              variantId: item.variantId,
              quantity: item.quantity,
              saleItemId: item.saleItem.id,
              unitPrice: item.unitPrice,
              costPrice: item.saleItem.costPrice,
              totalPrice: item.totalPrice,
            })),
          },
        },
        include: {
          items: {
            include: {
              variant: {
                include: { product: true },
              },
            },
          },
          sale: true,
          customer: true,
          user: { select: { id: true, name: true } },
        },
      });

      const returnedQuantity = await tx.returnItem.aggregate({
        where: { return: { saleId: data.saleId, status: "APPROVED" } },
        _sum: { quantity: true },
      });
      const totalSoldQuantity = sale.items.reduce((sum, item) => sum + item.quantity, 0);
      const returnedQuantityTotal = returnedQuantity._sum.quantity ?? 0;

      if (returnedQuantityTotal >= totalSoldQuantity) {
        await tx.sale.update({
          where: { id: data.saleId },
          data: { status: "REFUNDED" },
        });
      } else if (returnedQuantityTotal > 0) {
        await tx.sale.update({
          where: { id: data.saleId },
          data: { status: "PARTIALLY_REFUNDED" },
        });
      }

      if (sale.customerId) {
        await tx.customer.update({
          where: { id: sale.customerId },
          data: {
            totalSpent: { decrement: refundAmount },
          },
        });
      }

      return created;
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 10000,
      timeout: 30000,
    });

    revalidateReturnPaths();
    // Immediate cache invalidation for stock & storefront products
    returnRecord.items.forEach(() => {
      updateTag('products-list');
    });
    
    void checkLowStockAndNotify(data.items.map((item) => item.variantId));
    void sendTelegramMessage(buildReturnTelegramMessage(returnRecord));
    return { success: true, data: returnRecord };
  } catch (error) {
    return handleActionError(error);
  }
}
