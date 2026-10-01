"use server";

import { PromotionType as PrismaPromotionType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPromotionDateRangeBounds } from "@/lib/promotions";
import type { PromotionInput, PromotionRecord, PromotionType } from "./types";

type ActionResult = { success: true } | { success: false; error: string };

const PROMOTION_TYPES: PromotionType[] = Object.values(PrismaPromotionType);

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

function parseDate(value: string, endOfDay = false): Date | null {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    return null;
  }

  return date;
}

function validatePromotionInput(input: PromotionInput): string | null {
  if (!input.name?.trim()) return "اسم العرض مطلوب";
  if (!PROMOTION_TYPES.includes(input.type)) return "نوع العرض غير صالح";
  if (typeof input.isActive !== "boolean") return "حالة العرض غير صالحة";

  const startDate = input.startDate ? parseDate(input.startDate) : null;
  const endDate = input.endDate ? parseDate(input.endDate, true) : null;
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
      input.discountPercent < 0 ||
      input.discountPercent > 100
    ) {
      return "نسبة خصم القطع المجانية يجب أن تكون بين 0 و100";
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
    startDate: input.startDate ? parseDate(input.startDate) : null,
    endDate: input.endDate ? parseDate(input.endDate, true) : null,
    isActive: input.isActive,
  };
}

function normalizeIds(ids: string[]): string[] {
  return [...new Set(ids.filter((id) => typeof id === "string" && id.trim()).map((id) => id.trim()))];
}

export async function getPromotions(): Promise<PromotionRecord[]> {
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

    revalidatePath("/dashboard/promotions");
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

    revalidatePath("/dashboard/promotions");
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

    revalidatePath("/dashboard/promotions");
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
    revalidatePath("/dashboard/promotions");
    return { success: true };
  } catch (error) {
    return actionError(error, "تعذر حذف العرض");
  }
}