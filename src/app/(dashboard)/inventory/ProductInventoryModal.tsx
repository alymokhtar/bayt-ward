"use client";

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { getProductInventory } from "@/lib/actions/inventory";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { useEffect, useState } from "react";

type ProductInventory = Awaited<ReturnType<typeof getProductInventory>>;

interface ProductInventoryModalProps {
  productId: string | null;
  onClose: () => void;
}

export default function ProductInventoryModal({
  productId,
  onClose,
}: ProductInventoryModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<ProductInventory | null>(null);

  useEffect(() => {
    if (!productId) {
      setData(null);
      setError("");
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const result = await getProductInventory(productId!);
        if (!cancelled) setData(result);
      } catch {
        if (!cancelled) setError("تعذر تحميل تفاصيل المخزون");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const productName = data?.nameAr || data?.name;

  return (
    <Modal
      isOpen={!!productId}
      onClose={onClose}
      title={productName || "تفاصيل المخزون"}
      description={
        data
          ? [
              data.category.nameAr || data.category.name,
              data.brand,
            ]
              .filter(Boolean)
              .join(" · ")
          : undefined
      }
      size="xl"
    >
      {loading && (
        <div className="space-y-3 animate-pulse">
          <div className="grid gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 rounded-lg bg-brown/5" />
            ))}
          </div>
          <div className="h-48 rounded-lg bg-brown/5" />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {data && !loading && (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard label="إجمالي القطع" value={data.summary.totalStock.toString()} />
            <SummaryCard
              label="قيمة التكلفة"
              value={formatCurrency(data.summary.totalCostValue)}
            />
            <SummaryCard
              label="قيمة البيع"
              value={formatCurrency(data.summary.totalRetailValue)}
            />
            <SummaryCard
              label="المتغيرات"
              value={`${data.summary.variantCount} متغير`}
              hint={
                data.summary.outOfStockCount > 0 || data.summary.lowStockCount > 0
                  ? `${data.summary.outOfStockCount} نفد · ${data.summary.lowStockCount} منخفض`
                  : undefined
              }
            />
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المقاس</TableHead>
                  <TableHead>اللون</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>الكمية</TableHead>
                  <TableHead>الحد الأدنى</TableHead>
                  <TableHead>تكلفة الوحدة</TableHead>
                  <TableHead>سعر البيع</TableHead>
                  <TableHead>قيمة المخزون</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.variants.map((variant) => (
                  <TableRow key={variant.id}>
                    <TableCell>{variant.size}</TableCell>
                    <TableCell>{variant.color}</TableCell>
                    <TableCell dir="ltr" className="text-start">
                      {variant.sku}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          variant.stockQuantity === 0
                            ? "danger"
                            : variant.stockQuantity <= variant.minStockLevel
                              ? "warning"
                              : "success"
                        }
                      >
                        {variant.stockQuantity}
                      </Badge>
                    </TableCell>
                    <TableCell>{variant.minStockLevel}</TableCell>
                    <TableCell>{formatCurrency(variant.costPrice)}</TableCell>
                    <TableCell>{formatCurrency(variant.sellingPrice)}</TableCell>
                    <TableCell>
                      {formatCurrency(variant.costPrice * variant.stockQuantity)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              إغلاق
            </Button>
            <Link href={`/products/${data.id}`}>
              <Button type="button" variant="outline">
                فتح صفحة المنتج
              </Button>
            </Link>
          </div>
        </div>
      )}
    </Modal>
  );
}

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-cream/40 px-4 py-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold text-brown">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}
