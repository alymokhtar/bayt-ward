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

function findExpenseByIdempotencyKey(idempotencyKey: string) {
  return prisma.expense.findUnique({
    where: { idempotencyKey },
    include: {
      user: { select: { id: true, name: true } },
      employee: { select: { id: true, name: true } },
    },
  });
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
  page?: number;
  pageSize?: number;
}) {
  await requireRole(["ADMIN", "MANAGER", "CASHIER"]);
  const page = Math.max(1, Math.trunc(options?.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Math.trunc(options?.pageSize ?? 50)));
  return getCachedExpensesList(
    JSON.stringify({
      category: options?.category,
      from: options?.from,
      to: options?.to,
      page,
      pageSize,
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
  idempotencyKey?: string;
}) {
  let userId: string | undefined;
  let idempotencyKey: string | undefined;
  try {
    const user = await requireRole(["ADMIN", "MANAGER", "CASHIER"]);
    userId = user.id;
    idempotencyKey = data.idempotencyKey;

    if (
      idempotencyKey !== undefined &&
      (typeof idempotencyKey !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          idempotencyKey
        ))
    ) {
      return { success: false, error: "معرّف عملية المصروف غير صالح" };
    }

    if (idempotencyKey) {
      const existingExpense = await findExpenseByIdempotencyKey(idempotencyKey);
      if (existingExpense) {
        if (existingExpense.userId !== user.id) {
          return { success: false, error: "معرّف العملية مستخدم مسبقاً" };
        }
        return { success: true, data: existingExpense };
      }
    }

    if (!data.title?.trim()) {
      return { success: false, error: "عنوان المصروف مطلوب" };
    }

    if (!Number.isFinite(data.amount) || data.amount <= 0) {
      return { success: false, error: "المبلغ يجب أن يكون أكبر من صفر" };
    }

    const expense = await prisma.$transaction(async (tx) => {
      let employee:
        | {
            id: string;
            salary: number;
            isActive: boolean;
            employeeAdjustments: { id: string; amount: number }[];
          }
        | null = null;
      let deductionsTotal = 0;

      if (data.category === "SALARIES") {
        if (!data.employeeId) {
          throw new Error("يجب اختيار الموظف لمصروف الراتب");
        }

        employee = await tx.user.findUnique({
          where: { id: data.employeeId },
          select: {
            id: true,
            salary: true,
            isActive: true,
            employeeAdjustments: {
              where: { settled: false },
              select: { id: true, amount: true },
            },
          },
        });

        if (!employee || !employee.isActive) {
          throw new Error("الموظف غير موجود");
        }

        deductionsTotal = employee.employeeAdjustments.reduce(
          (sum, item) => sum + item.amount,
          0
        );
        const expectedNet = employee.salary - deductionsTotal;
        if (Math.abs(data.amount - expectedNet) > 0.01) {
          throw new Error(
            `صافي الراتب المتوقع هو ${expectedNet.toFixed(2)} ج.م`
          );
        }

        if (employee.employeeAdjustments.length > 0) {
          const claimed = await tx.employeeAdjustment.updateMany({
            where: {
              id: { in: employee.employeeAdjustments.map((item) => item.id) },
              userId: employee.id,
              settled: false,
            },
            data: {
              settled: true,
              settledAt: new Date(),
            },
          });

          if (claimed.count !== employee.employeeAdjustments.length) {
            throw new Error(
              "تغيرت الاستقطاعات أثناء تسجيل الراتب. أعد تحميل البيانات وحاول مرة أخرى"
            );
          }
        }
      }

      const created = await tx.expense.create({
        data: {
          title: data.title.trim(),
          amount: data.amount,
          category: data.category ?? "OTHER",
          description: data.description?.trim(),
          expenseDate: data.expenseDate ?? new Date(),
          userId: user.id,
          employeeId: employee?.id,
          baseSalary: employee?.salary,
          deductionsTotal: employee ? deductionsTotal : undefined,
          paymentMethod: data.paymentMethod ?? "CASH",
          idempotencyKey,
        },
        include: {
          user: { select: { id: true, name: true } },
          employee: { select: { id: true, name: true } },
        },
      });

      if (employee && employee.employeeAdjustments.length > 0) {
        const linked = await tx.employeeAdjustment.updateMany({
          where: {
            id: { in: employee.employeeAdjustments.map((item) => item.id) },
            settled: true,
            expenseId: null,
          },
          data: { expenseId: created.id },
        });
        if (linked.count !== employee.employeeAdjustments.length) {
          throw new Error(
            "تعذر ربط الاستقطاعات بمصروف الراتب. أعد المحاولة"
          );
        }
      }

      return created;
    });

    revalidateExpensePaths();
    void sendTelegramMessage(buildExpenseTelegramMessage(expense));
    return { success: true, data: expense };
  } catch (error) {
    if (idempotencyKey && userId) {
      const existingExpense = await findExpenseByIdempotencyKey(idempotencyKey);
      if (existingExpense?.userId === userId) {
        return { success: true, data: existingExpense };
      }
      if (existingExpense) {
        return { success: false, error: "معرّف العملية مستخدم مسبقاً" };
      }
    }
    return handleActionError(error);
  }
}

export async function deleteExpense(id: string) {
  try {
    await requireRole(["ADMIN"]);

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
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return {
        success: false,
        error: "يقتصر حذف المصروفات على مدير النظام فقط",
      };
    }
    return handleActionError(error);
  }
}
