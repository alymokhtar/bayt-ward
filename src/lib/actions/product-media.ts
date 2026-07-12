"use server";

import { requireRole } from "@/lib/auth";
import {
  deleteImageByPublicId,
  isCloudinaryConfigured,
  uploadImageBuffer,
} from "@/lib/cloudinary";
import { prisma } from "@/lib/prisma";
import { syncProductColors } from "@/lib/product-color-sync";
import { invalidateProductsData } from "@/lib/revalidate-tags";
import type {
  ProductColorWithMedia,
  ProductMediaItem,
} from "@/lib/types/product-media";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

const mediaSelect = {
  id: true,
  url: true,
  publicId: true,
  altText: true,
  sortOrder: true,
  isPrimary: true,
  isActive: true,
} as const;

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

function revalidateProductMediaPaths() {
  invalidateProductsData();
}

async function requireMediaManager() {
  return requireRole(["ADMIN", "MANAGER"]);
}

async function getNextMediaSortOrder(productColorId: string): Promise<number> {
  const latest = await prisma.productMedia.findFirst({
    where: { productColorId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  return (latest?.sortOrder ?? -1) + 1;
}

async function getMediaOrError(mediaId: string) {
  const media = await prisma.productMedia.findUnique({
    where: { id: mediaId },
    select: {
      id: true,
      publicId: true,
      isPrimary: true,
      isActive: true,
      productColorId: true,
      productColor: {
        select: { productId: true },
      },
    },
  });

  if (!media) {
    return { success: false as const, error: "الصورة غير موجودة" };
  }

  return { success: true as const, media };
}

export async function getProductColorsWithMedia(
  productId: string
): Promise<ProductColorWithMedia[]> {
  await requireMediaManager();

  const variants = await prisma.productVariant.findMany({
    where: { productId, isActive: true },
    select: { id: true, color: true, colorHex: true, isActive: true },
    orderBy: [{ color: "asc" }],
  });

  const hasVariantColors = variants.some((variant) => variant.color?.trim());
  if (hasVariantColors) {
    await prisma.$transaction(async (tx) => {
      await syncProductColors(
        tx,
        productId,
        variants
          .filter((variant) => variant.color?.trim())
          .map((variant) => ({
            id: variant.id,
            color: variant.color.trim(),
            colorHex: variant.colorHex?.trim() || null,
            isActive: variant.isActive,
          })),
        []
      );
    });
  }

  return prisma.productColor.findMany({
    where: { productId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      color: true,
      colorHex: true,
      sortOrder: true,
      isActive: true,
      media: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: mediaSelect,
      },
    },
  });
}

export async function uploadProductMedia(formData: FormData): Promise<
  ActionResult<ProductMediaItem>
> {
  try {
    await requireMediaManager();

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

    if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
      return { success: false, error: "نوع الملف غير مدعوم (JPG, PNG, WEBP, GIF)" };
    }

    if (file.size === 0 || file.size > MAX_UPLOAD_BYTES) {
      return { success: false, error: "حجم الملف غير صالح (الحد الأقصى 5MB)" };
    }

    const productColor = await prisma.productColor.findUnique({
      where: { id: productColorId },
      select: { id: true },
    });

    if (!productColor) {
      return { success: false, error: "اللون غير موجود" };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadImageBuffer(buffer);

    const media = await prisma.$transaction(async (tx) => {
      const sortOrder = await getNextMediaSortOrder(productColorId);
      const existingPrimary = await tx.productMedia.findFirst({
        where: { productColorId, isPrimary: true, isActive: true },
        select: { id: true },
      });

      return tx.productMedia.create({
        data: {
          productColorId,
          url: uploaded.url,
          publicId: uploaded.publicId,
          sortOrder,
          isPrimary: !existingPrimary,
        },
        select: mediaSelect,
      });
    });

    revalidateProductMediaPaths();
    return { success: true, data: media };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function deleteProductMedia(mediaId: string): Promise<ActionResult> {
  try {
    await requireMediaManager();

    const lookup = await getMediaOrError(mediaId);
    if (!lookup.success) {
      return { success: false, error: lookup.error };
    }

    const { media } = lookup;

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

    revalidateProductMediaPaths();
    return { success: true, data: undefined };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function setPrimaryProductMedia(
  mediaId: string
): Promise<ActionResult<ProductMediaItem>> {
  try {
    await requireMediaManager();

    const lookup = await getMediaOrError(mediaId);
    if (!lookup.success) {
      return { success: false, error: lookup.error };
    }

    const media = await prisma.$transaction(async (tx) => {
      await tx.productMedia.updateMany({
        where: { productColorId: lookup.media.productColorId },
        data: { isPrimary: false },
      });

      return tx.productMedia.update({
        where: { id: mediaId },
        data: { isPrimary: true, isActive: true },
        select: mediaSelect,
      });
    });

    revalidateProductMediaPaths();
    return { success: true, data: media };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function toggleProductMediaActive(
  mediaId: string,
  isActive: boolean
): Promise<ActionResult<ProductMediaItem>> {
  try {
    await requireMediaManager();

    const lookup = await getMediaOrError(mediaId);
    if (!lookup.success) {
      return { success: false, error: lookup.error };
    }

    const media = await prisma.$transaction(async (tx) => {
      const updated = await tx.productMedia.update({
        where: { id: mediaId },
        data: { isActive },
        select: mediaSelect,
      });

      if (!isActive && lookup.media.isPrimary) {
        await tx.productMedia.update({
          where: { id: mediaId },
          data: { isPrimary: false },
        });

        const nextPrimary = await tx.productMedia.findFirst({
          where: {
            productColorId: lookup.media.productColorId,
            isActive: true,
            id: { not: mediaId },
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

        return tx.productMedia.findUniqueOrThrow({
          where: { id: mediaId },
          select: mediaSelect,
        });
      }

      if (isActive) {
        const activePrimary = await tx.productMedia.findFirst({
          where: {
            productColorId: lookup.media.productColorId,
            isPrimary: true,
            isActive: true,
          },
          select: { id: true },
        });

        if (!activePrimary) {
          return tx.productMedia.update({
            where: { id: mediaId },
            data: { isPrimary: true },
            select: mediaSelect,
          });
        }
      }

      return updated;
    });

    revalidateProductMediaPaths();
    return { success: true, data: media };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function updateProductMediaAltText(
  mediaId: string,
  altText: string
): Promise<ActionResult<ProductMediaItem>> {
  try {
    await requireMediaManager();

    const lookup = await getMediaOrError(mediaId);
    if (!lookup.success) {
      return { success: false, error: lookup.error };
    }

    const trimmed = altText.trim();
    if (trimmed.length > 255) {
      return { success: false, error: "نص Alt Text طويل جداً (255 حرف كحد أقصى)" };
    }

    const media = await prisma.productMedia.update({
      where: { id: mediaId },
      data: { altText: trimmed || null },
      select: mediaSelect,
    });

    revalidateProductMediaPaths();
    return { success: true, data: media };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function reorderProductMedia(
  productColorId: string,
  orderedMediaIds: string[]
): Promise<ActionResult<ProductMediaItem[]>> {
  try {
    await requireMediaManager();

    if (!productColorId.trim()) {
      return { success: false, error: "معرّف اللون مطلوب" };
    }

    if (!orderedMediaIds.length) {
      return { success: false, error: "ترتيب الصور مطلوب" };
    }

    const existing = await prisma.productMedia.findMany({
      where: { productColorId },
      select: { id: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    if (existing.length !== orderedMediaIds.length) {
      return { success: false, error: "قائمة الصور غير مكتملة" };
    }

    const existingIds = new Set(existing.map((item) => item.id));
    if (orderedMediaIds.some((id) => !existingIds.has(id))) {
      return { success: false, error: "قائمة الصور غير صالحة" };
    }

    const media = await prisma.$transaction(async (tx) => {
      await Promise.all(
        orderedMediaIds.map((id, index) =>
          tx.productMedia.update({
            where: { id },
            data: { sortOrder: index },
          })
        )
      );

      return tx.productMedia.findMany({
        where: { productColorId },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: mediaSelect,
      });
    });

    revalidateProductMediaPaths();
    return { success: true, data: media };
  } catch (error) {
    return handleActionError(error);
  }
}
