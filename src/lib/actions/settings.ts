"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { getCachedStoreSettings } from "@/lib/cached-queries";
import { invalidateSettingsData } from "@/lib/revalidate-tags";

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
  await requireRole(["ADMIN"]);

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
