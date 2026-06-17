"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { invalidateSuppliersData } from "@/lib/revalidate-tags";
import { getCachedSuppliersList } from "@/lib/cached-queries";

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
  invalidateSuppliersData();
}

export async function getSuppliers(includeInactive = false) {
  await requireRole(["ADMIN", "MANAGER"]);
  return getCachedSuppliersList(JSON.stringify({ includeInactive }));
}

export async function getSupplierDetails(supplierId: string) {
  await requireRole(["ADMIN", "MANAGER"]);

  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
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
      purchases: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          invoiceNumber: true,
          totalAmount: true,
          subtotal: true,
          status: true,
          notes: true,
          createdAt: true,
          receivedAt: true,
          user: { select: { name: true } },
          _count: { select: { items: true } },
          items: {
            select: {
              quantity: true,
              unitCost: true,
              totalCost: true,
              variant: {
                select: {
                  sku: true,
                  size: true,
                  color: true,
                  product: { select: { name: true, nameAr: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!supplier) {
    throw new Error("المورد غير موجود");
  }

  const activePurchases = supplier.purchases.filter(
    (p) => p.status !== "CANCELLED"
  );
  const totalPurchaseAmount = activePurchases.reduce(
    (sum, p) => sum + p.totalAmount,
    0
  );
  const lastPurchase = activePurchases[0] ?? null;

  return {
    ...supplier,
    summary: {
      purchaseCount: activePurchases.length,
      totalPurchaseAmount,
      lastPurchaseAmount: lastPurchase?.totalAmount ?? null,
      lastPurchaseAt: lastPurchase?.createdAt ?? null,
    },
  };
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
