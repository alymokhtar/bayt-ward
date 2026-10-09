import Badge from "@/components/ui/Badge";
import PaginationNav from "@/components/ui/PaginationNav";
import Button from "@/components/ui/Button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { getStockMovements } from "@/lib/actions/inventory";
import { formatCurrency, formatDateTime } from "@/lib/utils";

const movementLabels: Record<string, string> = {
  PURCHASE: "مشتريات",
  SALE: "بيع",
  RETURN: "مرتجع",
  ADJUSTMENT: "تعديل",
  DAMAGE: "تلف",
  TRANSFER: "نقل",
};

const movementTypes = [
  { value: "PURCHASE", label: "مشتريات" },
  { value: "SALE", label: "بيع" },
  { value: "RETURN", label: "مرتجع" },
  { value: "ADJUSTMENT", label: "تعديل" },
  { value: "DAMAGE", label: "تلف" },
  { value: "TRANSFER", label: "نقل" },
] as const;

export default async function InventoryMovementsSection({
  search,
  type,
  page = 1,
  inventorySearch,
  lowStock,
  inventoryPage,
}: {
  search?: string;
  type?: string;
  page?: number;
  inventorySearch?: string;
  lowStock?: string;
  inventoryPage?: string;
}) {
  const validType = movementTypes.find(
    (movementType) => movementType.value === type,
  )?.value;
  const result = await getStockMovements({
    page,
    pageSize: 50,
    search,
    type: validType,
  });
  const preservedParams = {
    search: inventorySearch,
    lowStock,
    page: inventoryPage,
    movementSearch: search,
    movementType: validType,
  };

  return (
    <div id="stock-movements" className="mt-8">
      <h2 className="text-lg font-semibold text-brown mb-4">سجل الحركات</h2>
      <form action="/inventory" method="get" className="mb-4 flex flex-wrap items-end gap-3">
        {inventorySearch && (
          <input type="hidden" name="search" value={inventorySearch} />
        )}
        {lowStock && <input type="hidden" name="lowStock" value={lowStock} />}
        {inventoryPage && <input type="hidden" name="page" value={inventoryPage} />}
        <div className="min-w-[220px] flex-1">
          <label htmlFor="movement-search" className="mb-1 block text-sm font-medium text-brown">
            المنتج أو SKU أو الباركود
          </label>
          <input
            id="movement-search"
            name="movementSearch"
            defaultValue={search}
            maxLength={100}
            className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm"
          />
        </div>
        <div className="min-w-[180px]">
          <label htmlFor="movement-type" className="mb-1 block text-sm font-medium text-brown">
            نوع الحركة
          </label>
          <select
            id="movement-type"
            name="movementType"
            defaultValue={validType ?? ""}
            className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm"
          >
            <option value="">كل الحركات</option>
            {movementTypes.map((movementType) => (
              <option key={movementType.value} value={movementType.value}>
                {movementType.label}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="secondary">تصفية</Button>
        {(search || validType) && (
          <a
            href={`/inventory?${new URLSearchParams({
              ...(inventorySearch ? { search: inventorySearch } : {}),
              ...(lowStock ? { lowStock } : {}),
              ...(inventoryPage ? { page: inventoryPage } : {}),
            }).toString()}#stock-movements`}
            className="inline-flex h-10 items-center rounded-lg border border-border px-4 text-sm hover:bg-brown/5"
          >
            مسح الفلاتر
          </a>
        )}
      </form>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>التاريخ</TableHead>
            <TableHead>المنتج</TableHead>
            <TableHead>النوع</TableHead>
            <TableHead>الكمية</TableHead>
            <TableHead>قبل</TableHead>
            <TableHead>بعد</TableHead>
            <TableHead>تفاصيل التكلفة/الحركة</TableHead>
            <TableHead>بواسطة</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {result.items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="py-8 text-center text-sm text-muted">
                لا توجد حركات مخزنية مطابقة للفلاتر.
              </TableCell>
            </TableRow>
          ) : result.items.map((m) => (
            <TableRow key={m.id}>
              <TableCell className="text-sm text-muted">
                {formatDateTime(m.createdAt)}
              </TableCell>
              <TableCell>
                {m.variant.product.nameAr || m.variant.product.name}
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {movementLabels[m.type] || m.type}
                </Badge>
              </TableCell>
              <TableCell
                className={m.quantity > 0 ? "text-success" : "text-danger"}
              >
                {m.quantity > 0 ? "+" : ""}
                {m.quantity}
              </TableCell>
              <TableCell>{m.previousQty}</TableCell>
              <TableCell>{m.newQty}</TableCell>
              <TableCell className="text-xs">
                {m.notes && <p>{m.notes}</p>}
                {m.previousCostPrice !== null && m.newCostPrice !== null && (
                  <p className="mt-1">
                    لقطة التكلفة: من {formatCurrency(m.previousCostPrice)} إلى {formatCurrency(m.newCostPrice)}
                    {m.valuationDifference !== null && (
                      <> · أثر التقييم: {formatCurrency(m.valuationDifference)}</>
                    )}
                  </p>
                )}
              </TableCell>
              <TableCell>{m.user.name}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <PaginationNav
        page={result.page}
        totalPages={result.totalPages}
        basePath="/inventory"
        pageParam="movementPage"
        searchParams={preservedParams}
      />
    </div>
  );
}
