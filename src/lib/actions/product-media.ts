"use server";

import { requireRole } from "@/lib/auth";
import {
  deleteImageByPublicId,
  isCloudinaryConfigured,
  uploadImageBuffer,
} from "@/lib/cloudinary";
import { prisma } from "@/lib/prisma";
import { invalidateProductsData } from "@/lib/revalidate-tags";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

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
    if (error.message === "CLOUDINARY_NOT_CONFIGURED") {
      return { success: false, error: "إعدادات Cloudinary غير مكتملة" };
    }
    return { success: false, error: error.message };
  }

  return { success: false, error: "حدث خطأ غير متوقع" };
}

async function getNextMediaSortOrder(productColorId: string): Promise<number> {
  const latest = await prisma.productMedia.findFirst({
    where: { productColorId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  return (latest?.sortOrder ?? -1) + 1;
}

export async function uploadProductMedia(formData: FormData): Promise<
  ActionResult<{
    id: string;
    url: string;
    publicId: string;
    sortOrder: number;
    isPrimary: boolean;
  }>
> {
  try {
    await requireRole(["ADMIN", "MANAGER"]);

    if (!isCloudinaryConfigured()) {
      return { success: false, error: "إعدادات Cloudinary غير مكتملة" };
    }

    const productColorId = String(formData.get("productColorId") ?? "").trim();
    const file = formData.get("file");

    if (!productColorId) {
      return { success: false, error: "معرّف اللون مطلوب" };
    }

    if (!(file instanceof File)) {
      return { success: false, error: "الملف مطلوب" };
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return { success: false, error: "نوع الملف غير مدعوم" };
    }

    if (file.size === 0 || file.size > MAX_UPLOAD_BYTES) {
      return { success: false, error: "حجم الملف غير صالح (الحد الأقصى 5MB)" };
    }

    const productColor = await prisma.productColor.findUnique({
      where: { id: productColorId },
      select: { id: true, productId: true },
    });

    if (!productColor) {
      return { success: false, error: "اللون غير موجود" };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadImageBuffer(buffer);

    const sortOrder = await getNextMediaSortOrder(productColorId);
    const existingPrimary = await prisma.productMedia.findFirst({
      where: { productColorId, isPrimary: true, isActive: true },
      select: { id: true },
    });

    const media = await prisma.productMedia.create({
      data: {
        productColorId,
        url: uploaded.url,
        publicId: uploaded.publicId,
        sortOrder,
        isPrimary: !existingPrimary,
      },
      select: {
        id: true,
        url: true,
        publicId: true,
        sortOrder: true,
        isPrimary: true,
      },
    });

    invalidateProductsData();
    return { success: true, data: media };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function deleteProductMedia(mediaId: string): Promise<ActionResult> {
  try {
    await requireRole(["ADMIN", "MANAGER"]);

    const media = await prisma.productMedia.findUnique({
      where: { id: mediaId },
      select: {
        id: true,
        publicId: true,
        isPrimary: true,
        productColorId: true,
      },
    });

    if (!media) {
      return { success: false, error: "الصورة غير موجودة" };
    }

    if (isCloudinaryConfigured() && !media.publicId.startsWith("migrated/")) {
      try {
        await deleteImageByPublicId(media.publicId);
      } catch {
        // Keep DB cleanup even if remote delete fails.
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.productMedia.delete({ where: { id: media.id } });

      if (media.isPrimary) {
        const nextPrimary = await tx.productMedia.findFirst({
          where: {
            productColorId: media.productColorId,
            isActive: true,
          },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          select: { id: true },
        });

        if (nextPrimary) {
          await tx.productMedia.update({
            where: { id: nextPrimary.id },
            data: { isPrimary: true },
          });
        }
      }
    });

    invalidateProductsData();
    return { success: true, data: undefined };
  } catch (error) {
    return handleActionError(error);
  }
}
