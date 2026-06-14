import { Suspense } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import ReturnsSection from "@/app/(dashboard)/returns/ReturnsSection";
import TablePageLoading from "@/components/ui/TablePageLoading";

export default function ReturnsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brown">المرتجعات</h1>
        <p className="text-sm text-muted mt-1">معالجة مرتجعات العملاء</p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <Suspense fallback={<TablePageLoading />}>
            <ReturnsSection />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
