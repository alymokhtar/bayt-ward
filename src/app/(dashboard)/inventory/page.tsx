import InventoryClient from "@/app/(dashboard)/inventory/InventoryClient";
import { Card, CardContent } from "@/components/ui/Card";
import { getInventory, getStockMovements } from "@/lib/actions/inventory";

interface InventoryPageProps {
  searchParams: Promise<{ search?: string; lowStock?: string }>;
}

export default async function InventoryPage({
  searchParams,
}: InventoryPageProps) {
  const { search, lowStock } = await searchParams;
  const lowStockOnly = lowStock === "true";

  const [variants, movements] = await Promise.all([
    getInventory({ search, lowStockOnly }),
    getStockMovements({ limit: 50 }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brown">المخزون</h1>
        <p className="text-sm text-muted mt-1">
          {variants.length} متغير · مراقبة مستويات المخزون
        </p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <InventoryClient
            variants={variants}
            movements={movements}
            initialSearch={search}
            lowStockOnly={lowStockOnly}
          />
        </CardContent>
      </Card>
    </div>
  );
}
