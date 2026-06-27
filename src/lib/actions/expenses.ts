"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import type { ExpenseCategory, PaymentMethod } from "@prisma/client";
import { invalidateExpensesData } from "@/lib/revalidate-tags";
import { getCachedExpensesList } from "@/lib/cached-queries";
import { sendTelegramMessage } from "@/lib/telegram";
import { formatCurrency, formatDateTime } from "@/lib/utils";

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

function buildExpenseTelegramMessage(expense: {
  title: string;
  amount: number;
  category: ExpenseCategory;
  description: string | null;
  user?: { name: string } | null;
}) {
  const dateTime = formatDateTime(new Date());

  return [
    "💰 مصروف جديد",
    "",
    `نوع المصروف: ${
      {
        RENT: "إيجار",
        UTILITIES: "مرافق",
        SALARIES: "رواتب",
        MARKETING: "تسويق",
        SUPPLIES: "مستلزمات",
        MAINTENANCE: "صيانة",
        OTHER: "أخرى",
      }[expense.category] || expense.category
    }`,
    `المبلغ: ${formatCurrency(expense.amount)}`,
    `الوصف: ${expense.description || expense.title}`,
    `اسم المستخدم: ${expense.user?.name || "—"}`,
    `التاريخ والوقت: ${dateTime}`,
  ].join("\n");
}

export async function getExpenses(options?: {
  category?: ExpenseCategory;
  from?: string;
  to?: string;
  limit?: number;
}) {
  await requireRole(["ADMIN", "MANAGER", "CASHIER"]);
  return getCachedExpensesList(
    JSON.stringify({
      category: options?.category,
      from: options?.from,
      to: options?.to,
      limit: options?.limit,
    })
  );
}

export async function getExpense(id: string) {
  await requireRole(["ADMIN", "MANAGER", "CASHIER"]);

  const expense = await prisma.expense.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true } },
      employee: { select: { id: true, name: true } },
      adjustments: {
        select: {
          id: true,
          type: true,
          amount: true,
          title: true,
          notes: true,
          adjustmentDate: true,
        },
        orderBy: { adjustmentDate: "desc" },
      },
    },
  });

  if (!expense) {
    throw new Error("المصروف غير موجود");
  }

  return expense;
}

export async function createExpense(data: {
  title: string;
  amount: number;
  category?: ExpenseCategory;
  description?: string;
  expenseDate?: Date;
  employeeId?: string;
  paymentMethod?: PaymentMethod;
}) {
  try {
    const user = await requireRole(["ADMIN", "MANAGER", "CASHIER"]);

    if (!data.title?.trim()) {
      return { success: false, error: "عنوان المصروف مطلوب" };
    }

    if (!data.amount || data.amount <= 0) {
      return { success: false, error: "المبلغ يجب أن يكون أكبر من صفر" };
    }

    if (data.category === "SALARIES") {
      if (!data.employeeId) {
        return { success: false, error: "يجب اختيار الموظف لمصروف الراتب" };
      }

      const employee = await prisma.user.findUnique({
        where: { id: data.employeeId },
        select: {
          id: true,
          name: true,
          salary: true,
          isActive: true,
          employeeAdjustments: {
            where: { settled: false },
            select: { id: true, amount: true },
          },
        },
      });

      if (!employee || !employee.isActive) {
        return { success: false, error: "الموظف غير موجود" };
      }

      const deductionsTotal = employee.employeeAdjustments.reduce(
        (sum, item) => sum + item.amount,
        0
      );
      const expectedNet = Math.max(0, employee.salary - deductionsTotal);

      if (Math.abs(data.amount - expectedNet) > 0.01) {
        return {
          success: false,
          error: `صافي الراتب المتوقع هو ${expectedNet.toFixed(2)} ج.م`,
        };
      }

      const expense = await prisma.$transaction(async (tx) => {
        const created = await tx.expense.create({
          data: {
            title: data.title.trim(),
            amount: data.amount,
            category: "SALARIES",
            description: data.description?.trim(),
            expenseDate: data.expenseDate ?? new Date(),
            userId: user.id,
            employeeId: employee.id,
            baseSalary: employee.salary,
            deductionsTotal,
            paymentMethod: data.paymentMethod ?? "CASH",
          },
          include: {
            user: { select: { id: true, name: true } },
            employee: { select: { id: true, name: true } },
          },
        });

        if (employee.employeeAdjustments.length > 0) {
          await tx.employeeAdjustment.updateMany({
            where: {
              id: { in: employee.employeeAdjustments.map((a) => a.id) },
            },
            data: {
              settled: true,
              settledAt: new Date(),
              expenseId: created.id,
            },
          });
        }

        return created;
      });

      revalidateExpensePaths();
      void sendTelegramMessage(buildExpenseTelegramMessage(expense));
      return { success: true, data: expense };
    }

    const expense = await prisma.expense.create({
      data: {
        title: data.title.trim(),
        amount: data.amount,
        category: data.category ?? "OTHER",
        description: data.description?.trim(),
        expenseDate: data.expenseDate ?? new Date(),
        userId: user.id,
        paymentMethod: data.paymentMethod ?? "CASH",
      },
      include: {
        user: { select: { id: true, name: true } },
        employee: { select: { id: true, name: true } },
      },
    });

    revalidateExpensePaths();
    void sendTelegramMessage(buildExpenseTelegramMessage(expense));
    return { success: true, data: expense };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function deleteExpense(id: string) {
  try {
    await requireRole(["ADMIN", "MANAGER", "CASHIER"]);

    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: "المصروف غير موجود" };
    }

    await prisma.$transaction(async (tx) => {
      await tx.employeeAdjustment.updateMany({
        where: { expenseId: id },
        data: { settled: false, settledAt: null, expenseId: null },
      });
      await tx.expense.delete({ where: { id } });
    });

    revalidateExpensePaths();
    return { success: true, data: undefined };
  } catch (error) {
    return handleActionError(error);
  }
}
