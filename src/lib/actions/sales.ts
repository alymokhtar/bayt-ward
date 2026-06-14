"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { generateInvoiceNumber } from "@/lib/utils";
import { getCachedSalesPage } from "@/lib/cached-queries";
import { invalidateSalesData } from "@/lib/revalidate-tags";
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
}

export async function getSales(options?: {
  search?: string;
  status?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  page?: number;
  pageSize?: number;
}) {
  await requireAuth();

  const { page, pageSize, limit, from, to, ...rest } = options ?? {};
  return getCachedSalesPage(
    JSON.stringify({
      ...rest,
      from: from?.toISOString(),
      to: to?.toISOString(),
      page,
      pageSize: pageSize ?? limit ?? 50,
    })
  );
}

export async function getSale(id: string) {
  await requireAuth();

  const sale = await prisma.sale.findUnique({
    where: { id },
    select: {
      id: true,
      invoiceNumber: true,
      customerId: true,
      subtotal: true,
      discountAmount: true,
      discountPercent: true,
      taxAmount: true,
      totalAmount: true,
      paidAmount: true,
      changeAmount: true,
      paymentMethod: true,
      status: true,
      notes: true,
      createdAt: true,
      customer: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          address: true,
        },
      },
      user: { select: { id: true, name: true, email: true } },
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
              size: true,
              color: true,
              product: { select: { id: true, name: true, nameAr: true } },
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
          createdAt: true,
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
  changeAmount?: number;
  paymentMethod?: PaymentMethod;
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

    if (data.paidAmount < data.totalAmount) {
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

      const invoiceNumber = generateInvoiceNumber("INV");

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
          paidAmount: data.paidAmount,
          changeAmount: data.changeAmount ?? data.paidAmount - data.totalAmount,
          paymentMethod: data.paymentMethod ?? "CASH",
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

    if (sale.status !== "COMPLETED") {
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
    return { success: true, data: cancelled };
  } catch (error) {
    return handleActionError(error);
  }
}
