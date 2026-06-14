"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, hashPassword } from "@/lib/auth";
import type { UserRole } from "@prisma/client";

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
  revalidatePath("/employees");
}

const userSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function getEmployees() {
  await requireRole(["ADMIN"]);

  return prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: userSelect,
  });
}

export async function createEmployee(data: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role?: UserRole;
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
