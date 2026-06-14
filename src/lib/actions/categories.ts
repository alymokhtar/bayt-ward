"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

type ActionResult<T = void> =
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

function revalidateCategoryPaths() {
  revalidatePath("/categories");
  revalidatePath("/products");
  revalidatePath("/dashboard");
}

export async function getCategories(includeInactive = false) {
  await requireRole(["ADMIN", "MANAGER"]);

  return prisma.category.findMany({
    where: includeInactive ? undefined : { isActive: true },
    orderBy: { name: "asc" },
    take: 500,
    select: {
      id: true,
      name: true,
      nameAr: true,
      description: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { products: true } },
    },
  });
}

export async function createCategory(data: {
  name: string;
  nameAr?: string;
  description?: string;
}) {
  try {
    await requireRole(["ADMIN", "MANAGER"]);

    if (!data.name?.trim()) {
      return { success: false, error: "اسم التصنيف مطلوب" };
    }

    const category = await prisma.category.create({
      data: {
        name: data.name.trim(),
        nameAr: data.nameAr?.trim(),
        description: data.description?.trim(),
      },
    });

    revalidateCategoryPaths();
    return { success: true, data: category };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function updateCategory(
  id: string,
  data: {
    name?: string;
    nameAr?: string;
    description?: string;
    isActive?: boolean;
  }
) {
  try {
    await requireRole(["ADMIN", "MANAGER"]);

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: "التصنيف غير موجود" };
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        name: data.name?.trim(),
        nameAr: data.nameAr?.trim(),
        description: data.description?.trim(),
        isActive: data.isActive,
      },
    });

    revalidateCategoryPaths();
    return { success: true, data: category };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function deleteCategory(id: string) {
  try {
    await requireRole(["ADMIN", "MANAGER"]);

    const existing = await prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });

    if (!existing) {
      return { success: false, error: "التصنيف غير موجود" };
    }

    if (existing._count.products > 0) {
      return {
        success: false,
        error: "لا يمكن حذف تصنيف يحتوي على منتجات",
      };
    }

    await prisma.category.delete({ where: { id } });

    revalidateCategoryPaths();
    return { success: true, data: undefined };
  } catch (error) {
    return handleActionError(error);
  }
}
