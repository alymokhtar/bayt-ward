"use client";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import BarcodePrintSheet, {
  type LabelData,
} from "@/components/barcode/BarcodePrintSheet";
import { getBarcodeValue } from "@/lib/barcode";
import { formatCurrency } from "@/lib/utils";
import { Barcode, Search } from "lucide-react";
import { useMemo, useState } from "react";

type Variant = {
  id: string;
  sku: string;
  barcode: string | null;
  size: string;
  color: string;
  sellingPrice: number;
  product: {
    name: string;
    nameAr: string | null;
  };
};

interface BarcodesClientProps {
  variants: Variant[];
}

export default function BarcodesClient({ variants }: BarcodesClientProps) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Record<string, number>>({});

  const filtered = useMemo(() => {
    if (!search.trim()) return variants;
    const q = search.toLowerCase();
    return variants.filter(
      (v) =>
        v.sku.toLowerCase().includes(q) ||
        v.barcode?.toLowerCase().includes(q) ||
        v.product.name.toLowerCase().includes(q) ||
        v.product.nameAr?.includes(q)
    );
  }, [variants, search]);

  const labels: LabelData[] = useMemo(() => {
    return Object.entries(selected)
      .filter(([, qty]) => qty > 0)
      .map(([id, quantity]) => {
        const variant = variants.find((v) => v.id === id)!;
        return {
          id: variant.id,
          sku: variant.sku,
          barcode: getBarcodeValue(variant.barcode, variant.sku),
          productName: variant.product.nameAr || variant.product.name,
          size: variant.size,
          color: variant.color,
          price: variant.sellingPrice,
          quantity,
        };
      });
  }, [selected, variants]);

  function toggleVariant(id: string) {
    setSelected((prev) => {
      if (prev[id]) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: 1 };
    });
  }

  function updateQuantity(id: string, qty: number) {
    if (qty <= 0) {
      setSelected((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } else {
      setSelected((prev) => ({ ...prev, [id]: qty }));
    }
  }

  function selectAll() {
    const all: Record<string, number> = {};
    filtered.forEach((v) => {
      all[v.id] = 1;
    });
    setSelected(all);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-6">
        <Card className="lg:w-1/2 no-print">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-brown">اختر المنتجات</h2>
              <Button variant="ghost" size="sm" onClick={selectAll}>
                تحديد الكل
              </Button>
            </div>

            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث بالباركود أو SKU..."
                autoComplete="off"
                className="w-full h-10 rounded-lg border border-border bg-white ps-10 pe-4 text-sm focus:outline-none focus:ring-2 focus:ring-gold/30"
              />
            </div>

            <div className="max-h-[50vh] overflow-y-auto space-y-2">
              {filtered.map((variant) => {
                const isSelected = !!selected[variant.id];
                return (
                  <div
                    key={variant.id}
                    className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                      isSelected
                        ? "border-gold bg-gold/5"
                        : "border-border hover:bg-cream-dark/30"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleVariant(variant.id)}
                      className="h-4 w-4 accent-gold"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {variant.product.nameAr || variant.product.name}
                      </p>
                      <p className="text-xs text-muted">
                        {variant.sku} · {variant.size} · {variant.color} ·{" "}
                        {formatCurrency(variant.sellingPrice)}
                      </p>
                    </div>
                    {isSelected && (
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        value={selected[variant.id]}
                        onChange={(e) =>
                          updateQuantity(
                            variant.id,
                            parseInt(e.target.value, 10) || 1
                          )
                        }
                        className="w-16 h-8 text-center"
                        dir="ltr"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:w-1/2">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4 no-print">
              <Barcode className="h-5 w-5 text-gold" />
              <h2 className="font-semibold text-brown">معاينة الملصقات</h2>
              <span className="text-sm text-muted ms-auto">
                {labels.reduce((s, l) => s + l.quantity, 0)} ملصق
              </span>
            </div>
            <BarcodePrintSheet labels={labels} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
