import { prisma } from "@/lib/prisma";
import type { Promotion } from "@/lib/promotions";

export async function getActivePromotionsData(now = new Date()): Promise<Promotion[]> {
  return prisma.promotion.findMany({
    where: {
      isActive: true,
      AND: [
        { OR: [{ startDate: null }, { startDate: { lte: now } }] },
        { OR: [{ endDate: null }, { endDate: { gte: now } }] },
      ],
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      type: true,
      isActive: true,
      buyQuantity: true,
      getQuantity: true,
      discountPercent: true,
      discountAmount: true,
      minOrderAmount: true,
      startDate: true,
      endDate: true,
      categories: { select: { id: true } },
      products: { select: { id: true } },
    },
  });
}