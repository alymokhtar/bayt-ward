import PurchasesClient from "@/app/(dashboard)/purchases/PurchasesClient";
import { getPurchases } from "@/lib/actions/purchases";
import { getSuppliers } from "@/lib/actions/suppliers";

export default async function PurchasesSection({
  page,
  status,
}: {
  page: number;
  status?: string;
}) {
  const [purchases, suppliers] = await Promise.all([
    getPurchases({ page, status }),
    getSuppliers(),
  ]);

  return (
    <PurchasesClient
      purchases={purchases}
      suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
      status={status}
    />
  );
}
