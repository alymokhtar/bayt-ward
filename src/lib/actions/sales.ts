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
import { calculateCartDiscounts, calculateCouponDiscount } from "@/lib/promotions";
import { getActivePromotionsData } from "@/lib/promotions-data";
import { allocateInvoiceDiscount } from "@/lib/sale-pricing";
import {
  calculateLoyaltyPointsEarned,
  LOYALTY_MIN_REDEMPTION_POINTS,
  LOYALTY_POINT_VALUE,
} from "@/lib/loyalty-utils";
import { PaymentMethod, Prisma, SaleStatus, SalesChannel } from "@prisma/client";
import { getBusinessDayBoundsFromDateKeys } from "@/lib/business-day";
import {
  buildSalesChannelAnalytics,
  getSalesChannelWhere,
  subtractChannelReturns,
  type SalesChannelFilter,
} from "@/lib/sales-analytics";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

export type SaleItemInput = {
  variantId: string;
  quantity: number;
};

export type SalePaymentInput = {
  amount: number;
  method: PaymentMethod;
};

const saleResponseSelect = {
  id: true,
  invoiceNumber: true,
  channel: true,
  subtotal: true,
  discountAmount: true,
  discountReason: true,
  totalAmount: true,
  paidAmount: true,
  tenderedAmount: true,
  changeAmount: true,
  paymentMethod: true,
  notes: true,
  appliedPromotions: true,
  loyaltyPointsEarned: true,
  loyaltyPointsRedeemed: true,
  loyaltyDiscountAmount: true,
  createdAt: true,
  payments: { select: { method: true, amount: true } },
  items: {
    select: {
      id: true,
      quantity: true,
      unitPrice: true,
      discountAmount: true,
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
  customer: { select: { id: true, name: true, phone: true, loyaltyPoints: true } },
  user: { select: { id: true, name: true } },
} satisfies Prisma.SaleSelect;

function findSaleByIdempotencyKey(idempotencyKey: string, userId: string) {
  return prisma.sale.findFirst({
    where: { idempotencyKey, userId },
    select: saleResponseSelect,
  });
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

function revalidateSalePaths() {
  invalidateSalesData();
  revalidateInventoryCache();
}

function escapeSaleHtml(value: string | number) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatSaleTelegramMessage(sale: {
  invoiceNumber: string;
  totalAmount: number;
  channel: SalesChannel;
  customer?: { name: string | null } | null;
  user?: { name: string } | null;
  payments: Array<{ method: PaymentMethod; amount: number }>;
  items: {
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    variant: {
      size: string;
      color: string;
      product: { name: string; nameAr: string | null };
    };
  }[];
}) {
  const totalQuantity = sale.items.reduce((sum, item) => sum + item.quantity, 0);
  const dateTime = formatDateTime(new Date());
  const itemLines = sale.items.map((item) => {
    const name = item.variant.product.nameAr || item.variant.product.name;
    const variant = [item.variant.size, item.variant.color]
      .filter(Boolean)
      .map(escapeSaleHtml)
      .join(" / ");
    return [
      `• <b>${escapeSaleHtml(name)}</b>${variant ? ` (${variant})` : ""}`,
      `  ${escapeSaleHtml(item.quantity)} × ${escapeSaleHtml(formatCurrency(item.unitPrice))} = ${escapeSaleHtml(formatCurrency(item.totalPrice))}`,
    ].join("\n");
  });
  const paymentLines = sale.payments.map(
    (payment) =>
      `• ${escapeSaleHtml(getPaymentMethodLabel(payment.method))}: ${escapeSaleHtml(formatCurrency(payment.amount))}`,
  );

  return [
    "🛒 <b>عملية بيع جديدة</b>",
    "",
    `<b>رقم الفاتورة:</b> ${escapeSaleHtml(sale.invoiceNumber)}`,
    `<b>العميل:</b> ${escapeSaleHtml(sale.customer?.name || "عميل نقدي")}`,
    `<b>قناة البيع:</b> ${escapeSaleHtml(sale.channel === SalesChannel.ONLINE ? "المتجر الإلكتروني" : "نقطة البيع")}`,
    `<b>الكاشير:</b> ${escapeSaleHtml(sale.user?.name || "—")}`,
    `<b>عدد القطع:</b> ${escapeSaleHtml(totalQuantity)}`,
    "",
    "<b>الأصناف:</b>",
    ...itemLines,
    "",
    "<b>طريقة الدفع:</b>",
    ...(paymentLines.length > 0 ? paymentLines : ["—"]),
    "",
    `<b>صافي الفاتورة:</b> ${escapeSaleHtml(formatCurrency(sale.totalAmount))}`,
    `<b>التاريخ والوقت:</b> ${escapeSaleHtml(dateTime)}`,
  ].join("\n");
}

export async function sendVaultReconciliationTelegram(data: {
  paymentBreakdown: Array<{
    method: string;
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
  channel?: SalesChannelFilter;
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

export async function getSalesChannelAnalytics(from?: string, to?: string) {
  await requireAuth();

  const dateRange = from || to
    ? getBusinessDayBoundsFromDateKeys(from, to)
    : null;
  const where: Prisma.SaleWhereInput = {
    status: {
      in: [SaleStatus.COMPLETED, SaleStatus.PARTIALLY_REFUNDED, SaleStatus.REFUNDED],
    },
    ...(dateRange
      ? { createdAt: { gte: dateRange.start, lt: dateRange.end } }
      : {}),
  };

  const [groups, returnGroups] = await Promise.all([
    prisma.sale.groupBy({
      by: ["channel"],
      where,
      _sum: { totalAmount: true },
      _count: { _all: true },
    }),
    prisma.$queryRaw<Array<{ channel: SalesChannel; refundAmount: number }>>`
      SELECT s.channel::text AS channel,
        COALESCE(SUM(r."refundAmount"), 0)::float AS "refundAmount"
      FROM "Return" r
      INNER JOIN "Sale" s ON s.id = r."saleId"
      WHERE r.status = 'APPROVED'
        ${dateRange
          ? Prisma.sql`AND r."createdAt" >= ${dateRange.start} AND r."createdAt" < ${dateRange.end}`
          : Prisma.empty}
      GROUP BY s.channel
    `,
  ]);
  const netRevenueGroups = subtractChannelReturns(groups.map((group) => ({
    channel: group.channel,
    revenue: group._sum.totalAmount,
    orders: group._count._all,
  })), returnGroups.map((group) => ({
    channel: group.channel,
    refundAmount: group.refundAmount,
  })));

  return buildSalesChannelAnalytics(netRevenueGroups);
}

export async function getSalesExport(options?: {
  search?: string;
  status?: string;
  channel?: SalesChannelFilter;
  from?: string;
  to?: string;
}) {
  await requireAuth();

  const filters = options ?? {};
  const where: Prisma.SaleWhereInput = getSalesChannelWhere(
    filters.channel === SalesChannel.POS || filters.channel === SalesChannel.ONLINE
      ? filters.channel
      : "ALL",
  );
  if (filters.status && Object.values(SaleStatus).includes(filters.status as SaleStatus)) {
    where.status = filters.status as SaleStatus;
  }
  if (filters.from || filters.to) {
    const { start, end } = getBusinessDayBoundsFromDateKeys(filters.from, filters.to);
    where.createdAt = { gte: start, lt: end };
  }
  if (filters.search?.trim()) {
    const search = filters.search.trim();
    where.OR = [
      { invoiceNumber: { contains: search, mode: "insensitive" } },
      { customer: { is: { name: { contains: search, mode: "insensitive" } } } },
      { customer: { is: { phone: { contains: search, mode: "insensitive" } } } },
    ];
  }

  return prisma.sale.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      invoiceNumber: true,
      channel: true,
      totalAmount: true,
      status: true,
      paymentMethod: true,
      createdAt: true,
      customer: { select: { name: true } },
    },
  });
}

export async function getCashRegisterReview(from?: string, to?: string) {
  await requireAuth();
  return fetchCashRegisterReview(from, to);
}

export async function getSale(id: string) {
  await requireAuth();

  const sale = await prisma.sale.findUnique({
    where: { id },
    select: {
      id: true,
      invoiceNumber: true,
      idempotencyKey: true,
      channel: true,
      customerId: true,
      userId: true,
      subtotal: true,
      discountAmount: true,
      discountPercent: true,
      discountReason: true,
      appliedPromotions: true,
      couponId: true,
      couponCode: true,
      loyaltyPointsEarned: true,
      loyaltyPointsRedeemed: true,
      loyaltyDiscountAmount: true,
      taxAmount: true,
      totalAmount: true,
      tenderedAmount: true,
      paidAmount: true,
      changeAmount: true,
      paymentMethod: true,
      status: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
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
          reason: true,
          notes: true,
          createdAt: true,
          items: {
            select: {
              id: true,
              saleItemId: true,
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
      exchangesAsOriginal: {
        select: {
          id: true,
          exchangeNumber: true,
          settlementBalance: true,
          settlements: {
            select: {
              direction: true,
              amount: true,
              method: true,
            },
          },
          return: {
            select: {
              items: {
                select: {
                  id: true,
                  quantity: true,
                  unitPrice: true,
                  totalPrice: true,
                  variant: {
                    select: {
                      size: true,
                      color: true,
                      product: { select: { name: true, nameAr: true } },
                    },
                  },
                },
              },
            },
          },
          replacementSale: {
            select: {
              id: true,
              invoiceNumber: true,
              items: {
                select: {
                  id: true,
                  quantity: true,
                  unitPrice: true,
                  totalPrice: true,
                  variant: {
                    select: {
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
        orderBy: { createdAt: "desc" },
      },
      exchangeAsReplacement: {
        select: {
          id: true,
          exchangeNumber: true,
          settlementBalance: true,
          settlements: {
            select: {
              direction: true,
              amount: true,
              method: true,
            },
          },
          return: {
            select: {
              items: {
                select: {
                  id: true,
                  quantity: true,
                  unitPrice: true,
                  totalPrice: true,
                  variant: {
                    select: {
                      size: true,
                      color: true,
                      product: { select: { name: true, nameAr: true } },
                    },
                  },
                },
              },
            },
          },
          originalSale: { select: { id: true, invoiceNumber: true } },
          replacementSale: {
            select: {
              items: {
                select: {
                  id: true,
                  quantity: true,
                  unitPrice: true,
                  totalPrice: true,
                  variant: {
                    select: {
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
      },
    },
  });

  if (!sale) {
    throw new Error("الفاتورة غير موجودة");
  }

  return sale;
}

export async function createSale(data: {
  idempotencyKey: string;
  channel?: SalesChannel;
  customerId?: string;
  items: SaleItemInput[];
  subtotal: number;
  discountAmount?: number;
  manualDiscountAmount?: number;
  discountPercent?: number;
  discountReason?: string;
  couponCode?: string;
  totalAmount: number;
  paidAmount: number;
  paymentMethod?: PaymentMethod;
  payments?: SalePaymentInput[];
  notes?: string;
  loyaltyPointsToRedeem?: number;
}) {
  let userId: string | undefined;
  let idempotencyKey: string | undefined;
  try {
    const user = await requireAuth();
    userId = user.id;
    idempotencyKey = data.idempotencyKey;

    if (
      typeof idempotencyKey !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        idempotencyKey,
      )
    ) {
      return { success: false, error: "معرّف عملية البيع غير صالح" };
    }

    const existingSale = await findSaleByIdempotencyKey(idempotencyKey, user.id);
    if (existingSale) {
      return { success: true, data: existingSale };
    }

    const channel = data.channel ?? SalesChannel.POS;
    if (!Object.values(SalesChannel).includes(channel)) {
      return { success: false, error: "قناة البيع غير صالحة" };
    }

    if (!data.items?.length) {
      return { success: false, error: "يجب إضافة منتج واحد على الأقل" };
    }

    if (data.items.some((item) =>
      !item.variantId || !Number.isInteger(item.quantity) || item.quantity < 1
    )) {
      return { success: false, error: "عناصر السلة أو كمياتها غير صالحة" };
    }

    if (new Set(data.items.map((item) => item.variantId)).size !== data.items.length) {
      return { success: false, error: "يوجد منتج مكرر في السلة" };
    }

    const variantIds = data.items.map((item) => item.variantId);
    const variants = await prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      select: {
        id: true,
        isActive: true,
        stockQuantity: true,
        sellingPrice: true,
        size: true,
        color: true,
        productId: true,
        product: {
          select: { id: true, categoryId: true, name: true, nameAr: true, isActive: true },
        },
      },
    });
    const variantMap = new Map(variants.map((variant) => [variant.id, variant]));

    if (variants.length !== variantIds.length) {
      return { success: false, error: "أحد المنتجات غير موجود أو غير نشط" };
    }

    const trustedItems = data.items.map((item) => {
      const variant = variantMap.get(item.variantId);
      if (!variant || !variant.isActive || !variant.product.isActive) {
        throw new Error("أحد المنتجات غير موجود أو غير نشط");
      }
      if (variant.stockQuantity < item.quantity) {
        throw new Error(
          `الكمية غير كافية للمنتج ${variant.product.nameAr || variant.product.name} (${variant.size} - ${variant.color})`,
        );
      }
      return {
        variantId: variant.id,
        productId: variant.product.id,
        categoryId: variant.product.categoryId,
        quantity: item.quantity,
        unitPrice: variant.sellingPrice,
        name: variant.product.nameAr || variant.product.name,
      };
    });
    const grossSubtotal = trustedItems.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    );
    const activePromotions = await getActivePromotionsData();
    const promotionResult = calculateCartDiscounts(
      trustedItems.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        categoryId: item.categoryId,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        name: item.name,
      })),
      activePromotions,
      { channel },
    );
    const submittedCouponCode =
      typeof data.couponCode === "string" ? data.couponCode.trim().toUpperCase() : "";
    if (submittedCouponCode.length > 40) {
      return { success: false, error: "رمز الكوبون غير صالح" };
    }
    const coupon = submittedCouponCode
      ? await prisma.coupon.findUnique({ where: { code: submittedCouponCode } })
      : null;
    let couponDiscountAmount = 0;
    if (submittedCouponCode) {
      if (!coupon || !coupon.isActive) {
        return { success: false, error: "الكوبون غير صالح أو غير مفعل" };
      }
      if (coupon.expiresAt && coupon.expiresAt < new Date()) {
        return { success: false, error: "انتهت صلاحية الكوبون" };
      }
      if (coupon.usageLimit != null && coupon.usageCount >= coupon.usageLimit) {
        return { success: false, error: "تم استنفاد مرات استخدام الكوبون" };
      }
      if (promotionResult.discountAmount > 0 && !coupon.stackable) {
        return { success: false, error: "لا يمكن جمع هذا الكوبون مع العروض التلقائية" };
      }
      couponDiscountAmount = calculateCouponDiscount(coupon, grossSubtotal);
      if (couponDiscountAmount <= 0) {
        return {
          success: false,
          error: coupon.minOrderAmount != null && grossSubtotal < coupon.minOrderAmount
            ? `الحد الأدنى لاستخدام الكوبون هو ${coupon.minOrderAmount}`
            : "تعذر تطبيق الكوبون",
        };
      }
    }
    const submittedManualDiscount = data.manualDiscountAmount ?? data.discountAmount ?? 0;
    const submittedDiscountPercent = data.discountPercent ?? 0;
    const discountReason =
      typeof data.discountReason === "string" ? data.discountReason.trim() : "";

    if (
      !Number.isFinite(submittedManualDiscount) ||
      submittedManualDiscount < 0 ||
      !Number.isFinite(submittedDiscountPercent) ||
      submittedDiscountPercent < 0 ||
      (data.discountReason !== undefined &&
        (typeof data.discountReason !== "string" || discountReason.length > 500))
    ) {
      return { success: false, error: "قيمة الخصم غير صالحة" };
    }

    const maximumDiscountPercent = user.role === "CASHIER" ? 10 : 100;
    if (submittedDiscountPercent > maximumDiscountPercent) {
      return {
        success: false,
        error: `الحد الأقصى لنسبة الخصم هو ${maximumDiscountPercent}%`,
      };
    }

    const manualPercent = submittedDiscountPercent;
    const manualFixed = submittedManualDiscount;
    const manualDiscount = grossSubtotal * manualPercent / 100 + manualFixed;
    const maximumManualDiscount = grossSubtotal * maximumDiscountPercent / 100;
    if (manualDiscount > maximumManualDiscount + 0.005) {
      return {
        success: false,
        error: `إجمالي الخصم اليدوي لا يمكن أن يتجاوز ${maximumDiscountPercent}% من قيمة الأصناف`,
      };
    }
    const loyaltyPointsToRedeem = data.loyaltyPointsToRedeem ?? 0;
    if (
      !Number.isInteger(loyaltyPointsToRedeem) ||
      loyaltyPointsToRedeem < 0 ||
      (loyaltyPointsToRedeem > 0 &&
        loyaltyPointsToRedeem < LOYALTY_MIN_REDEMPTION_POINTS)
    ) {
      return {
        success: false,
        error: `يجب أن يكون عدد نقاط الاستبدال صفراً أو ${LOYALTY_MIN_REDEMPTION_POINTS} نقطة على الأقل`,
      };
    }
    if (loyaltyPointsToRedeem > 0 && !data.customerId) {
      return { success: false, error: "اختر عميلاً لاستبدال نقاط الولاء" };
    }

    const loyaltyDiscountAmount = loyaltyPointsToRedeem * LOYALTY_POINT_VALUE;
    const discountBeforeLoyalty =
      promotionResult.discountAmount + couponDiscountAmount + manualDiscount;
    if (loyaltyDiscountAmount > grossSubtotal - Math.min(grossSubtotal, discountBeforeLoyalty)) {
      return { success: false, error: "قيمة النقاط المستبدلة تتجاوز المبلغ المتبقي من الفاتورة" };
    }
    const requestedDiscount = Math.min(
      grossSubtotal,
      discountBeforeLoyalty + loyaltyDiscountAmount,
    );
    const totalAmountBeforePayment = Math.max(0, grossSubtotal - requestedDiscount);
    const loyaltyPointsEarned = data.customerId
      ? calculateLoyaltyPointsEarned(totalAmountBeforePayment)
      : 0;
    const salePricing = allocateInvoiceDiscount(
      trustedItems.map((item) => ({
        key: item.variantId,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
      })),
      requestedDiscount,
    );
    const { subtotal, discountAmount, totalAmount } = salePricing;
    const saleLinePricing = new Map(salePricing.lines.map((line) => [line.key, line]));

    if (totalAmount <= 0) {
      return { success: false, error: "إجمالي الفاتورة يجب أن يكون أكبر من صفر" };
    }

    if (data.payments !== undefined && (!Array.isArray(data.payments) || data.payments.length === 0)) {
      return { success: false, error: "يجب إدخال وسيلة دفع واحدة على الأقل" };
    }

    const submittedPayments = data.payments ?? [{
      amount: data.paidAmount,
      method: data.paymentMethod ?? PaymentMethod.CASH,
    }];
    if (
      submittedPayments.some(
        (payment) =>
          !payment ||
          !Number.isFinite(payment.amount) ||
          payment.amount <= 0 ||
          payment.method === PaymentMethod.MIXED ||
          !Object.values(PaymentMethod).includes(payment.method),
      )
    ) {
      return { success: false, error: "مبالغ أو وسائل الدفع غير صالحة" };
    }

    const rawTenderedTotal = submittedPayments.reduce(
      (sum, payment) => sum + payment.amount,
      0,
    );
    if (!Number.isFinite(rawTenderedTotal)) {
      return { success: false, error: "إجمالي المدفوعات غير صالح" };
    }

    const { normalizedPayments, effectivePaidAmount } = normalizeSalePayments({
      payments: submittedPayments,
      paidAmount: rawTenderedTotal,
      totalAmount,
      paymentMethod: data.paymentMethod,
    });

    const salePaymentMethod =
      normalizedPayments.length > 1
        ? "MIXED"
        : normalizedPayments[0]?.method ?? (data.paymentMethod ?? "CASH");

    const paymentTotal = normalizedPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const actualPaidAmount = effectivePaidAmount;
    const tenderedAmount = rawTenderedTotal;
    const resolvedChangeAmount = Math.max(0, tenderedAmount - totalAmount);

    if (normalizedPayments.length > 1) {
      const paymentTotalCents = Math.round((paymentTotal + Number.EPSILON) * 100);
      const totalAmountCents = Math.round((totalAmount + Number.EPSILON) * 100);
      if (paymentTotalCents !== totalAmountCents) {
        return { success: false, error: "مجموع المدفوعات المختلطة يجب أن يساوي الإجمالي" };
      }
    } else if (actualPaidAmount < totalAmount) {
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
      const latestVariants = await tx.productVariant.findMany({
        where: { id: { in: variantIds } },
        select: {
          id: true,
          isActive: true,
          stockQuantity: true,
          sellingPrice: true,
          costPrice: true,
          size: true,
          color: true,
          product: {
            select: { id: true, categoryId: true, name: true, nameAr: true, isActive: true },
          },
        },
      });
      const latestVariantMap = new Map(latestVariants.map((variant) => [variant.id, variant]));

      for (const item of data.items) {
        const variant = latestVariantMap.get(item.variantId);

        if (!variant || !variant.isActive || !variant.product.isActive) {
          throw new Error("أحد المنتجات غير موجود أو غير نشط");
        }

        const preparedVariant = variantMap.get(item.variantId);
        if (
          !preparedVariant ||
          variant.sellingPrice !== preparedVariant.sellingPrice ||
          variant.product.categoryId !== preparedVariant.product.categoryId
        ) {
          throw new Error("تغير سعر أحد المنتجات أثناء إتمام البيع. أعد المحاولة");
        }

        if (variant.stockQuantity < item.quantity) {
          throw new Error(
            `الكمية غير كافية للمنتج ${variant.product.nameAr || variant.product.name} (${variant.size} - ${variant.color})`
          );
        }
      }

      if (coupon) {
        const currentCoupon = await tx.coupon.findUnique({ where: { id: coupon.id } });
        if (
          !currentCoupon ||
          !currentCoupon.isActive ||
          currentCoupon.code !== coupon.code ||
          currentCoupon.type !== coupon.type ||
          currentCoupon.discountPercent !== coupon.discountPercent ||
          currentCoupon.discountAmount !== coupon.discountAmount ||
          currentCoupon.minOrderAmount !== coupon.minOrderAmount ||
          currentCoupon.usageLimit !== coupon.usageLimit ||
          currentCoupon.expiresAt?.getTime() !== coupon.expiresAt?.getTime() ||
          currentCoupon.stackable !== coupon.stackable ||
          (currentCoupon.expiresAt !== null && currentCoupon.expiresAt < new Date()) ||
          (promotionResult.discountAmount > 0 && !currentCoupon.stackable) ||
          calculateCouponDiscount(currentCoupon, grossSubtotal) !== couponDiscountAmount
        ) {
          throw new Error("تغيرت صلاحية الكوبون أو شروطه. أعد المحاولة");
        }

        const now = new Date();
        const couponClaim = await tx.coupon.updateMany({
          where: {
            id: currentCoupon.id,
            code: currentCoupon.code,
            isActive: true,
            usageLimit: currentCoupon.usageLimit,
            AND: [
              {
                OR: [
                  { expiresAt: null },
                  { expiresAt: { gte: now } },
                ],
              },
              {
                OR: [
                  { usageLimit: null },
                  { usageCount: { lt: currentCoupon.usageLimit ?? 0 } },
                ],
              },
            ],
          },
          data: { usageCount: { increment: 1 } },
        });
        if (couponClaim.count !== 1) {
          throw new Error("تم استنفاد مرات استخدام الكوبون. اختر طريقة دفع أخرى");
        }
      }

      const invoiceNumber = await generateInvoiceNumberSafe("INV");

      const createdSale = await tx.sale.create({
        data: {
          idempotencyKey,
          invoiceNumber,
          channel,
          customerId: data.customerId,
          userId: user.id,
          subtotal,
          discountAmount,
          discountPercent: manualPercent,
          appliedPromotions: promotionResult.appliedPromotions.map((promotion) => ({
            id: promotion.id,
            title: promotion.title,
            discountValue: promotion.discountValue,
          })).concat(coupon ? [{
            id: `COUPON:${coupon.id}`,
            title: `كوبون ${coupon.code}`,
            discountValue: couponDiscountAmount,
          }] : []).concat(loyaltyPointsToRedeem > 0 ? [{
            id: `LOYALTY:${data.customerId}`,
            title: `استبدال ${loyaltyPointsToRedeem} نقطة ولاء`,
            discountValue: loyaltyDiscountAmount,
          }] : []),
          couponId: coupon?.id,
          couponCode: coupon?.code,
          loyaltyPointsEarned,
          loyaltyPointsRedeemed: loyaltyPointsToRedeem,
          loyaltyDiscountAmount,
          discountReason: discountReason || null,
          // POS currently has no configured VAT calculation; sales are saved with zero tax.
          taxAmount: 0,
          totalAmount,
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
              unitPrice: variantMap.get(item.variantId)!.sellingPrice,
              costPrice: latestVariantMap.get(item.variantId)!.costPrice,
              discountAmount: saleLinePricing.get(item.variantId)!.discountAmount,
              totalPrice: saleLinePricing.get(item.variantId)!.netAmount,
            })),
          },
          payments: {
            create: normalizedPayments.map((payment) => ({
              amount: payment.amount,
              method: payment.method,
            })),
          },
        },
        select: saleResponseSelect,
      });

      if (data.customerId && loyaltyPointsToRedeem > 0) {
        const redeemedCustomer = await tx.customer.updateManyAndReturn({
          where: {
            id: data.customerId,
            loyaltyPoints: { gte: loyaltyPointsToRedeem },
          },
          data: { loyaltyPoints: { decrement: loyaltyPointsToRedeem } },
          select: { loyaltyPoints: true },
        });
        if (redeemedCustomer.length !== 1) {
          throw new Error("رصيد نقاط العميل غير كافٍ. حدّث الرصيد وحاول مرة أخرى");
        }

        await tx.loyaltyTransaction.create({
          data: {
            customerId: data.customerId,
            saleId: createdSale.id,
            type: "REDEEM",
            points: -loyaltyPointsToRedeem,
            balanceAfter: redeemedCustomer[0].loyaltyPoints,
            idempotencyKey: `sale:${createdSale.id}:redeem`,
            reason: `استبدال نقاط في الفاتورة ${invoiceNumber}`,
          },
        });
      }

      if (data.customerId && loyaltyPointsEarned > 0) {
        const earnedCustomer = await tx.customer.updateManyAndReturn({
          where: { id: data.customerId },
          data: { loyaltyPoints: { increment: loyaltyPointsEarned } },
          select: { loyaltyPoints: true },
        });
        if (earnedCustomer.length !== 1) {
          throw new Error("تعذر تحديث رصيد نقاط العميل");
        }

        await tx.loyaltyTransaction.create({
          data: {
            customerId: data.customerId,
            saleId: createdSale.id,
            type: "EARN",
            points: loyaltyPointsEarned,
            balanceAfter: earnedCustomer[0].loyaltyPoints,
            idempotencyKey: `sale:${createdSale.id}:earn`,
            reason: `نقاط مكتسبة من الفاتورة ${invoiceNumber}`,
          },
        });
      }

      for (const item of data.items) {
        const variant = latestVariantMap.get(item.variantId);

        if (!variant) continue;

        const updatedVariants = await tx.productVariant.updateManyAndReturn({
          where: {
            id: item.variantId,
            stockQuantity: { gte: item.quantity },
          },
          data: { stockQuantity: { decrement: item.quantity } },
          select: { stockQuantity: true },
        });
        if (updatedVariants.length !== 1) {
          throw new Error("تغير المخزون أثناء إتمام البيع. أعد المحاولة");
        }
        const newQty = updatedVariants[0].stockQuantity;
        const previousQty = newQty + item.quantity;
        variant.stockQuantity = newQty;

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
            totalSpent: { increment: totalAmount },
            visitCount: { increment: 1 },
          },
        });
      }

      if (data.customerId) {
        return tx.sale.findUniqueOrThrow({
          where: { id: createdSale.id },
          select: saleResponseSelect,
        });
      }

      return createdSale;
    }, {
      maxWait: 10000,
      timeout: 30000,
    });

    revalidateSalePaths();
    // Immediate cache invalidation for stock & storefront products
    if (sale.items.length > 0) {
      try {
        updateTag("products-list");
      } catch (error) {
        console.error("Failed to invalidate product cache after sale:", error);
      }
    }

    void checkLowStockAndNotify(data.items.map((item) => item.variantId));
    void sendTelegramMessage(formatSaleTelegramMessage(sale), {
      parseMode: "HTML",
    }).catch((error) => {
      console.error("Failed to send sale Telegram notification:", error);
    });
    return { success: true, data: sale };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      idempotencyKey &&
      userId
    ) {
      const existingSale = await findSaleByIdempotencyKey(idempotencyKey, userId);
      if (existingSale) {
        return { success: true, data: existingSale };
      }
    }
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
        couponId: true,
        loyaltyPointsEarned: true,
        loyaltyPointsRedeemed: true,
        notes: true,
        returns: {
          where: { status: "APPROVED" },
          select: { id: true },
        },
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

    if (sale.returns.length > 0) {
      return {
        success: false,
        error: "لا يمكن إلغاء فاتورة لها مرتجعات معتمدة. أكمل التسوية من شاشة المرتجعات.",
      };
    }

    if (sale.status !== "COMPLETED") {
      return { success: false, error: "لا يمكن إلغاء هذه الفاتورة" };
    }

    const cancelled = await prisma.$transaction(async (tx) => {
      const claimed = await tx.sale.updateMany({
        where: {
          id,
          status: "COMPLETED",
          returns: { none: { status: "APPROVED" } },
        },
        data: { status: "CANCELLED" },
      });
      if (claimed.count !== 1) {
        throw new Error("تغيرت حالة الفاتورة أو سُجل لها مرتجع. حدّث الصفحة وأعد المحاولة");
      }

      if (sale.couponId) {
        await tx.coupon.updateMany({
          where: { id: sale.couponId, usageCount: { gt: 0 } },
          data: { usageCount: { decrement: 1 } },
        });
      }

      if (sale.customerId && sale.loyaltyPointsEarned > 0) {
        const reversedCustomer = await tx.customer.updateManyAndReturn({
          where: { id: sale.customerId },
          data: { loyaltyPoints: { decrement: sale.loyaltyPointsEarned } },
          select: { loyaltyPoints: true },
        });
        if (reversedCustomer.length !== 1) {
          throw new Error("تعذر عكس النقاط المكتسبة من الفاتورة");
        }
        await tx.loyaltyTransaction.create({
          data: {
            customerId: sale.customerId,
            saleId: sale.id,
            type: "EARN_REVERSAL",
            points: -sale.loyaltyPointsEarned,
            balanceAfter: reversedCustomer[0].loyaltyPoints,
            idempotencyKey: `sale:${sale.id}:cancel:earn-reversal`,
            reason: `عكس النقاط المكتسبة بسبب إلغاء الفاتورة ${sale.invoiceNumber}`,
          },
        });
      }

      if (sale.customerId && sale.loyaltyPointsRedeemed > 0) {
        const restoredCustomer = await tx.customer.updateManyAndReturn({
          where: { id: sale.customerId },
          data: { loyaltyPoints: { increment: sale.loyaltyPointsRedeemed } },
          select: { loyaltyPoints: true },
        });
        if (restoredCustomer.length !== 1) {
          throw new Error("تعذر إعادة النقاط المستبدلة إلى العميل");
        }
        await tx.loyaltyTransaction.create({
          data: {
            customerId: sale.customerId,
            saleId: sale.id,
            type: "REDEEM_REVERSAL",
            points: sale.loyaltyPointsRedeemed,
            balanceAfter: restoredCustomer[0].loyaltyPoints,
            idempotencyKey: `sale:${sale.id}:cancel:redeem-reversal`,
            reason: `إعادة النقاط المستبدلة بسبب إلغاء الفاتورة ${sale.invoiceNumber}`,
          },
        });
      }

      for (const item of sale.items) {
        const variant = await tx.productVariant.findUnique({
          where: { id: item.variantId },
          select: { id: true, stockQuantity: true },
        });

        if (!variant) continue;

        const previousQty = variant.stockQuantity;
        const updatedVariants = await tx.productVariant.updateManyAndReturn({
          where: { id: item.variantId, stockQuantity: previousQty },
          data: { stockQuantity: { increment: item.quantity } },
          select: { stockQuantity: true },
        });
        if (updatedVariants.length !== 1) {
          throw new Error("تغير المخزون أثناء إلغاء البيع. أعد المحاولة");
        }
        const newQty = updatedVariants[0].stockQuantity;

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
