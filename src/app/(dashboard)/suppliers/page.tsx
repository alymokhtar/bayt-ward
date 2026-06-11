import SuppliersClient from "@/app/(dashboard)/suppliers/SuppliersClient";
import { Card, CardContent } from "@/components/ui/Card";
import { getSuppliers } from "@/lib/actions/suppliers";

export default async function SuppliersPage() {
  const suppliers = await getSuppliers(true);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brown">الموردين</h1>
        <p className="text-sm text-muted mt-1">إدارة موردي المنتجات</p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <SuppliersClient suppliers={suppliers} />
        </CardContent>
      </Card>
    </div>
  );
}
