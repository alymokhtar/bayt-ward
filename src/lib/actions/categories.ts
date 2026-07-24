"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { invalidateCategoriesData } from "@/lib/revalidate-tags";
import { deleteImageByPublicId, isCloudinaryConfigured, uploadImageBuffer } from "@/lib/cloudinary";
import { ALLOWED_MIME_TYPES, MAX_UPLOAD_BYTES } from "@/lib/product-media-constants";

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
  invalidateCategoriesData();
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
      imageUrl: true,
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
  imageUrl?: string;
  isActive?: boolean;
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
        imageUrl: data.imageUrl?.trim() || null,
        isActive: data.isActive ?? true,
      },
    });

    revalidateCategoryPaths();
    return { success: true, data: category };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function uploadCategoryImage(formData: FormData): Promise<ActionResult<string>> {
  try {
    await requireRole(["ADMIN", "MANAGER"]);

    if (!isCloudinaryConfigured()) {
      return { success: false, error: "إعدادات Cloudinary غير مكتملة" };
    }

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return { success: false, error: "الملف مطلوب" };
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
      return { success: false, error: "نوع الملف غير مدعوم (JPG, PNG, WEBP, GIF)" };
    }

    if (file.size === 0 || file.size > MAX_UPLOAD_BYTES) {
      return { success: false, error: "حجم الملف غير صالح (الحد الأقصى 5MB)" };
    }

    let buffer: Buffer;
    try {
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } catch (error) {
      return { success: false, error: "خطأ في معالجة الملف" };
    }

    const uploaded = await uploadImageBuffer(buffer, { contentType: file.type });
    if (!uploaded?.url) {
      return { success: false, error: "فشل رفع الصورة إلى Cloudinary" };
    }

    return { success: true, data: uploaded.url };
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
    imageUrl?: string;
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
        imageUrl: data.imageUrl === undefined ? undefined : data.imageUrl?.trim() || null,
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
