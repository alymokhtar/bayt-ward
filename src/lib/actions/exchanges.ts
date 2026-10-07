"use server";

import { updateTag } from "next/cache";
import { PaymentMethod, Prisma, SalesChannel } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { generateInvoiceNumberSafe } from "@/lib/invoice-generator";
import { formatCurrency } from "@/lib/utils";
import { sendTelegramMessage } from "@/lib/telegram";
import { invalidateReturnsData, invalidateSalesData, revalidateInventoryCache } from "@/lib/revalidate-tags";
import { checkLowStockAndNotify } from "@/lib/actions/inventory";
import { calculateCartDiscounts } from "@/lib/promotions";
import { getActivePromotionsData } from "@/lib/promotions-data";
import { allocateInvoiceDiscount } from "@/lib/sale-pricing";
import { calculateReturnRefundAmount } from "@/lib/return-pricing";
import {
  applyEqualProductExchangePricing,
  calculateExchangeSettlementBalance,
  calculateExchangeStockChanges,
} from "@/lib/exchange-pricing";

type ExchangeItemInput = {
  variantId: string;
  quantity: number;
};

type ExchangeSettlementMethod = "CASH" | "CARD" | "WALLET";

type ExchangeReceiptData = {
  exchangeNumber: string;
  originalInvoiceNumber: string;
  returnNumber: string;
  replacementInvoiceNumber: string;
  createdAt: Date;
  cashierName: string;
  customerName: string | null;
  customerPhone: string | null;
  returnedItems: ExchangeReceiptLine[];
  replacementItems: ExchangeReceiptLine[];
  refundAmount: number;
  replacementSubtotal: number;
  replacementDiscountAmount: number;
  replacementTotal: number;
  settlementBalance: number;
  settlementMethod: ExchangeSettlementMethod | null;
};

type ExchangeReceiptLine = {
    name: string;
    size: string;
    color: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
};

function escapeTelegramHtml(value: string | number) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildExchangeTelegramMessage(data: {
  exchangeNumber: string;
  originalInvoiceNumber: string;
  returnNumber: string;
  replacementInvoiceNumber: string;
  cashierName: string;
  customerName: string | null;
  settlementBalance: number;
  returnedItems: Array<{
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    saleItem: {
      variant: {
        size: string;
        color: string;
        product: { name: string; nameAr: string | null };
      };
    };
  }>;
  replacementItems: Array<{
    quantity: number;
    name: string;
    size: string;
    color: string;
  }>;
  replacementPricingLines: Array<{ unitPrice: number; netAmount: number }>;
}) {
  const returnedItems = data.returnedItems.map((item) => {
    const variant = item.saleItem.variant;
    return `• ${escapeTelegramHtml(variant.product.nameAr || variant.product.name)} (${escapeTelegramHtml(variant.size)} / ${escapeTelegramHtml(variant.color)}) × ${item.quantity} — ${formatCurrency(item.unitPrice)} للوحدة، ${formatCurrency(item.totalPrice)} إجمالي`;
  });
  const replacementItems = data.replacementItems.map((item, index) => {
    const pricing = data.replacementPricingLines[index];
    if (!pricing) {
      throw new Error("Replacement pricing missing from exchange Telegram message");
    }
    return `• ${escapeTelegramHtml(item.name)} (${escapeTelegramHtml(item.size)} / ${escapeTelegramHtml(item.color)}) × ${item.quantity} — ${formatCurrency(pricing.unitPrice)} للوحدة، ${formatCurrency(pricing.netAmount)} إجمالي`;
  });
  const settlement = data.settlementBalance > 0
    ? `مطلوب تحصيله من العميل: ${formatCurrency(data.settlementBalance)}`
    : data.settlementBalance < 0
      ? `مبلغ مسترد للعميل: ${formatCurrency(Math.abs(data.settlementBalance))}`
      : "لا يوجد فرق مالي";

  return [
    "🔄 <b>عملية استبدال جديدة</b>",
    "",
    `<b>رقم الاستبدال:</b> ${escapeTelegramHtml(data.exchangeNumber)}`,
    `<b>الفاتورة الأصلية:</b> ${escapeTelegramHtml(data.originalInvoiceNumber)}`,
    `<b>رقم المرتجع:</b> ${escapeTelegramHtml(data.returnNumber)}`,
    `<b>فاتورة البديل:</b> ${escapeTelegramHtml(data.replacementInvoiceNumber)}`,
    `<b>العميل:</b> ${escapeTelegramHtml(data.customerName || "عميل نقدي")}`,
    `<b>قناة البيع:</b> ${escapeTelegramHtml("نقطة البيع (POS)")}`,
    `<b>الكاشير:</b> ${escapeTelegramHtml(data.cashierName)}`,
    "",
    "<b>الأصناف المرتجعة:</b>",
    ...returnedItems,
    "",
    "<b>الأصناف البديلة:</b>",
    ...replacementItems,
    "",
    `<b>التسوية:</b> ${settlement}`,
  ].join("\n");
}

type ActionResult<T> =
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

export async function createExchange(data: {
  originalSaleId: string;
  returnItems: ExchangeItemInput[];
  replacementItems: ExchangeItemInput[];
  settlementMethod?: ExchangeSettlementMethod;
  expectedSettlementBalance?: number;
  manualDiscountAmount?: number;
  discountPercent?: number;
  reason?: string;
  notes?: string;
}) {
  try {
    const user = await requireRole(["ADMIN", "MANAGER", "CASHIER"]);
    const validItems = (items: ExchangeItemInput[]) =>
      Array.isArray(items) &&
      items.length > 0 &&
      items.every((item) =>
        Boolean(item.variantId) && Number.isInteger(item.quantity) && item.quantity > 0
      ) &&
      new Set(items.map((item) => item.variantId)).size === items.length;

    if (!data.originalSaleId) {
      return { success: false, error: "فاتورة البيع الأصلية مطلوبة" };
    }
    if (!validItems(data.returnItems) || !validItems(data.replacementItems)) {
      return { success: false, error: "عناصر الاستبدال أو كمياتها غير صالحة" };
    }
    if (
      data.settlementMethod !== undefined &&
      !["CASH", "CARD", "WALLET"].includes(data.settlementMethod)
    ) {
      return { success: false, error: "طريقة تسوية الفرق غير صالحة" };
    }
    const manualDiscountAmount = data.manualDiscountAmount ?? 0;
    const discountPercent = data.discountPercent ?? 0;
    if (
      !Number.isFinite(manualDiscountAmount) ||
      manualDiscountAmount < 0 ||
      !Number.isFinite(discountPercent) ||
      discountPercent < 0
    ) {
      return { success: false, error: "قيمة الخصم غير صالحة" };
    }
    if (
      data.expectedSettlementBalance !== undefined &&
      !Number.isFinite(data.expectedSettlementBalance)
    ) {
      return { success: false, error: "قيمة التسوية المتوقعة غير صالحة" };
    }

    const replacementVariantIds = data.replacementItems.map((item) => item.variantId);
    const activePromotions = await getActivePromotionsData();

    const exchange = await prisma.$transaction(async (tx) => {
      const originalSale = await tx.sale.findUnique({
        where: { id: data.originalSaleId },
        include: {
          customer: { select: { name: true, phone: true } },
          items: {
            include: {
              variant: {
                select: {
                  productId: true,
                  size: true,
                  color: true,
                  product: { select: { name: true, nameAr: true } },
                },
              },
            },
          },
        },
      });
      if (!originalSale) {
        throw new Error("فاتورة البيع الأصلية غير موجودة");
      }
      if (!["COMPLETED", "PARTIALLY_REFUNDED"].includes(originalSale.status)) {
        throw new Error("لا يمكن استبدال منتجات من هذه الفاتورة");
      }

      const saleItemsByVariant = new Map(
        originalSale.items.map((item) => [item.variantId, item]),
      );
      const selectedSaleItems = data.returnItems.map((item) => {
        const saleItem = saleItemsByVariant.get(item.variantId);
        if (!saleItem) {
          throw new Error("المنتج غير موجود في فاتورة البيع الأصلية");
        }
        return { ...item, saleItem };
      });
      const previousReturns = await tx.returnItem.findMany({
        where: {
          variantId: { in: data.returnItems.map((item) => item.variantId) },
          return: { saleId: originalSale.id, status: "APPROVED" },
        },
        select: {
          saleItemId: true,
          variantId: true,
          quantity: true,
          totalPrice: true,
        },
      });
      const previousReturnsBySaleItem = new Map<
        string,
        { quantity: number; refundAmount: number }
      >();
      for (const previous of previousReturns) {
        const saleItem = previous.saleItemId
          ? originalSale.items.find((item) => item.id === previous.saleItemId)
          : saleItemsByVariant.get(previous.variantId);
        if (!saleItem) continue;
        const totals = previousReturnsBySaleItem.get(saleItem.id) ?? {
          quantity: 0,
          refundAmount: 0,
        };
        totals.quantity += previous.quantity;
        totals.refundAmount += previous.totalPrice;
        previousReturnsBySaleItem.set(saleItem.id, totals);
      }

      const pricedReturnItems = selectedSaleItems.map((item) => {
        const previous = previousReturnsBySaleItem.get(item.saleItem.id);
        const calculation = calculateReturnRefundAmount(
          item.saleItem,
          item.quantity,
          previous?.quantity ?? 0,
          previous?.refundAmount ?? 0,
        );

        return {
          ...item,
          unitPrice: calculation.netUnitPrice,
          totalPrice: calculation.refundAmount,
        };
      });
      const refundAmount = Math.round(
        (pricedReturnItems.reduce((sum, item) => sum + item.totalPrice, 0) +
          Number.EPSILON) * 100,
      ) / 100;
      if (refundAmount <= 0) {
        throw new Error("مبلغ الاسترداد يجب أن يكون أكبر من صفر");
      }

      const replacementVariants = await tx.productVariant.findMany({
        where: { id: { in: replacementVariantIds } },
        select: {
          id: true,
          isActive: true,
          stockQuantity: true,
          sellingPrice: true,
          costPrice: true,
          size: true,
          color: true,
          productId: true,
          product: {
            select: {
              id: true,
              categoryId: true,
              name: true,
              nameAr: true,
              isActive: true,
            },
          },
        },
      });
      if (replacementVariants.length !== replacementVariantIds.length) {
        throw new Error("أحد المنتجات البديلة غير موجود أو غير نشط");
      }
      const replacementVariantMap = new Map(
        replacementVariants.map((variant) => [variant.id, variant]),
      );
      const trustedReplacementItems = data.replacementItems.map((item) => {
        const variant = replacementVariantMap.get(item.variantId);
        if (!variant || !variant.isActive || !variant.product.isActive) {
          throw new Error("أحد المنتجات البديلة غير موجود أو غير نشط");
        }
        return {
          variantId: variant.id,
          productId: variant.product.id,
          categoryId: variant.product.categoryId,
          quantity: item.quantity,
          unitPrice: variant.sellingPrice,
          name: variant.product.nameAr || variant.product.name,
          size: variant.size,
          color: variant.color,
        };
      });
      const grossSubtotal = trustedReplacementItems.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0,
      );
      const promotionResult = calculateCartDiscounts(
        trustedReplacementItems.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          categoryId: item.categoryId,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          name: item.name,
        })),
        activePromotions,
        { channel: SalesChannel.POS },
      );
      const manualPercent = Math.min(100, discountPercent);
      const requestedDiscount = Math.min(
        grossSubtotal,
        promotionResult.discountAmount +
          grossSubtotal * manualPercent / 100 +
          manualDiscountAmount,
      );
      const salePricing = allocateInvoiceDiscount(
        trustedReplacementItems.map((item) => ({
          key: item.variantId,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
        })),
        requestedDiscount,
      );
      const saleLinePricing = new Map(
        salePricing.lines.map((line) => [line.key, line]),
      );
      const exchangePricing = applyEqualProductExchangePricing(
        pricedReturnItems.map((item) => ({
          productId: item.saleItem.variant.productId,
          quantity: item.quantity,
          refundAmount: item.totalPrice,
        })),
        trustedReplacementItems.map((item) => {
          const pricing = saleLinePricing.get(item.variantId);
          if (!pricing) {
            throw new Error("تعذر احتساب أسعار المنتجات البديلة");
          }
          return { ...pricing, productId: item.productId };
        }),
      );
      const exchangeLinePricing = new Map(
        exchangePricing.lines.map((line) => [line.key, line]),
      );
      if (exchangePricing.totalAmount <= 0) {
        throw new Error("إجمالي الفاتورة البديلة يجب أن يكون أكبر من صفر");
      }
      const settlementBalance = calculateExchangeSettlementBalance(
        exchangePricing.totalAmount,
        refundAmount,
      );
      if (
        data.expectedSettlementBalance !== undefined &&
        Math.abs(settlementBalance - data.expectedSettlementBalance) > 0.01
      ) {
        throw new Error("تغير سعر أو خصم المنتجات. أعد مراجعة مبلغ التسوية");
      }
      if (settlementBalance !== 0 && !data.settlementMethod) {
        throw new Error("اختر طريقة دفع أو رد الفرق");
      }
      const settlementMethod = data.settlementMethod === "CASH"
        ? PaymentMethod.CASH
        : data.settlementMethod === "CARD"
          ? PaymentMethod.CARD
          : data.settlementMethod === "WALLET"
            ? PaymentMethod.WALLET
            : undefined;
      const settlementData = settlementBalance === 0 || !settlementMethod
        ? undefined
        : {
            create: {
              direction: settlementBalance > 0 ? "COLLECTION" as const : "REFUND" as const,
              amount: Math.abs(settlementBalance),
              method: settlementMethod,
            },
          };

      const allVariantIds = [
        ...new Set([
          ...pricedReturnItems.map((item) => item.variantId),
          ...replacementVariantIds,
        ]),
      ];
      const stockVariants = await tx.productVariant.findMany({
        where: { id: { in: allVariantIds } },
        select: { id: true, stockQuantity: true },
      });
      const stockByVariant = new Map(
        stockVariants.map((variant) => [variant.id, variant.stockQuantity]),
      );
      const stockChanges = calculateExchangeStockChanges(
        stockByVariant,
        pricedReturnItems,
        trustedReplacementItems,
      );
      const expectedStockById = new Map(
        stockChanges.map((change) => [change.variantId, change.newQty]),
      );
      const stockById = new Map(stockVariants.map((variant) => [variant.id, variant]));

      const returnNumber = await generateInvoiceNumberSafe("RET");
      const invoiceNumber = await generateInvoiceNumberSafe("INV");
      const exchangeNumber = await generateInvoiceNumberSafe("EXC");
      const replacementTotal = exchangePricing.totalAmount;

      const createdReturn = await tx.return.create({
        data: {
          returnNumber,
          saleId: originalSale.id,
          customerId: originalSale.customerId,
          userId: user.id,
          totalAmount: refundAmount,
          refundAmount,
          reason: data.reason,
          notes: data.notes,
          status: "APPROVED",
          items: {
            create: pricedReturnItems.map((item) => ({
              variantId: item.variantId,
              saleItemId: item.saleItem.id,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              costPrice: item.saleItem.costPrice,
              totalPrice: item.totalPrice,
            })),
          },
        },
      });

      const saleItemsForCreate = trustedReplacementItems.map((item) => {
        const variant = replacementVariantMap.get(item.variantId);
        const pricing = exchangeLinePricing.get(item.variantId);
        if (!variant || !pricing) {
          throw new Error("تعذر احتساب أسعار المنتجات البديلة");
        }
        return {
          variantId: item.variantId,
          quantity: item.quantity,
          unitPrice: pricing.unitPrice,
          costPrice: variant.costPrice,
          discountAmount: pricing.discountAmount,
          totalPrice: pricing.netAmount,
        };
      });

      const createdSale = await tx.sale.create({
        data: {
          invoiceNumber,
          channel: SalesChannel.POS,
          customerId: originalSale.customerId,
          userId: user.id,
          subtotal: exchangePricing.subtotal,
          discountAmount: exchangePricing.discountAmount,
          discountPercent: manualPercent,
          appliedPromotions: [
            ...promotionResult.appliedPromotions.map((promotion) => ({
              id: promotion.id,
              title: promotion.title,
              discountValue: promotion.discountValue,
            })),
            ...(exchangePricing.exchangeDiscountAmount > 0
              ? [{
                  id: "EXCHANGE_DISCOUNT",
                  title: "خصم استبدال متكافئ",
                  discountValue: exchangePricing.exchangeDiscountAmount,
                }]
              : []),
          ],
          taxAmount: 0,
          totalAmount: replacementTotal,
          tenderedAmount: replacementTotal,
          paidAmount: replacementTotal,
          changeAmount: 0,
          paymentMethod: null,
          status: "COMPLETED",
          notes: `استبدال ${exchangeNumber}`,
          items: {
            create: saleItemsForCreate,
          },
        },
        select: { id: true },
      });

      const createdExchange = await tx.exchange.create({
        data: {
          exchangeNumber,
          originalSaleId: originalSale.id,
          returnId: createdReturn.id,
          replacementSaleId: createdSale.id,
          settlementBalance,
          settlements: settlementData,
        },
        select: {
          id: true,
          exchangeNumber: true,
          settlementBalance: true,
          createdAt: true,
        },
      });

      const currentStock = new Map(stockByVariant);
      for (const item of pricedReturnItems) {
        const variant = stockById.get(item.variantId);
        if (!variant) throw new Error("المنتج المرتجع غير موجود في المخزون");
        const previousQty = currentStock.get(item.variantId);
        if (previousQty === undefined) {
          throw new Error("المنتج المرتجع غير موجود في المخزون");
        }
        const newQty = previousQty + item.quantity;
        const update = await tx.productVariant.updateMany({
          where: { id: item.variantId, stockQuantity: previousQty },
          data: { stockQuantity: { increment: item.quantity } },
        });
        if (update.count !== 1) {
          throw new Error("تغير المخزون أثناء الاستبدال. أعد المحاولة");
        }
        currentStock.set(item.variantId, newQty);
        await tx.stockMovement.create({
          data: {
            variantId: item.variantId,
            userId: user.id,
            type: "RETURN",
            quantity: item.quantity,
            previousQty,
            newQty,
            reference: returnNumber,
            notes: data.reason || `مرتجع ضمن الاستبدال ${exchangeNumber}`,
          },
        });
      }
      for (const item of trustedReplacementItems) {
        const previousQty = currentStock.get(item.variantId);
        if (previousQty === undefined) {
          throw new Error("المنتج البديل غير موجود في المخزون");
        }
        const newQty = previousQty - item.quantity;
        const update = await tx.productVariant.updateMany({
          where: { id: item.variantId, stockQuantity: previousQty },
          data: { stockQuantity: { decrement: item.quantity } },
        });
        if (update.count !== 1) {
          throw new Error("تغير المخزون أثناء الاستبدال. أعد المحاولة");
        }
        currentStock.set(item.variantId, newQty);
        await tx.stockMovement.create({
          data: {
            variantId: item.variantId,
            userId: user.id,
            type: "SALE",
            quantity: -item.quantity,
            previousQty,
            newQty,
            reference: invoiceNumber,
            notes: `بيع بديل ضمن الاستبدال ${exchangeNumber}`,
          },
        });
      }
      for (const [variantId, expectedQty] of expectedStockById) {
        if (currentStock.get(variantId) !== expectedQty) {
          throw new Error("تعذر تطبيق تغييرات المخزون للاستبدال");
        }
      }

      const returnedQuantities = await tx.returnItem.aggregate({
        where: { return: { saleId: originalSale.id, status: "APPROVED" } },
        _sum: { quantity: true },
      });
      const totalSoldQuantity = originalSale.items.reduce(
        (sum, item) => sum + item.quantity,
        0,
      );
      const returnedQuantity = returnedQuantities._sum.quantity ?? 0;
      await tx.sale.update({
        where: { id: originalSale.id },
        data: {
          status: returnedQuantity >= totalSoldQuantity
            ? "REFUNDED"
            : "PARTIALLY_REFUNDED",
        },
      });

      if (originalSale.customerId) {
        await tx.customer.update({
          where: { id: originalSale.customerId },
          data: {
            totalSpent: { increment: replacementTotal - refundAmount },
          },
        });
      }

      const receiptSource = {
        exchangeNumber: createdExchange.exchangeNumber,
        originalInvoiceNumber: originalSale.invoiceNumber,
        returnNumber,
        replacementInvoiceNumber: invoiceNumber,
        createdAt: createdExchange.createdAt,
        cashierName: user.name,
        customerName: originalSale.customer?.name ?? null,
        customerPhone: originalSale.customer?.phone ?? null,
        returnedItems: pricedReturnItems,
        replacementItems: trustedReplacementItems,
        replacementPricingLines: exchangePricing.lines,
      };

      return {
        ...createdExchange,
        originalInvoiceNumber: originalSale.invoiceNumber,
        returnNumber,
        replacementInvoiceNumber: invoiceNumber,
        refundAmount,
        replacementTotal,
        receiptSource,
      };
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 10000,
      timeout: 30000,
    });

    invalidateSalesData();
    invalidateReturnsData();
    revalidateInventoryCache();
    updateTag("products-list");
    void checkLowStockAndNotify(replacementVariantIds);

    const { receiptSource, ...exchangeResult } = exchange;
    try {
      const telegramMessage = buildExchangeTelegramMessage({
        exchangeNumber: receiptSource.exchangeNumber,
        originalInvoiceNumber: receiptSource.originalInvoiceNumber,
        returnNumber: receiptSource.returnNumber,
        replacementInvoiceNumber: receiptSource.replacementInvoiceNumber,
        cashierName: receiptSource.cashierName,
        customerName: receiptSource.customerName,
        settlementBalance: exchangeResult.settlementBalance,
        returnedItems: receiptSource.returnedItems,
        replacementItems: receiptSource.replacementItems,
        replacementPricingLines: receiptSource.replacementPricingLines,
      });
      await sendTelegramMessage(telegramMessage, { parseMode: "HTML" });
    } catch (error) {
      console.error("Failed to send exchange Telegram notification:", error);
    }

    let receipt: ExchangeReceiptData | undefined;
    try {
      receipt = {
        exchangeNumber: receiptSource.exchangeNumber,
        originalInvoiceNumber: receiptSource.originalInvoiceNumber,
        returnNumber: receiptSource.returnNumber,
        replacementInvoiceNumber: receiptSource.replacementInvoiceNumber,
        createdAt: receiptSource.createdAt,
        cashierName: receiptSource.cashierName,
        customerName: receiptSource.customerName,
        customerPhone: receiptSource.customerPhone,
        returnedItems: receiptSource.returnedItems.map((item) => ({
          name:
            item.saleItem.variant.product.nameAr ||
            item.saleItem.variant.product.name,
          size: item.saleItem.variant.size,
          color: item.saleItem.variant.color,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        })),
        replacementItems: receiptSource.replacementItems.map((item, index) => {
          const pricing = receiptSource.replacementPricingLines[index];
          if (!pricing) {
            throw new Error("Replacement pricing missing from exchange receipt data");
          }
          return {
            name: item.name,
            size: item.size,
            color: item.color,
            quantity: item.quantity,
            unitPrice: pricing.unitPrice,
            totalPrice: pricing.netAmount,
          };
        }),
        refundAmount: exchangeResult.refundAmount,
        replacementSubtotal: receiptSource.replacementPricingLines.reduce(
          (sum, line) => sum + line.grossAmount,
          0,
        ),
        replacementDiscountAmount: receiptSource.replacementPricingLines.reduce(
          (sum, line) => sum + line.discountAmount,
          0,
        ),
        replacementTotal: exchangeResult.replacementTotal,
        settlementBalance: exchangeResult.settlementBalance,
        settlementMethod: data.settlementMethod ?? null,
      };
    } catch (error) {
      console.error("Failed to prepare exchange receipt data:", error);
    }

    return {
      success: true,
      data: {
        ...exchangeResult,
        ...(receipt ? { receipt } : {}),
      },
    };
  } catch (error) {
    return handleActionError(error);
  }
}
