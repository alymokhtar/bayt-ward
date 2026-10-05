import ReturnsClient from "@/app/(dashboard)/returns/ReturnsClient";
import { getReturns } from "@/lib/actions/returns";
import { getActivePromotionsData } from "@/lib/promotions-data";

export default async function ReturnsSection() {
  const [returns, activePromotions] = await Promise.all([
    getReturns(),
    getActivePromotionsData(),
  ]);
  return <ReturnsClient returns={returns} activePromotions={activePromotions} />;
}
