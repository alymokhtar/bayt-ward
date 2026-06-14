import InventoryClient from "@/app/(dashboard)/inventory/InventoryClient";
import PaginationNav from "@/components/ui/PaginationNav";
import { Card, CardContent } from "@/components/ui/Card";
import { getInventory, getStockMovements } from "@/lib/actions/inventory";

interface InventoryPageProps {
  searchParams: Promise<{ search?: string; lowStock?: string; page?: string }>;
}

export default async function InventoryPage({
  searchParams,
}: InventoryPageProps) {
  const { search, lowStock, page } = await searchParams;
  const lowStockOnly = lowStock === "true";

  const [inventoryResult, movementsResult] = await Promise.all([
    getInventory({
      search,
      lowStockOnly,
      page: page ? Number(page) : 1,
    }),
    getStockMovements({ pageSize: 50 }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brown">المخزون</h1>
        <p className="text-sm text-muted mt-1">
          {inventoryResult.total} متغير · مراقبة مستويات المخزون
        </p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <InventoryClient
            variants={inventoryResult.items}
            movements={movementsResult.items}
            initialSearch={search}
            lowStockOnly={lowStockOnly}
          />
          <PaginationNav
            page={inventoryResult.page}
            totalPages={inventoryResult.totalPages}
            basePath="/inventory"
            searchParams={{
              search,
              lowStock: lowStockOnly ? "true" : undefined,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
