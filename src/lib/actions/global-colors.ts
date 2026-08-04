"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

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
