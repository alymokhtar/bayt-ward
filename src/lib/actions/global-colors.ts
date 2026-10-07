"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { invalidateProductsData } from "@/lib/revalidate-tags";

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

type GlobalColorInput = {
  name: string;
  hexCode: string;
};

function handleActionError(error: unknown): ActionResult<never> {
  if (error instanceof Error) {
    if (error.message === "UNAUTHORIZED") {
      return { success: false, error: "يجب تسجيل الدخول أولاً" };
    }
    if (error.message === "FORBIDDEN") {
      return { success: false, error: "ليس لديك صلاحية لهذا الإجراء" };
    }
    if (error.message.includes("Unique constraint")) {
      return { success: false, error: "اسم اللون مستخدم بالفعل" };
    }
    return { success: false, error: error.message };
  }

  return { success: false, error: "حدث خطأ غير متوقع" };
}

function normalizeHex(value: string) {
  return String(value || "").trim().toUpperCase();
}

export async function getGlobalColors() {
  await requireRole(["ADMIN", "MANAGER"]);

  return prisma.globalColor.findMany({
    orderBy: { name: "asc" },
  });
}

export async function createGlobalColor(
  data: GlobalColorInput
): Promise<ActionResult> {
  try {
    await requireRole(["ADMIN"]);

    const name = String(data.name || "").trim();
    const hexCode = normalizeHex(data.hexCode);

    if (!name) {
      return { success: false, error: "اسم اللون مطلوب" };
    }

    if (!/^#[0-9A-F]{6}$/.test(hexCode)) {
      return { success: false, error: "يجب اختيار قيمة Hex صحيحة" };
    }

    await prisma.globalColor.create({
      data: {
        name,
        hexCode,
      },
    });

    return { success: true, data: undefined };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function updateGlobalColor(
  id: string,
  data: GlobalColorInput
): Promise<ActionResult> {
  try {
    await requireRole(["ADMIN"]);

    if (typeof id !== "string" || !id.trim()) {
      return { success: false, error: "معرّف اللون غير صالح" };
    }

    const name = typeof data?.name === "string" ? data.name.trim() : "";
    const hexCode =
      typeof data?.hexCode === "string" ? normalizeHex(data.hexCode) : "";

    if (!name) {
      return { success: false, error: "اسم اللون مطلوب" };
    }

    if (!/^#[0-9A-F]{6}$/.test(hexCode)) {
      return { success: false, error: "يجب اختيار قيمة Hex صحيحة" };
    }

    await prisma.$transaction(async (tx) => {
      const existing = await tx.globalColor.findUnique({
        where: { id: id.trim() },
        select: { id: true, name: true },
      });

      if (!existing) {
        throw new Error("اللون غير موجود");
      }

      const duplicate = await tx.globalColor.findFirst({
        where: { name, id: { not: existing.id } },
        select: { id: true },
      });
      if (duplicate) {
        throw new Error("اسم اللون مستخدم بالفعل");
      }

      const linkedVariants = await tx.productVariant.findMany({
        where: { globalColorId: existing.id },
        select: { productId: true },
        distinct: ["productId"],
      });
      const linkedProductColors = await tx.productColor.findMany({
        where: { globalColorId: existing.id },
        select: { productId: true },
        distinct: ["productId"],
      });
      const productIds = [
        ...new Set([
          ...linkedVariants.map((variant) => variant.productId),
          ...linkedProductColors.map((productColor) => productColor.productId),
        ]),
      ];

      if (name !== existing.name && productIds.length > 0) {
        const conflictingProductColor = await tx.productColor.findFirst({
          where: {
            productId: { in: productIds },
            color: name,
            NOT: { globalColorId: existing.id },
          },
          select: { id: true },
        });
        if (conflictingProductColor) {
          throw new Error(
            "تعذر تغيير الاسم لوجود لون بهذا الاسم في أحد المنتجات المرتبطة"
          );
        }
      }

      await tx.globalColor.update({
        where: { id: existing.id },
        data: { name, hexCode },
      });

      await Promise.all([
        tx.productVariant.updateMany({
          where: {
            OR: [
              { globalColorId: existing.id },
              ...(productIds.length > 0
                ? [
                    {
                      productId: { in: productIds },
                      color: existing.name,
                      globalColorId: null,
                    },
                  ]
                : []),
            ],
          },
          data: { color: name, colorHex: hexCode },
        }),
        tx.productColor.updateMany({
          where: {
            OR: [
              { globalColorId: existing.id },
              ...(productIds.length > 0
                ? [
                    {
                      productId: { in: productIds },
                      color: existing.name,
                      globalColorId: null,
                    },
                  ]
                : []),
            ],
          },
          data: { color: name, colorHex: hexCode, globalColorId: existing.id },
        }),
      ]);
    });

    invalidateProductsData();
    return { success: true, data: undefined };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function deleteGlobalColor(id: string): Promise<ActionResult> {
  try {
    await requireRole(["ADMIN"]);

    const color = await prisma.globalColor.findUnique({
      where: { id },
    });

    if (!color) {
      return { success: false, error: "اللون غير موجود" };
    }

    const linkedProductColorCount = await prisma.productColor.count({
      where: { globalColorId: id },
    });

    const linkedProductVariantCount = await prisma.productVariant.count({
      where: { globalColorId: id },
    });

    if (linkedProductColorCount > 0 || linkedProductVariantCount > 0) {
      return {
        success: false,
        error: "لا يمكن حذف هذا اللون لارتباطه بمنتجات",
      };
    }

    await prisma.globalColor.delete({
      where: { id },
    });

    return { success: true, data: undefined };
  } catch (error) {
    return handleActionError(error);
  }
}
