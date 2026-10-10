"use server";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getCustomerLoyaltySummary(customerId: string) {
  await requireRole(["ADMIN", "MANAGER", "CASHIER"]);
  if (!customerId?.trim()) {
    throw new Error("معرّف العميل غير صالح");
  }

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: {
      id: true,
      name: true,
      loyaltyPoints: true,
      loyaltyTransactions: {
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          saleId: true,
          type: true,
          points: true,
          balanceAfter: true,
          reason: true,
          createdAt: true,
          sale: { select: { invoiceNumber: true } },
        },
      },
    },
  });

  if (!customer) {
    throw new Error("العميل غير موجود");
  }

  return customer;
}
