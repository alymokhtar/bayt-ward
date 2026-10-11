"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole } from "@/lib/auth";
import { Prisma } from "@prisma/client";
import { getCachedCustomersPage } from "@/lib/cached-queries";
import { invalidateCustomersData } from "@/lib/revalidate-tags";
import { randomBytes } from "node:crypto";
import {
  DEFAULT_LOYALTY_COUPON_THRESHOLD,
  getLoyaltyCouponEligibility,
  LOYALTY_COUPON_DISCOUNT_AMOUNT,
  LOYALTY_COUPON_EXPIRY_DAYS,
} from "@/lib/loyalty-coupon-utils";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

type IssueLoyaltyCouponResult =
  | {
      success: true;
      data: {
        code: string;
        discountAmount: number | null;
        expiresAt: string;
        customerName: string;
        customerPhone: string;
        totalSpent: number;
      };
    }
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
  await requireRole(["ADMIN", "MANAGER"]);

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          sales: { where: { status: { not: "CANCELLED" } } },
        },
      },
      sales: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          _count: { select: { items: true } },
          items: {
            select: {
              quantity: true,
              unitPrice: true,
              totalPrice: true,
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
    customThreshold?: number | null;
  }
) {
  try {
    await requireRole(["ADMIN", "MANAGER"]);

    if (
      data.customThreshold !== undefined &&
      data.customThreshold !== null &&
      (!Number.isFinite(data.customThreshold) ||
        data.customThreshold <= DEFAULT_LOYALTY_COUPON_THRESHOLD)
    ) {
      return {
        success: false,
        error: `الحد المخصص يجب أن يكون أكبر من ${DEFAULT_LOYALTY_COUPON_THRESHOLD.toLocaleString("ar-EG")} ج.م`,
      };
    }

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
        customThreshold: data.customThreshold,
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

    await prisma.$transaction(
      async (tx) => {
        const existing = await tx.customer.findUnique({
          where: { id },
          include: { _count: { select: { sales: true, returns: true } } },
        });

        if (!existing) {
          throw new Error("العميل غير موجود");
        }

        if (existing._count.sales > 0 || existing._count.returns > 0) {
          throw new Error("لا يمكن حذف عميل لديه مبيعات أو مرتجعات مرتبطة");
        }

        await tx.customer.delete({ where: { id } });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    revalidateCustomerPaths();
    return { success: true, data: undefined };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2003" || error.code === "P2034")
    ) {
      return {
        success: false,
        error: "لا يمكن حذف العميل لارتباطه بسجل مبيعات أو مرتجعات. حدّث الصفحة وحاول مجددًا.",
      };
    }
    return handleActionError(error);
  }
}

export async function issueLoyaltyCoupon(
  customerId: string
): Promise<IssueLoyaltyCouponResult> {
  try {
    await requireRole(["ADMIN", "MANAGER"]);
    if (typeof customerId !== "string" || !customerId.trim()) {
      return { success: false, error: "معرّف العميل غير صالح" };
    }

    const couponData = await prisma.$transaction(
      async (tx) => {
        const customer = await tx.customer.findUnique({
          where: { id: customerId },
          select: {
            id: true,
            name: true,
            phone: true,
            totalSpent: true,
            customThreshold: true,
            loyaltyMilestones: {
              orderBy: { level: "desc" },
              take: 1,
              select: { level: true },
            },
          },
        });

        if (!customer) {
          throw new Error("العميل غير موجود");
        }

        const lastIssuedLevel = customer.loyaltyMilestones[0]?.level ?? 0;
        const eligibility = getLoyaltyCouponEligibility({
          totalSpent: customer.totalSpent,
          customThreshold: customer.customThreshold,
          lastIssuedLevel,
        });

        if (!eligibility.eligible) {
          throw new Error("العميل غير مؤهل لكوبون ولاء جديد");
        }

        const expiresAt = new Date(
          Date.now() + LOYALTY_COUPON_EXPIRY_DAYS * 24 * 60 * 60 * 1000
        );
        const code = `BW-${randomBytes(8).toString("hex").toUpperCase()}`;
        const coupon = await tx.coupon.create({
          data: {
            code,
            customerId: customer.id,
            type: "FIXED_AMOUNT",
            discountAmount: LOYALTY_COUPON_DISCOUNT_AMOUNT,
            minOrderAmount: null,
            usageLimit: 1,
            expiresAt,
            isActive: true,
            stackable: false,
          },
          select: { id: true, code: true, discountAmount: true, expiresAt: true },
        });

        await tx.customerLoyaltyMilestone.create({
          data: {
            customerId: customer.id,
            level: eligibility.nextLevel,
            thresholdAmount: eligibility.nextThreshold,
            couponId: coupon.id,
          },
        });

        return {
          code: coupon.code,
          discountAmount: coupon.discountAmount,
          expiresAt: expiresAt.toISOString(),
          customerName: customer.name,
          customerPhone: customer.phone,
          totalSpent: customer.totalSpent,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    revalidateCustomerPaths();
    return { success: true, data: couponData };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        success: false,
        error: "تعارض إصدار الكوبون؛ حدّث الصفحة للتحقق من الأهلية وحاول مجدداً.",
      };
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      return {
        success: false,
        error: "تغيرت أهلية العميل بالتزامن مع الإصدار. حدّث الصفحة وحاول مجدداً.",
      };
    }
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
        { name: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
        { email: { contains: q, mode: "insensitive" } },
      ],
    },
    take: 10,
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      phone: true,
    },
  });
}
