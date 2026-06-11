"use client";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import Select from "@/components/ui/Select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { adjustStock } from "@/lib/actions/inventory";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { PackagePlus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Variant = {
  id: string;
  sku: string;
  size: string;
  color: string;
  stockQuantity: number;
  minStockLevel: number;
  costPrice: number;
  sellingPrice: number;
  product: {
    name: string;
    nameAr: string | null;
    category: { name: string; nameAr: string | null };
  };
};

type Movement = {
  id: string;
  type: string;
  quantity: number;
  previousQty: number;
  newQty: number;
  reference: string | null;
  notes: string | null;
  createdAt: Date;
  variant: {
    sku: string;
    product: { name: string; nameAr: string | null };
  };
  user: { name: string };
};

const movementLabels: Record<string, string> = {
  PURCHASE: "مشتريات",
  SALE: "بيع",
  RETURN: "مرتجع",
  ADJUSTMENT: "تعديل",
  DAMAGE: "تلف",
  TRANSFER: "نقل",
};

interface InventoryClientProps {
  variants: Variant[];
  movements: Movement[];
  initialSearch?: string;
  lowStockOnly?: boolean;
}

export default function InventoryClient({
  variants: initial,
  movements,
  initialSearch = "",
  lowStockOnly = false,
}: InventoryClientProps) {
  const router = useRouter();
  const [adjustModal, setAdjustModal] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [quantity, setQuantity] = useState("");
  const [adjustType, setAdjustType] = useState("ADJUSTMENT");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function openAdjust(variant: Variant) {
    setSelectedVariant(variant);
    setQuantity("");
    setNotes("");
    setError("");
    setAdjustModal(true);
  }

  async function handleAdjust(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedVariant) return;

    const qty = parseInt(quantity);
    if (!qty || qty === 0) {
      setError("أدخل كمية صالحة");
      return;
    }

    setLoading(true);
    const result = await adjustStock({
      variantId: selectedVariant.id,
      quantity: qty,
      type: adjustType as "ADJUSTMENT" | "DAMAGE" | "TRANSFER",
      notes: notes || undefined,
    });
    setLoading(false);

    if (result.success) {
      setAdjustModal(false);
      router.refresh();
    } else {
      setError(result.error ?? "حدث خطأ");
    }
  }

  return (
    <>
      <form className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <input
            name="search"
            defaultValue={initialSearch}
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

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>المنتج</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>المقاس/اللون</TableHead>
            <TableHead>الكمية</TableHead>
            <TableHead>الحد الأدنى</TableHead>
            <TableHead>قيمة التكلفة</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {initial.map((v) => (
            <TableRow key={v.id}>
              <TableCell>
                <p className="font-medium">
                  {v.product.nameAr || v.product.name}
                </p>
                <p className="text-xs text-muted">
                  {v.product.category.nameAr || v.product.category.name}
                </p>
              </TableCell>
              <TableCell dir="ltr" className="text-start">
                {v.sku}
              </TableCell>
              <TableCell>
                {v.size} / {v.color}
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    v.stockQuantity === 0
                      ? "danger"
                      : v.stockQuantity <= v.minStockLevel
                        ? "warning"
                        : "success"
                  }
                >
                  {v.stockQuantity}
                </Badge>
              </TableCell>
              <TableCell>{v.minStockLevel}</TableCell>
              <TableCell>{formatCurrency(v.costPrice * v.stockQuantity)}</TableCell>
              <TableCell>
                <Button variant="outline" size="sm" onClick={() => openAdjust(v)}>
                  <PackagePlus className="h-4 w-4" />
                  تعديل
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

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
            {movements.map((m) => (
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
                  className={
                    m.quantity > 0 ? "text-success" : "text-danger"
                  }
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

      <Modal
        isOpen={adjustModal}
        onClose={() => setAdjustModal(false)}
        title="تعديل المخزون"
        description={
          selectedVariant
            ? `${selectedVariant.product.nameAr || selectedVariant.product.name} — الكمية الحالية: ${selectedVariant.stockQuantity}`
            : undefined
        }
      >
        <form onSubmit={handleAdjust} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}
          <Select
            label="نوع الحركة"
            options={[
              { value: "ADJUSTMENT", label: "تعديل" },
              { value: "DAMAGE", label: "تلف" },
              { value: "TRANSFER", label: "نقل" },
            ]}
            value={adjustType}
            onChange={(e) => setAdjustType(e.target.value)}
          />
          <Input
            label="الكمية (+ للإضافة، - للخصم)"
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
            hint="مثال: 10 لإضافة، -5 لخصم"
          />
          <Input
            label="ملاحظات"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" onClick={() => setAdjustModal(false)}>
              إلغاء
            </Button>
            <Button type="submit" loading={loading}>
              حفظ
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
