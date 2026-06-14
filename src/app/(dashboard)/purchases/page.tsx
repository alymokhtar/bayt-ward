import { Suspense } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import PurchasesSection from "@/app/(dashboard)/purchases/PurchasesSection";
import TablePageLoading from "@/components/ui/TablePageLoading";

export default function PurchasesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brown">المشتريات</h1>
        <p className="text-sm text-muted mt-1">أوامر الشراء واستلام البضائع</p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <Suspense fallback={<TablePageLoading />}>
            <PurchasesSection />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
