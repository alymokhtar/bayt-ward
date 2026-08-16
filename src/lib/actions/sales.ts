"use server";

import { updateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { generateInvoiceNumberSafe } from "@/lib/invoice-generator";
import { formatCurrency, formatDateTime, getPaymentMethodLabel } from "@/lib/utils";
import { getCachedSalesPage } from "@/lib/cached-queries";
import { getCashRegisterReview as fetchCashRegisterReview } from "@/lib/cash-register";
import { invalidateSalesData, revalidateInventoryCache } from "@/lib/revalidate-tags";
import { sendTelegramMessage } from "@/lib/telegram";
import { checkLowStockAndNotify } from "@/lib/actions/inventory";
import { normalizeSalePayments } from "@/lib/sales-payment-utils";
import type { PaymentMethod } from "@prisma/client";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

export type SaleItemInput = {
  variantId: string;
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
  totalPrice: number;
};

export type SalePaymentInput = {
  amount: number;
  method: PaymentMethod;
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

function revalidateSalePaths() {
  invalidateSalesData();
  revalidateInventoryCache();
}

function formatSaleTelegramMessage(sale: {
  invoiceNumber: string;
  totalAmount: number;
  customer?: { name: string | null } | null;
  user?: { name: string } | null;
  items: { quantity: number }[];
}) {
  const totalQuantity = sale.items.reduce((sum, item) => sum + item.quantity, 0);
  const dateTime = formatDateTime(new Date());

  return [
    "🛒 عملية بيع جديدة",
    "",
    `رقم الفاتورة: ${sale.invoiceNumber}`,
    `اسم العميل: ${sale.customer?.name || "عميل نقدي"}`,
    `عدد المنتجات: ${totalQuantity}`,
    `إجمالي الفاتورة: ${formatCurrency(sale.totalAmount)}`,
    `اسم المستخدم: ${sale.user?.name || "—"}`,
    `التاريخ والوقت: ${dateTime}`,
  ].join("\n");
}

export async function sendVaultReconciliationTelegram(data: {
  paymentBreakdown: Array<{
    method: PaymentMethod;
    net: number;
  }>;
  from: string;
  to: string;
}) {
  const user = await requireAuth();
  const lines = data.paymentBreakdown.map((item) =>
    `- ${getPaymentMethodLabel(item.method)}: ${formatCurrency(item.net)}`
  );

  const message = [
    "✅ تم مراجعة الخزنة والرصيد متطابق.",
    "",
    `الفترة: ${data.from} — ${data.to}`,
    "",
    "تفاصيل الأرصدة:",
    ...lines,
    "",
    `👤 تمت المراجعة بواسطة: ${user.name}`,
  ].join("\n");

  await sendTelegramMessage(message);
}

export async function getSales(options?: {
  search?: string;
  status?: string;
  from?: string;
  to?: string;
  limit?: number;
  page?: number;
  pageSize?: number;
}) {
  await requireAuth();

  const { page, pageSize, limit, from, to, ...rest } = options ?? {};
  return getCachedSalesPage(
    JSON.stringify({
      ...rest,
      from,
      to,
      page,
      pageSize: pageSize ?? limit ?? 50,
    })
  );
}

export async function getCashRegisterReview(from?: string, to?: string) {
  await requireAuth();
  return fetchCashRegisterReview(from, to);
}

export async function getSale(id: string) {
  await requireAuth();

  const sale = await prisma.sale.findUnique({
    where: { id },
    include: {
      payments: {
        select: {
          method: true,
          amount: true,
        },
      },
      customer: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
      user: { select: { id: true, name: true } },
      items: {
        select: {
          id: true,
          variantId: true,
          quantity: true,
          unitPrice: true,
          discountAmount: true,
          totalPrice: true,
          variant: {
            select: {
              id: true,
              size: true,
              color: true,
              product: { select: { name: true, nameAr: true } },
            },
          },
        },
      },
      returns: {
        select: {
          id: true,
          returnNumber: true,
          totalAmount: true,
          refundAmount: true,
          status: true,
          reason: true,
          notes: true,
          createdAt: true,
          items: {
            select: {
              id: true,
              quantity: true,
              unitPrice: true,
              totalPrice: true,
              variant: {
                select: {
                  id: true,
                  size: true,
                  color: true,
                  product: { select: { name: true, nameAr: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!sale) {
    throw new Error("الفاتورة غير موجودة");
  }

  return sale;
}

export async function createSale(data: {
  customerId?: string;
  items: SaleItemInput[];
  subtotal: number;
  discountAmount?: number;
  discountPercent?: number;
  taxAmount?: number;
  totalAmount: number;
  paidAmount: number;
  tenderedAmount?: number;
  changeAmount?: number;
  paymentMethod?: PaymentMethod;
  payments?: SalePaymentInput[];
  notes?: string;
}) {
  try {
    const user = await requireAuth();

    if (!data.items?.length) {
      return { success: false, error: "يجب إضافة منتج واحد على الأقل" };
    }

    if (data.totalAmount <= 0) {
      return { success: false, error: "إجمالي الفاتورة يجب أن يكون أكبر من صفر" };
    }

    const { normalizedPayments, effectivePaidAmount } = normalizeSalePayments({
      payments: data.payments,
      paidAmount: data.paidAmount,
      totalAmount: data.totalAmount,
      paymentMethod: data.paymentMethod,
    });

    const salePaymentMethod =
      normalizedPayments.length > 1
        ? "MIXED"
        : normalizedPayments[0]?.method ?? (data.paymentMethod ?? "CASH");

    const paymentTotal = normalizedPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const rawTenderedTotal = (data.payments ?? []).reduce(
      (sum, payment) => sum + Number(payment.amount ?? 0),
      0
    );
    const actualPaidAmount = effectivePaidAmount;
    const tenderedAmount = data.tenderedAmount !== undefined
      ? data.tenderedAmount
      : (data.payments?.length ? rawTenderedTotal : data.paidAmount);
    const resolvedChangeAmount = data.tenderedAmount !== undefined
      ? Math.max(0, data.tenderedAmount - data.totalAmount)
      : (data.changeAmount ?? Math.max(0, tenderedAmount - data.totalAmount));

    if (normalizedPayments.length > 1) {
      if (Math.abs(paymentTotal - data.totalAmount) > 0.01) {
        return { success: false, error: "مجموع المدفوعات المختلطة يجب أن يساوي الإجمالي" };
      }
    } else if (data.paidAmount < data.totalAmount) {
      return { success: false, error: "المبلغ المدفوع أقل من الإجمالي" };
    }

    if (data.customerId) {
      const customer = await prisma.customer.findUnique({
        where: { id: data.customerId },
      });
      if (!customer) {
        return { success: false, error: "العميل غير موجود" };
      }
    }

    const sale = await prisma.$transaction(async (tx) => {
      const variantIds = [...new Set(data.items.map((item) => item.variantId))];
      const variants = await tx.productVariant.findMany({
        where: { id: { in: variantIds } },
        select: {
          id: true,
          isActive: true,
          stockQuantity: true,
          size: true,
          color: true,
          product: {
            select: { name: true, nameAr: true, isActive: true },
          },
        },
      });
      const variantMap = new Map(variants.map((v) => [v.id, v]));

      for (const item of data.items) {
        const variant = variantMap.get(item.variantId);

        if (!variant || !variant.isActive || !variant.product.isActive) {
          throw new Error("أحد المنتجات غير موجود أو غير نشط");
        }

        if (variant.stockQuantity < item.quantity) {
          throw new Error(
            `الكمية غير كافية للمنتج ${variant.product.nameAr || variant.product.name} (${variant.size} - ${variant.color})`
          );
        }
      }

      const invoiceNumber = await generateInvoiceNumberSafe("INV");

      const createdSale = await tx.sale.create({
        data: {
          invoiceNumber,
          customerId: data.customerId,
          userId: user.id,
          subtotal: data.subtotal,
          discountAmount: data.discountAmount ?? 0,
          discountPercent: data.discountPercent ?? 0,
          taxAmount: data.taxAmount ?? 0,
          totalAmount: data.totalAmount,
          tenderedAmount,
          paidAmount: actualPaidAmount,
          changeAmount: resolvedChangeAmount,
          paymentMethod: salePaymentMethod,
          status: "COMPLETED",
          notes: data.notes,
          items: {
            create: data.items.map((item) => ({
              variantId: item.variantId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discountAmount: item.discountAmount ?? 0,
              totalPrice: item.totalPrice,
            })),
          },
          payments: {
            create: normalizedPayments.map((payment) => ({
              amount: payment.amount,
              method: payment.method,
            })),
          },
        },
        select: {
          id: true,
          invoiceNumber: true,
          totalAmount: true,
          items: {
            select: {
              id: true,
              quantity: true,
              unitPrice: true,
              totalPrice: true,
              variant: {
                select: {
                  sku: true,
                  size: true,
                  color: true,
                  product: { select: { name: true, nameAr: true } },
                },
              },
            },
          },
          customer: {
            select: { id: true, name: true, phone: true },
          },
          user: { select: { id: true, name: true } },
        },
      });

      for (const item of data.items) {
        const variant = variantMap.get(item.variantId);

        if (!variant) continue;

        const previousQty = variant.stockQuantity;
        const newQty = previousQty - item.quantity;
        variant.stockQuantity = newQty;

        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stockQuantity: newQty },
        });

        await tx.stockMovement.create({
          data: {
            variantId: item.variantId,
            userId: user.id,
            type: "SALE",
            quantity: -item.quantity,
            previousQty,
            newQty,
            reference: invoiceNumber,
            notes: "بيع من نقطة البيع",
          },
        });
      }

      if (data.customerId) {
        await tx.customer.update({
          where: { id: data.customerId },
          data: {
            totalSpent: { increment: data.totalAmount },
            visitCount: { increment: 1 },
          },
        });
      }

      return createdSale;
    });

    revalidateSalePaths();
    // Immediate cache invalidation for stock & storefront products
    sale.items.forEach((item) => {
      updateTag('products-list');
    });

    void checkLowStockAndNotify(data.items.map((item) => item.variantId));
    void sendTelegramMessage(formatSaleTelegramMessage(sale));
    return { success: true, data: sale };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function cancelSale(id: string, reason?: string) {
  try {
    const user = await requireAuth();

    const sale = await prisma.sale.findUnique({
      where: { id },
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        totalAmount: true,
        customerId: true,
        notes: true,
        items: {
          select: {
            variantId: true,
            quantity: true,
          },
        },
      },
    });

    if (!sale) {
      return { success: false, error: "الفاتورة غير موجودة" };
    }

    if (sale.status === "CANCELLED") {
      return { success: false, error: "الفاتورة ملغاة بالفعل" };
    }

    if (sale.status !== "COMPLETED" && sale.status !== "PARTIALLY_REFUNDED") {
      return { success: false, error: "لا يمكن إلغاء هذه الفاتورة" };
    }

    const cancelled = await prisma.$transaction(async (tx) => {
      for (const item of sale.items) {
        const variant = await tx.productVariant.findUnique({
          where: { id: item.variantId },
        });

        if (!variant) continue;

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
            type: "ADJUSTMENT",
            quantity: item.quantity,
            previousQty,
            newQty,
            reference: sale.invoiceNumber,
            notes: reason || "إلغاء فاتورة بيع",
          },
        });
      }

      if (sale.customerId) {
        await tx.customer.update({
          where: { id: sale.customerId },
          data: {
            totalSpent: { decrement: sale.totalAmount },
            visitCount: { decrement: 1 },
          },
        });
      }

      return tx.sale.update({
        where: { id },
        data: {
          status: "CANCELLED",
          notes: reason
            ? `${sale.notes ? sale.notes + " | " : ""}سبب الإلغاء: ${reason}`
            : sale.notes,
        },
        include: {
          items: true,
          customer: true,
          user: { select: { id: true, name: true } },
        },
      });
    });

    revalidateSalePaths();
    // Immediate cache invalidation for stock & storefront products
    cancelled.items.forEach(() => {
      updateTag('products-list');
    });

    void sendTelegramMessage(
      [
        "🔁 إلغاء عملية بيع",
        "",
        `رقم الفاتورة: ${cancelled.invoiceNumber}`,
        `الإجمالي: ${formatCurrency(cancelled.totalAmount)}`,
        `اسم المستخدم: ${cancelled.user.name}`,
        `التاريخ والوقت: ${formatDateTime(new Date())}`,
      ].join("\n")
    );

    return { success: true, data: cancelled };
  } catch (error) {
    return handleActionError(error);
  }
}
