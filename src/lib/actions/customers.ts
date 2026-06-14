"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole } from "@/lib/auth";
import { getCachedCustomersPage } from "@/lib/cached-queries";
import { invalidateCustomersData } from "@/lib/revalidate-tags";

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
      return { success: false, error: "رقم الهاتف مستخدم بالفعل" };
    }
    return { success: false, error: error.message };
  }
  return { success: false, error: "حدث خطأ غير متوقع" };
}

function revalidateCustomerPaths() {
  invalidateCustomersData();
}

export async function getCustomers(options?: {
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  await requireAuth();
  return getCachedCustomersPage(JSON.stringify(options ?? {}));
}

export async function getCustomer(id: string) {
  await requireAuth();

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      sales: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { _count: { select: { items: true } } },
      },
      returns: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!customer) {
    throw new Error("العميل غير موجود");
  }

  return customer;
}

export async function createCustomer(data: {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
}) {
  try {
    await requireAuth();

    if (!data.name?.trim()) {
      return { success: false, error: "اسم العميل مطلوب" };
    }

    if (!data.phone?.trim()) {
      return { success: false, error: "رقم الهاتف مطلوب" };
    }

    const customer = await prisma.customer.create({
      data: {
        name: data.name.trim(),
        phone: data.phone.trim(),
        email: data.email?.trim(),
        address: data.address?.trim(),
        notes: data.notes?.trim(),
      },
    });

    revalidateCustomerPaths();
    return { success: true, data: customer };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function updateCustomer(
  id: string,
  data: {
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
    notes?: string;
  }
) {
  try {
    await requireRole(["ADMIN", "MANAGER"]);

    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: "العميل غير موجود" };
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        name: data.name?.trim(),
        phone: data.phone?.trim(),
        email: data.email?.trim(),
        address: data.address?.trim(),
        notes: data.notes?.trim(),
      },
    });

    revalidateCustomerPaths();
    return { success: true, data: customer };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function deleteCustomer(id: string) {
  try {
    await requireRole(["ADMIN", "MANAGER"]);

    const existing = await prisma.customer.findUnique({
      where: { id },
      include: { _count: { select: { sales: true, returns: true } } },
    });

    if (!existing) {
      return { success: false, error: "العميل غير موجود" };
    }

    if (existing._count.sales > 0 || existing._count.returns > 0) {
      return {
        success: false,
        error: "لا يمكن حذف عميل لديه مبيعات أو مرتجعات",
      };
    }

    await prisma.customer.delete({ where: { id } });

    revalidateCustomerPaths();
    return { success: true, data: undefined };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function searchCustomers(query: string) {
  await requireAuth();

  const q = query?.trim();
  if (!q) return [];

  return prisma.customer.findMany({
    where: {
      OR: [
        { name: { contains: q } },
        { phone: { contains: q } },
        { email: { contains: q } },
      ],
    },
    take: 10,
    orderBy: { name: "asc" },
  });
}
