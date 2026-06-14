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
import { formatCurrency } from "@/lib/utils";
import { PackagePlus } from "lucide-react";
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

interface InventoryVariantsClientProps {
  variants: Variant[];
}

export default function InventoryVariantsClient({
  variants,
}: InventoryVariantsClientProps) {
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
          {variants.map((v) => (
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
              <TableCell>
                {formatCurrency(v.costPrice * v.stockQuantity)}
              </TableCell>
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
            <Button
              type="button"
              variant="ghost"
              onClick={() => setAdjustModal(false)}
            >
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
