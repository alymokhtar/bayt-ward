import PurchasesClient from "@/app/(dashboard)/purchases/PurchasesClient";
import { Card, CardContent } from "@/components/ui/Card";
import { getPurchases } from "@/lib/actions/purchases";
import { getSuppliers } from "@/lib/actions/suppliers";

export default async function PurchasesPage() {
  const [purchases, suppliers] = await Promise.all([
    getPurchases(),
    getSuppliers(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brown">المشتريات</h1>
        <p className="text-sm text-muted mt-1">أوامر الشراء واستلام البضائع</p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <PurchasesClient
            purchases={purchases}
            suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
