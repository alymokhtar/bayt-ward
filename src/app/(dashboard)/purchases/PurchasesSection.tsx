import PurchasesClient from "@/app/(dashboard)/purchases/PurchasesClient";
import { getPurchases } from "@/lib/actions/purchases";
import { getSuppliers } from "@/lib/actions/suppliers";

export default async function PurchasesSection() {
  const [purchases, suppliers] = await Promise.all([
    getPurchases(),
    getSuppliers(),
  ]);

  return (
    <PurchasesClient
      purchases={purchases}
      suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
    />
  );
}
