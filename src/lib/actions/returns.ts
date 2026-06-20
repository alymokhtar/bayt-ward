"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { generateInvoiceNumber } from "@/lib/utils";
import { invalidateReturnsData } from "@/lib/revalidate-tags";
import { getCachedReturnsList } from "@/lib/cached-queries";
import { checkLowStockAndNotify } from "@/lib/actions/inventory";
import { sendTelegramMessage } from "@/lib/telegram";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

export type ReturnItemInput = {
  variantId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
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
}

function buildReturnTelegramMessage(returnRecord: {
  returnNumber: string;
  sale: { invoiceNumber: string };
  refundAmount: number;
  user?: { name: string } | null;
}) {
  const dateTime = new Date().toLocaleString("ar-EG", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return [
    "🔁 مرتجع جديد",
    "",
    `رقم المرتجع: ${returnRecord.returnNumber}`,
    `رقم الفاتورة الأصلية: ${returnRecord.sale.invoiceNumber}`,
    `المبلغ المسترد: ${returnRecord.refundAmount.toLocaleString("ar-EG")} ج.م`,
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

export async function createReturn(data: {
  saleId: string;
  customerId?: string;
  items: ReturnItemInput[];
  totalAmount: number;
  refundAmount: number;
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

    if (data.refundAmount <= 0) {
      return { success: false, error: "مبلغ الاسترداد يجب أن يكون أكبر من صفر" };
    }

    const sale = await prisma.sale.findUnique({
      where: { id: data.saleId },
      include: { items: true },
    });

    if (!sale) {
      return { success: false, error: "فاتورة البيع غير موجودة" };
    }

    if (sale.status !== "COMPLETED" && sale.status !== "REFUNDED") {
      return { success: false, error: "لا يمكن إرجاع منتجات من هذه الفاتورة" };
    }

    const returnRecord = await prisma.$transaction(async (tx) => {
      for (const item of data.items) {
        const saleItem = sale.items.find((si) => si.variantId === item.variantId);
        if (!saleItem) {
          throw new Error("المنتج غير موجود في فاتورة البيع الأصلية");
        }

        const previousReturns = await tx.returnItem.aggregate({
          where: {
            variantId: item.variantId,
            return: { saleId: data.saleId, status: "APPROVED" },
          },
          _sum: { quantity: true },
        });

        const alreadyReturned = previousReturns._sum.quantity ?? 0;
        if (alreadyReturned + item.quantity > saleItem.quantity) {
          throw new Error("كمية الإرجاع تتجاوز الكمية المباعة");
        }

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

      const returnNumber = generateInvoiceNumber("RET");

      const created = await tx.return.create({
        data: {
          returnNumber,
          saleId: data.saleId,
          customerId: data.customerId ?? sale.customerId,
          userId: user.id,
          totalAmount: data.totalAmount,
          refundAmount: data.refundAmount,
          reason: data.reason,
          notes: data.notes,
          status: "APPROVED",
          items: {
            create: data.items.map((item) => ({
              variantId: item.variantId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
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

      const totalReturned = await tx.return.aggregate({
        where: { saleId: data.saleId, status: "APPROVED" },
        _sum: { refundAmount: true },
      });

      if ((totalReturned._sum.refundAmount ?? 0) >= sale.totalAmount) {
        await tx.sale.update({
          where: { id: data.saleId },
          data: { status: "REFUNDED" },
        });
      }

      const customerId = data.customerId ?? sale.customerId;
      if (customerId) {
        await tx.customer.update({
          where: { id: customerId },
          data: {
            totalSpent: { decrement: data.refundAmount },
          },
        });
      }

      return created;
    });

    revalidateReturnPaths();
    void checkLowStockAndNotify(data.items.map((item) => item.variantId));
    void sendTelegramMessage(buildReturnTelegramMessage(returnRecord));
    return { success: true, data: returnRecord };
  } catch (error) {
    return handleActionError(error);
  }
}
