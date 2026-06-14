import Badge from "@/components/ui/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { getStockMovements } from "@/lib/actions/inventory";
import { formatDateTime } from "@/lib/utils";

const movementLabels: Record<string, string> = {
  PURCHASE: "مشتريات",
  SALE: "بيع",
  RETURN: "مرتجع",
  ADJUSTMENT: "تعديل",
  DAMAGE: "تلف",
  TRANSFER: "نقل",
};

export default async function InventoryMovementsSection() {
  const result = await getStockMovements({ pageSize: 50 });

  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold text-brown mb-4">سجل الحركات</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>التاريخ</TableHead>
            <TableHead>المنتج</TableHead>
            <TableHead>النوع</TableHead>
            <TableHead>الكمية</TableHead>
            <TableHead>قبل</TableHead>
            <TableHead>بعد</TableHead>
            <TableHead>بواسطة</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {result.items.map((m) => (
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
              <TableCell>{m.user.name}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
