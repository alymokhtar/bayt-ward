import { Card, CardContent } from "@/components/ui/Card";
import { getPromotionFormOptions, getPromotions } from "./actions";
import PromotionsClient from "./components/PromotionsClient";

export default async function PromotionsPage() {
  const [promotions, options] = await Promise.all([
    getPromotions(),
    getPromotionFormOptions(),
  ]);

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-brown">العروض والخصومات</h1>
        <p className="mt-1 text-sm text-muted">إنشاء العروض ومتابعة صلاحيتها</p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <PromotionsClient promotions={promotions} options={options} />
        </CardContent>
      </Card>
    </div>
  );
}