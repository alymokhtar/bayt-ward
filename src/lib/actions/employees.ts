"use server";

import { prisma } from "@/lib/prisma";
import { requireRole, hashPassword } from "@/lib/auth";
import type { EmployeeAdjustmentType, UserRole } from "@prisma/client";
import { invalidateEmployeesData } from "@/lib/revalidate-tags";

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
    if (error.message.includes("Unique constraint")) {
      return { success: false, error: "البريد الإلكتروني مستخدم بالفعل" };
    }
    return { success: false, error: error.message };
  }
  return { success: false, error: "حدث خطأ غير متوقع" };
}

function revalidateEmployeePaths() {
  invalidateEmployeesData();
}

const userSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  salary: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function getEmployees() {
  await requireRole(["ADMIN"]);

  const employees = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      ...userSelect,
      employeeAdjustments: {
        where: { settled: false },
        select: { amount: true },
      },
    },
  });

  return employees.map(({ employeeAdjustments, ...employee }) => ({
    ...employee,
    pendingDeductions: employeeAdjustments.reduce((sum, a) => sum + a.amount, 0),
  }));
}

export async function getPayrollEmployees() {
  await requireRole(["ADMIN", "MANAGER"]);

  return prisma.user.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, salary: true, role: true },
  });
}

export async function getEmployeePayrollSummary(employeeId: string) {
  await requireRole(["ADMIN", "MANAGER"]);

  const employee = await prisma.user.findUnique({
    where: { id: employeeId },
    select: {
      id: true,
      name: true,
      salary: true,
      isActive: true,
      employeeAdjustments: {
        where: { settled: false },
        orderBy: { adjustmentDate: "desc" },
        select: {
          id: true,
          type: true,
          amount: true,
          title: true,
          notes: true,
          adjustmentDate: true,
        },
      },
    },
  });

  if (!employee) {
    throw new Error("الموظف غير موجود");
  }

  const totalDeductions = employee.employeeAdjustments.reduce(
    (sum, item) => sum + item.amount,
    0
  );

  return {
    employee: {
      id: employee.id,
      name: employee.name,
      salary: employee.salary,
      isActive: employee.isActive,
    },
    pendingAdjustments: employee.employeeAdjustments,
    totalDeductions,
    netSalary: Math.max(0, employee.salary - totalDeductions),
  };
}

export async function createEmployee(data: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role?: UserRole;
  salary?: number;
}) {
  try {
    await requireRole(["ADMIN"]);

    if (!data.name?.trim()) {
      return { success: false, error: "اسم الموظف مطلوب" };
    }

    if (!data.email?.trim()) {
      return { success: false, error: "البريد الإلكتروني مطلوب" };
    }

    if (!data.password || data.password.length < 6) {
      return { success: false, error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" };
    }

    const hashedPassword = await hashPassword(data.password);

    const employee = await prisma.user.create({
      data: {
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        password: hashedPassword,
        phone: data.phone?.trim(),
        role: data.role ?? "CASHIER",
        salary: data.salary ?? 0,
      },
      select: userSelect,
    });

    revalidateEmployeePaths();
    return { success: true, data: employee };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function updateEmployee(
  id: string,
  data: {
    name?: string;
    email?: string;
    password?: string;
    phone?: string;
    role?: UserRole;
    salary?: number;
    isActive?: boolean;
  }
) {
  try {
    const session = await requireRole(["ADMIN"]);

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: "الموظف غير موجود" };
    }

    if (session.id === id && data.isActive === false) {
      return { success: false, error: "لا يمكن تعطيل حسابك الحالي" };
    }

    const updateData: Record<string, unknown> = {
      name: data.name?.trim(),
      email: data.email?.trim().toLowerCase(),
      phone: data.phone?.trim(),
      role: data.role,
      isActive: data.isActive,
    };

    if (data.salary !== undefined) {
      updateData.salary = Math.max(0, data.salary);
    }

    if (data.password) {
      if (data.password.length < 6) {
        return { success: false, error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" };
      }
      updateData.password = await hashPassword(data.password);
    }

    const employee = await prisma.user.update({
      where: { id },
      data: updateData,
      select: userSelect,
    });

    revalidateEmployeePaths();
    return { success: true, data: employee };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function addEmployeeAdjustment(data: {
  userId: string;
  type: EmployeeAdjustmentType;
  amount: number;
  title?: string;
  notes?: string;
  adjustmentDate?: Date;
}) {
  try {
    const admin = await requireRole(["ADMIN"]);

    if (!data.userId) {
      return { success: false, error: "الموظف مطلوب" };
    }

    if (!data.amount || data.amount <= 0) {
      return { success: false, error: "المبلغ يجب أن يكون أكبر من صفر" };
    }

    const employee = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { id: true, isActive: true },
    });

    if (!employee || !employee.isActive) {
      return { success: false, error: "الموظف غير موجود" };
    }

    const adjustment = await prisma.employeeAdjustment.create({
      data: {
        userId: data.userId,
        createdById: admin.id,
        type: data.type,
        amount: data.amount,
        title: data.title?.trim(),
        notes: data.notes?.trim(),
        adjustmentDate: data.adjustmentDate ?? new Date(),
      },
    });

    revalidateEmployeePaths();
    return { success: true, data: adjustment };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function deleteEmployeeAdjustment(id: string) {
  try {
    await requireRole(["ADMIN"]);

    const existing = await prisma.employeeAdjustment.findUnique({
      where: { id },
    });

    if (!existing) {
      return { success: false, error: "السجل غير موجود" };
    }

    if (existing.settled) {
      return { success: false, error: "لا يمكن حذف سجل مرتبط بصرف راتب" };
    }

    await prisma.employeeAdjustment.delete({ where: { id } });

    revalidateEmployeePaths();
    return { success: true, data: undefined };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function deleteEmployee(id: string) {
  try {
    const session = await requireRole(["ADMIN"]);

    if (session.id === id) {
      return { success: false, error: "لا يمكن حذف حسابك الحالي" };
    }

    const existing = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            sales: true,
            purchases: true,
            returns: true,
            expenses: true,
          },
        },
      },
    });

    if (!existing) {
      return { success: false, error: "الموظف غير موجود" };
    }

    const hasActivity =
      existing._count.sales > 0 ||
      existing._count.purchases > 0 ||
      existing._count.returns > 0 ||
      existing._count.expenses > 0;

    if (hasActivity) {
      await prisma.user.update({
        where: { id },
        data: { isActive: false },
      });
    } else {
      await prisma.user.delete({ where: { id } });
    }

    revalidateEmployeePaths();
    return { success: true, data: undefined };
  } catch (error) {
    return handleActionError(error);
  }
}
