"use server";

import { requireAuth } from "@/lib/auth";
import { getCachedDashboardStats } from "@/lib/cached-queries";

function handleError(error: unknown): never {
  if (error instanceof Error) {
    if (error.message === "UNAUTHORIZED") {
      throw new Error("يجب تسجيل الدخول أولاً");
    }
    throw error;
  }
  throw new Error("حدث خطأ غير متوقع");
}

export async function getDashboardStats() {
  try {
    await requireAuth();
    return getCachedDashboardStats();
  } catch (error) {
    handleError(error);
  }
}
