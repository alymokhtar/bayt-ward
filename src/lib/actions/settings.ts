"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { getCachedStoreSettings } from "@/lib/cached-queries";
import { getEgyptBusinessDateKey } from "@/lib/business-day";
import { invalidateSettingsData } from "@/lib/revalidate-tags";
import { z } from "zod";

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

function revalidateSettingsPaths() {
  invalidateSettingsData();
}

export async function getSettings() {
  await requireRole(["ADMIN", "MANAGER", "CASHIER"]);

  const settings = await prisma.setting.findMany({
    orderBy: { key: "asc" },
  });

  return settings.reduce(
    (acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    },
    {} as Record<string, string>
  );
}

export async function getStoreSettings() {
  await requireRole(["ADMIN", "MANAGER", "CASHIER"]);
  return getCachedStoreSettings();
}

export async function updateSettings(data: Record<string, string>) {
  try {
    await requireRole(["ADMIN"]);

    if (!data || Object.keys(data).length === 0) {
      return { success: false, error: "لا توجد إعدادات للتحديث" };
    }

    // Validate social URLs (allow empty string or a valid URL)
    const socialSchema = z.object({
      social_facebook_url: z.union([z.string().url(), z.literal("")]).optional(),
      social_instagram_url: z.union([z.string().url(), z.literal("")]).optional(),
      social_tiktok_url: z.union([z.string().url(), z.literal("")]).optional(),
      social_youtube_url: z.union([z.string().url(), z.literal("")]).optional(),
      social_snapchat_url: z.union([z.string().url(), z.literal("")]).optional(),
      social_x_url: z.union([z.string().url(), z.literal("")]).optional(),
    });

    try {
      socialSchema.parse({
        social_facebook_url: data.social_facebook_url,
        social_instagram_url: data.social_instagram_url,
        social_tiktok_url: data.social_tiktok_url,
        social_youtube_url: data.social_youtube_url,
        social_snapchat_url: data.social_snapchat_url,
        social_x_url: data.social_x_url,
      });
    } catch (err) {
      if (err instanceof Error) return { success: false, error: err.message };
      return { success: false, error: "قيمة رابط غير صحيحة" };
    }

    // Auto-set daily discount date when activated
    if (data.daily_discount_active === "1") {
      data.daily_discount_date = getEgyptBusinessDateKey();
    }

    await prisma.$transaction(
      Object.entries(data).map(([key, value]) =>
        prisma.setting.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) },
        })
      )
    );

    revalidateSettingsPaths();
    return { success: true, data: undefined };
  } catch (error) {
    return handleActionError(error);
  }
}
