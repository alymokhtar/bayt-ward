import { Suspense } from "react";
import Button from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import InventoryVariantsSection from "@/app/(dashboard)/inventory/InventoryVariantsSection";
import InventoryMovementsSection from "@/app/(dashboard)/inventory/InventoryMovementsSection";
import { Search } from "lucide-react";

interface InventoryPageProps {
  searchParams: Promise<{ search?: string; lowStock?: string; page?: string }>;
}

function TableSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-12 rounded-lg bg-brown/5" />
      ))}
    </div>
  );
}

export default async function InventoryPage({
  searchParams,
}: InventoryPageProps) {
  const { search, lowStock, page } = await searchParams;
  const lowStockOnly = lowStock === "true";
  const currentPage = page ? Number(page) : 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brown">المخزون</h1>
      </div>
      <Card>
        <CardContent className="pt-6">
          <form className="flex flex-wrap gap-3 mb-6">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              <input
                name="search"
                defaultValue={search}
                placeholder="بحث..."
                className="w-full h-10 rounded-lg border border-border bg-white ps-10 pe-4 text-sm"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-brown">
              <input
                type="checkbox"
                name="lowStock"
                value="true"
                defaultChecked={lowStockOnly}
                className="rounded"
              />
              مخزون منخفض فقط
            </label>
            <Button type="submit" variant="secondary">
              بحث
            </Button>
          </form>

          <Suspense fallback={<TableSkeleton />}>
            <InventoryVariantsSection
              search={search}
              lowStockOnly={lowStockOnly}
              page={currentPage}
            />
          </Suspense>

          <Suspense fallback={<TableSkeleton />}>
            <InventoryMovementsSection />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
