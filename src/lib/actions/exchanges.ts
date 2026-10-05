"use server";

import { updateTag } from "next/cache";
import { PaymentMethod, Prisma, SalesChannel } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { generateInvoiceNumberSafe } from "@/lib/invoice-generator";
import { invalidateReturnsData, invalidateSalesData, revalidateInventoryCache } from "@/lib/revalidate-tags";
import { checkLowStockAndNotify } from "@/lib/actions/inventory";
import { calculateCartDiscounts } from "@/lib/promotions";
import { getActivePromotionsData } from "@/lib/promotions-data";
import { allocateInvoiceDiscount } from "@/lib/sale-pricing";
import { calculateReturnRefundAmount } from "@/lib/return-pricing";
import {
  calculateExchangeSettlementBalance,
  calculateExchangeStockChanges,
} from "@/lib/exchange-pricing";

type ExchangeItemInput = {
  variantId: string;
  quantity: number;
};

type ExchangeSettlementMethod = "CASH" | "CARD" | "WALLET";

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
        include: { items: true },
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
      if (salePricing.totalAmount <= 0) {
        throw new Error("إجمالي الفاتورة البديلة يجب أن يكون أكبر من صفر");
      }
      const settlementBalance = calculateExchangeSettlementBalance(
        salePricing.totalAmount,
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
      const saleLinePricing = new Map(
        salePricing.lines.map((line) => [line.key, line]),
      );
      const replacementTotal = salePricing.totalAmount;

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
        const pricing = saleLinePricing.get(item.variantId);
        if (!variant || !pricing) {
          throw new Error("تعذر احتساب أسعار المنتجات البديلة");
        }
        return {
          variantId: item.variantId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
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
          subtotal: salePricing.subtotal,
          discountAmount: salePricing.discountAmount,
          discountPercent: manualPercent,
          appliedPromotions: promotionResult.appliedPromotions.map((promotion) => ({
            id: promotion.id,
            title: promotion.title,
            discountValue: promotion.discountValue,
          })),
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

      return {
        ...createdExchange,
        originalInvoiceNumber: originalSale.invoiceNumber,
        returnNumber,
        replacementInvoiceNumber: invoiceNumber,
        refundAmount,
        replacementTotal,
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

    return { success: true, data: exchange };
  } catch (error) {
    return handleActionError(error);
  }
}
