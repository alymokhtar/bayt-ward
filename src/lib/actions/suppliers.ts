"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

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

function revalidateSupplierPaths() {
  revalidatePath("/suppliers");
  revalidatePath("/purchases");
}

export async function getSuppliers(includeInactive = false) {
  await requireRole(["ADMIN", "MANAGER"]);

  return prisma.supplier.findMany({
    where: includeInactive ? undefined : { isActive: true },
    orderBy: { name: "asc" },
    take: 500,
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      address: true,
      notes: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { purchases: true } },
    },
  });
}

export async function createSupplier(data: {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
}) {
  try {
    await requireRole(["ADMIN", "MANAGER"]);

    if (!data.name?.trim()) {
      return { success: false, error: "اسم المورد مطلوب" };
    }

    if (!data.phone?.trim()) {
      return { success: false, error: "رقم الهاتف مطلوب" };
    }

    const supplier = await prisma.supplier.create({
      data: {
        name: data.name.trim(),
        phone: data.phone.trim(),
        email: data.email?.trim(),
        address: data.address?.trim(),
        notes: data.notes?.trim(),
      },
    });

    revalidateSupplierPaths();
    return { success: true, data: supplier };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function updateSupplier(
  id: string,
  data: {
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
    notes?: string;
    isActive?: boolean;
  }
) {
  try {
    await requireRole(["ADMIN", "MANAGER"]);

    const existing = await prisma.supplier.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: "المورد غير موجود" };
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        name: data.name?.trim(),
        phone: data.phone?.trim(),
        email: data.email?.trim(),
        address: data.address?.trim(),
        notes: data.notes?.trim(),
        isActive: data.isActive,
      },
    });

    revalidateSupplierPaths();
    return { success: true, data: supplier };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function deleteSupplier(id: string) {
  try {
    await requireRole(["ADMIN", "MANAGER"]);

    const existing = await prisma.supplier.findUnique({
      where: { id },
      include: { _count: { select: { purchases: true } } },
    });

    if (!existing) {
      return { success: false, error: "المورد غير موجود" };
    }

    if (existing._count.purchases > 0) {
      await prisma.supplier.update({
        where: { id },
        data: { isActive: false },
      });
    } else {
      await prisma.supplier.delete({ where: { id } });
    }

    revalidateSupplierPaths();
    return { success: true, data: undefined };
  } catch (error) {
    return handleActionError(error);
  }
}
