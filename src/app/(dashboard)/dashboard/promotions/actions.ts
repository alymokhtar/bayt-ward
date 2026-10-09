"use server";

import { PromotionType as PrismaPromotionType } from "@prisma/client";
import { revalidatePath, updateTag } from "next/cache";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseCairoCalendarDate } from "@/lib/promotion-date";
import {
  calculateCouponDiscount,
  getPromotionDateRangeBounds,
} from "@/lib/promotions";
import type {
  CouponInput,
  CouponRecord,
  CouponType,
  PromotionInput,
  PromotionRecord,
  PromotionType,
  PromotionView,
} from "./types";

type ActionResult = { success: true } | { success: false; error: string };

const PROMOTION_TYPES: PromotionType[] = Object.values(PrismaPromotionType);
const COUPON_TYPES: CouponType[] = ["PERCENTAGE", "FIXED_AMOUNT"];

function revalidatePromotionViews() {
  revalidatePath("/dashboard/promotions");
  revalidatePath("/store", "layout");
  updateTag("store-promotions");
}

function actionError(error: unknown, fallback: string): ActionResult {
  if (error instanceof Error && error.message === "UNAUTHORIZED") {
    return { success: false, error: "يجب تسجيل الدخول أولاً" };
  }
  if (error instanceof Error && error.message === "FORBIDDEN") {
    return { success: false, error: "ليس لديك صلاحية لهذا الإجراء" };
  }

  console.error("Promotion action failed:", error);
  return { success: false, error: fallback };
}

function validatePromotionInput(input: PromotionInput): string | null {
  if (!input.name?.trim()) return "اسم العرض مطلوب";
  if (!PROMOTION_TYPES.includes(input.type)) return "نوع العرض غير صالح";
  if (typeof input.isActive !== "boolean") return "حالة العرض غير صالحة";
  if (typeof input.isStoreOnly !== "boolean") return "حالة توفر العرض داخل المحل غير صالحة";

  const startDate = input.startDate ? parseCairoCalendarDate(input.startDate) : null;
  const endDate = input.endDate ? parseCairoCalendarDate(input.endDate, true) : null;
  if (input.startDate && !startDate) return "تاريخ البداية غير صالح";
  if (input.endDate && !endDate) return "تاريخ النهاية غير صالح";
  if (startDate && endDate && startDate > endDate) {
    return "تاريخ النهاية يجب أن يكون بعد تاريخ البداية";
  }

  if (input.minOrderAmount != null &&
      (!Number.isFinite(input.minOrderAmount) || input.minOrderAmount < 0)) {
    return "الحد الأدنى للطلب يجب أن يكون صفراً أو أكثر";
  }

  if (input.type === PrismaPromotionType.BUY_X_GET_Y) {
    if (!Number.isInteger(input.buyQuantity) || input.buyQuantity! < 1) {
      return "كمية الشراء يجب أن تكون عدداً صحيحاً أكبر من صفر";
    }
    if (!Number.isInteger(input.getQuantity) || input.getQuantity! < 1) {
      return "كمية الهدية يجب أن تكون عدداً صحيحاً أكبر من صفر";
    }
    if (
      input.discountPercent == null ||
      !Number.isFinite(input.discountPercent) ||
      input.discountPercent <= 0 ||
      input.discountPercent > 100
    ) {
      return "نسبة خصم القطع المجانية يجب أن تكون أكبر من صفر وحتى 100";
    }
  }

  if (input.type === PrismaPromotionType.PERCENTAGE) {
    if (
      input.discountPercent == null ||
      !Number.isFinite(input.discountPercent) ||
      input.discountPercent <= 0 ||
      input.discountPercent > 100
    ) {
      return "نسبة الخصم يجب أن تكون أكبر من صفر وحتى 100";
    }
  }

  if (input.type === PrismaPromotionType.FIXED_AMOUNT) {
    if (
      input.discountAmount == null ||
      !Number.isFinite(input.discountAmount) ||
      input.discountAmount <= 0
    ) {
      return "قيمة الخصم يجب أن تكون أكبر من صفر";
    }
  }

  if (!Array.isArray(input.categoryIds) || !Array.isArray(input.productIds)) {
    return "الأقسام أو المنتجات المحددة غير صالحة";
  }

  return null;
}

function toPromotionData(input: PromotionInput) {
  return {
    name: input.name.trim(),
    description: input.description?.trim() || null,
    type: input.type,
    buyQuantity: input.type === PrismaPromotionType.BUY_X_GET_Y ? input.buyQuantity : null,
    getQuantity: input.type === PrismaPromotionType.BUY_X_GET_Y ? input.getQuantity : null,
    discountPercent:
      input.type === PrismaPromotionType.BUY_X_GET_Y || input.type === PrismaPromotionType.PERCENTAGE
        ? input.discountPercent
        : null,
    discountAmount: input.type === PrismaPromotionType.FIXED_AMOUNT ? input.discountAmount : null,
    minOrderAmount: input.minOrderAmount,
    startDate: input.startDate ? parseCairoCalendarDate(input.startDate) : null,
    endDate: input.endDate ? parseCairoCalendarDate(input.endDate, true) : null,
    isActive: input.isActive,
    isStoreOnly: input.isStoreOnly,
  };
}

function normalizeIds(ids: string[]): string[] {
  return [...new Set(ids.filter((id) => typeof id === "string" && id.trim()).map((id) => id.trim()))];
}

function validateCouponInput(input: CouponInput): string | null {
  if (typeof input.code !== "string" || !/^[A-Z0-9_-]{3,40}$/.test(input.code.trim().toUpperCase())) {
    return "رمز الكوبون يجب أن يتكون من 3 إلى 40 حرفاً أو رقماً";
  }
  if (!COUPON_TYPES.includes(input.type)) return "نوع الكوبون غير صالح";
  if (typeof input.isActive !== "boolean" || typeof input.stackable !== "boolean") {
    return "إعدادات الكوبون غير صالحة";
  }
  if (
    input.minOrderAmount != null &&
    (!Number.isFinite(input.minOrderAmount) || input.minOrderAmount < 0)
  ) {
    return "الحد الأدنى للطلب يجب أن يكون صفراً أو أكثر";
  }
  if (
    input.usageLimit != null &&
    (!Number.isInteger(input.usageLimit) || input.usageLimit < 1)
  ) {
    return "حد الاستخدام يجب أن يكون عدداً صحيحاً أكبر من صفر";
  }
  if (input.type === "PERCENTAGE" &&
      (!Number.isFinite(input.discountPercent) ||
        input.discountPercent == null ||
        input.discountPercent <= 0 ||
        input.discountPercent > 100)) {
    return "نسبة خصم الكوبون يجب أن تكون أكبر من صفر وحتى 100";
  }
  if (input.type === "FIXED_AMOUNT" &&
      (!Number.isFinite(input.discountAmount) ||
        input.discountAmount == null ||
        input.discountAmount <= 0)) {
    return "قيمة خصم الكوبون يجب أن تكون أكبر من صفر";
  }
  if (input.expiresAt && !parseCairoCalendarDate(input.expiresAt, true)) {
    return "تاريخ انتهاء الكوبون غير صالح";
  }
  return null;
}

function toCouponData(input: CouponInput) {
  return {
    code: input.code.trim().toUpperCase(),
    type: input.type,
    discountPercent: input.type === "PERCENTAGE" ? input.discountPercent : null,
    discountAmount: input.type === "FIXED_AMOUNT" ? input.discountAmount : null,
    minOrderAmount: input.minOrderAmount,
    usageLimit: input.usageLimit,
    expiresAt: input.expiresAt ? parseCairoCalendarDate(input.expiresAt, true) : null,
    isActive: input.isActive,
    stackable: input.stackable,
  };
}

export async function getCoupons(): Promise<CouponRecord[]> {
  await requireRole(["ADMIN", "MANAGER"]);
  return prisma.coupon.findMany({
    orderBy: { createdAt: "desc" },
    take: 300,
  });
}

export async function createCoupon(input: CouponInput): Promise<ActionResult> {
  try {
    await requireRole(["ADMIN", "MANAGER"]);
    const validationError = validateCouponInput(input);
    if (validationError) return { success: false, error: validationError };

    await prisma.coupon.create({ data: toCouponData(input) });
    revalidatePromotionViews();
    revalidatePath("/pos");
    return { success: true };
  } catch (error) {
    return actionError(error, "تعذر إنشاء الكوبون. تحقق من عدم تكرار الرمز");
  }
}

export async function updateCoupon(
  id: string,
  input: CouponInput,
): Promise<ActionResult> {
  try {
    await requireRole(["ADMIN", "MANAGER"]);
    if (!id?.trim()) return { success: false, error: "معرّف الكوبون غير صالح" };
    const validationError = validateCouponInput(input);
    if (validationError) return { success: false, error: validationError };

    await prisma.coupon.update({
      where: { id },
      data: toCouponData(input),
    });
    revalidatePromotionViews();
    revalidatePath("/pos");
    return { success: true };
  } catch (error) {
    return actionError(error, "تعذر حفظ تعديلات الكوبون");
  }
}

export async function toggleCouponStatus(id: string): Promise<ActionResult> {
  try {
    await requireRole(["ADMIN", "MANAGER"]);
    const coupon = await prisma.coupon.findUnique({
      where: { id },
      select: { isActive: true },
    });
    if (!coupon) return { success: false, error: "الكوبون غير موجود" };
    await prisma.coupon.update({
      where: { id },
      data: { isActive: !coupon.isActive },
    });
    revalidatePromotionViews();
    revalidatePath("/pos");
    return { success: true };
  } catch (error) {
    return actionError(error, "تعذر تغيير حالة الكوبون");
  }
}

export async function deleteCoupon(id: string): Promise<ActionResult> {
  try {
    await requireRole(["ADMIN", "MANAGER"]);
    if (!id?.trim()) return { success: false, error: "معرّف الكوبون غير صالح" };
    await prisma.coupon.delete({ where: { id } });
    revalidatePromotionViews();
    revalidatePath("/pos");
    return { success: true };
  } catch (error) {
    return actionError(error, "تعذر حذف الكوبون");
  }
}

export async function getCouponQuote(
  rawCode: string,
  subtotal: number,
): Promise<{
  success: true;
  data: { code: string; discountAmount: number; stackable: boolean };
} | { success: false; error: string }> {
  await requireRole(["ADMIN", "MANAGER", "CASHIER"]);
  const code = typeof rawCode === "string" ? rawCode.trim().toUpperCase() : "";
  if (!code || !Number.isFinite(subtotal) || subtotal <= 0) {
    return { success: false, error: "رمز الكوبون أو قيمة الطلب غير صالحة" };
  }

  const coupon = await prisma.coupon.findUnique({ where: { code } });
  if (!coupon || !coupon.isActive) {
    return { success: false, error: "الكوبون غير صالح أو غير مفعل" };
  }
  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    return { success: false, error: "انتهت صلاحية الكوبون" };
  }
  if (coupon.usageLimit != null && coupon.usageCount >= coupon.usageLimit) {
    return { success: false, error: "تم استنفاد مرات استخدام الكوبون" };
  }
  const discountAmount = calculateCouponDiscount(coupon, subtotal);
  if (discountAmount <= 0) {
    return {
      success: false,
      error: coupon.minOrderAmount != null && subtotal < coupon.minOrderAmount
        ? `الحد الأدنى لاستخدام الكوبون هو ${coupon.minOrderAmount}`
        : "تعذر تطبيق الكوبون",
    };
  }
  return {
    success: true,
    data: { code: coupon.code, discountAmount, stackable: coupon.stackable },
  };
}

export async function getPromotions(view: PromotionView = "current"): Promise<PromotionRecord[]> {
  await requireRole(["ADMIN", "MANAGER"]);

  const { dayStart } = getPromotionDateRangeBounds();
  await prisma.promotion.updateMany({
    where: {
      isActive: true,
      endDate: { lt: dayStart },
    },
    data: { isActive: false },
  });

  return prisma.promotion.findMany({
    where: view === "expired"
      ? { endDate: { lt: dayStart } }
      : { OR: [{ endDate: null }, { endDate: { gte: dayStart } }] },
    orderBy: { createdAt: "desc" },
    include: {
      categories: { select: { id: true, name: true } },
      products: { select: { id: true, name: true } },
    },
  });
}

export async function getPromotionFormOptions() {
  await requireRole(["ADMIN", "MANAGER"]);

  const [categories, products] = await Promise.all([
    prisma.category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.product.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        categoryId: true,
        variants: {
          select: { sku: true },
          orderBy: { sku: "asc" },
          take: 10,
        },
      },
    }),
  ]);

  return {
    categories,
    products: products.map(({ variants, ...product }) => ({
      ...product,
      skus: variants.map(({ sku }) => sku),
    })),
  };
}

export async function createPromotion(input: PromotionInput): Promise<ActionResult> {
  try {
    await requireRole(["ADMIN", "MANAGER"]);
    const validationError = validatePromotionInput(input);
    if (validationError) return { success: false, error: validationError };

    await prisma.promotion.create({
      data: {
        ...toPromotionData(input),
        categories: { connect: normalizeIds(input.categoryIds).map((id) => ({ id })) },
        products: { connect: normalizeIds(input.productIds).map((id) => ({ id })) },
      },
    });

    revalidatePromotionViews();
    return { success: true };
  } catch (error) {
    return actionError(error, "تعذر إنشاء العرض");
  }
}

export async function updatePromotion(
  id: string,
  input: PromotionInput,
): Promise<ActionResult> {
  try {
    await requireRole(["ADMIN", "MANAGER"]);
    if (!id?.trim()) return { success: false, error: "معرّف العرض غير صالح" };

    const validationError = validatePromotionInput(input);
    if (validationError) return { success: false, error: validationError };

    await prisma.promotion.update({
      where: { id },
      data: {
        ...toPromotionData(input),
        categories: { set: normalizeIds(input.categoryIds).map((categoryId) => ({ id: categoryId })) },
        products: { set: normalizeIds(input.productIds).map((productId) => ({ id: productId })) },
      },
    });

    revalidatePromotionViews();
    return { success: true };
  } catch (error) {
    return actionError(error, "تعذر حفظ تعديلات العرض");
  }
}

export async function togglePromotionStatus(id: string): Promise<ActionResult> {
  try {
    await requireRole(["ADMIN", "MANAGER"]);
    const promotion = await prisma.promotion.findUnique({
      where: { id },
      select: { isActive: true },
    });
    if (!promotion) return { success: false, error: "العرض غير موجود" };

    await prisma.promotion.update({
      where: { id },
      data: { isActive: !promotion.isActive },
    });

    revalidatePromotionViews();
    return { success: true };
  } catch (error) {
    return actionError(error, "تعذر تغيير حالة العرض");
  }
}

export async function deletePromotion(id: string): Promise<ActionResult> {
  try {
    await requireRole(["ADMIN", "MANAGER"]);
    if (!id?.trim()) return { success: false, error: "معرّف العرض غير صالح" };

    await prisma.promotion.delete({ where: { id } });
    revalidatePromotionViews();
    return { success: true };
  } catch (error) {
    return actionError(error, "تعذر حذف العرض");
  }
}