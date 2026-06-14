"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import type { ExpenseCategory } from "@prisma/client";
import { invalidateExpensesData } from "@/lib/revalidate-tags";
import { getCachedExpensesList } from "@/lib/cached-queries";

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

function revalidateExpensePaths() {
  invalidateExpensesData();
}

export async function getExpenses(options?: {
  category?: ExpenseCategory;
  from?: Date;
  to?: Date;
  limit?: number;
}) {
  await requireRole(["ADMIN", "MANAGER"]);
  return getCachedExpensesList(
    JSON.stringify({
      category: options?.category,
      from: options?.from?.toISOString(),
      to: options?.to?.toISOString(),
      limit: options?.limit,
    })
  );
}

export async function createExpense(data: {
  title: string;
  amount: number;
  category?: ExpenseCategory;
  description?: string;
  expenseDate?: Date;
}) {
  try {
    const user = await requireRole(["ADMIN", "MANAGER"]);

    if (!data.title?.trim()) {
      return { success: false, error: "عنوان المصروف مطلوب" };
    }

    if (!data.amount || data.amount <= 0) {
      return { success: false, error: "المبلغ يجب أن يكون أكبر من صفر" };
    }

    const expense = await prisma.expense.create({
      data: {
        title: data.title.trim(),
        amount: data.amount,
        category: data.category ?? "OTHER",
        description: data.description?.trim(),
        expenseDate: data.expenseDate ?? new Date(),
        userId: user.id,
      },
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    revalidateExpensePaths();
    return { success: true, data: expense };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function deleteExpense(id: string) {
  try {
    await requireRole(["ADMIN", "MANAGER"]);

    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: "المصروف غير موجود" };
    }

    await prisma.expense.delete({ where: { id } });

    revalidateExpensePaths();
    return { success: true, data: undefined };
  } catch (error) {
    return handleActionError(error);
  }
}
