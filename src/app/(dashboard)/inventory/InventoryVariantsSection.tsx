import PaginationNav from "@/components/ui/PaginationNav";
import InventoryVariantsClient from "@/app/(dashboard)/inventory/InventoryVariantsClient";
import { getInventory } from "@/lib/actions/inventory";

interface InventoryVariantsSectionProps {
  search?: string;
  lowStockOnly?: boolean;
  page?: number;
}

export default async function InventoryVariantsSection({
  search,
  lowStockOnly = false,
  page = 1,
}: InventoryVariantsSectionProps) {
  const result = await getInventory({ search, lowStockOnly, page });

  return (
    <>
      <p className="text-sm text-muted mb-4">
        {result.total} متغير · مراقبة مستويات المخزون
      </p>
      <InventoryVariantsClient variants={result.items} />
      <PaginationNav
        page={result.page}
        totalPages={result.totalPages}
        basePath="/inventory"
        searchParams={{
          search,
          lowStock: lowStockOnly ? "true" : undefined,
        }}
      />
    </>
  );
}
