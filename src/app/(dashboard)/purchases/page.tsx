import { Suspense } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import PurchasesSection from "@/app/(dashboard)/purchases/PurchasesSection";
import TablePageLoading from "@/components/ui/TablePageLoading";

interface PurchasesPageProps {
  searchParams: Promise<{
    page?: string;
    status?: string;
  }>;
}

export default async function PurchasesPage({
  searchParams,
}: PurchasesPageProps) {
  const params = await searchParams;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brown">المشتريات</h1>
        <p className="text-sm text-muted mt-1">أوامر الشراء وإضافة البضائع للمخزون</p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <Suspense fallback={<TablePageLoading />}>
            <PurchasesSection
              page={params.page ? Number(params.page) : 1}
              status={params.status}
            />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
