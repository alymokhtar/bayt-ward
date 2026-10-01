"use server";

import { getActivePromotionsData } from "@/lib/promotions-data";
import type { Promotion } from "@/lib/promotions";

export async function getActivePromotions(): Promise<Promotion[]> {
  return getActivePromotionsData();
}