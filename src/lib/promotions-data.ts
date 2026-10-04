import { prisma } from "@/lib/prisma";
import type { Promotion } from "@/lib/promotions";
import { getPromotionDateRangeBounds } from "@/lib/promotions";

export async function getActivePromotionsData(now = new Date()): Promise<Promotion[]> {
  const { dayStart, dayEnd } = getPromotionDateRangeBounds(now);

  return prisma.promotion.findMany({
    where: {
      isActive: true,
      AND: [
        { OR: [{ startDate: null }, { startDate: { lte: dayEnd } }] },
        { OR: [{ endDate: null }, { endDate: { gte: dayStart } }] },
      ],
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      type: true,
      isActive: true,
      isStoreOnly: true,
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