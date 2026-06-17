"use client";

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import {
  exportLowStockToPdf,
  suggestedReorderQuantity,
  type LowStockExportItem,
} from "@/lib/export-low-stock-pdf";
import { FileDown } from "lucide-react";
import { useMemo, useState } from "react";

export type LowStockReportItem = LowStockExportItem & {
  categoryId: string;
};

interface LowStockReportPanelProps {
  items: LowStockReportItem[];
  totalCount: number;
}

const ALL_CATEGORIES = "";

export default function LowStockReportPanel({
  items,
  totalCount,
}: LowStockReportPanelProps) {
  const [categoryId, setCategoryId] = useState(ALL_CATEGORIES);
  const [excludedIds, setExcludedIds] = useState<Set<string>>(() => new Set());

  const categoryOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const item of items) {
      if (!seen.has(item.categoryId)) {
        seen.set(item.categoryId, item.category);
      }
    }
    return Array.from(seen.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "ar"));
  }, [items]);

  const filteredItems = useMemo(() => {
    if (!categoryId) return items;
    return items.filter((item) => item.categoryId === categoryId);
  }, [categoryId, items]);

  const includedItems = useMemo(
    () => filteredItems.filter((item) => !excludedIds.has(item.id)),
    [excludedIds, filteredItems]
  );

  const categoryLabel =
    categoryId === ALL_CATEGORIES
      ? "جميع التصنيفات"
      : (categoryOptions.find((option) => option.value === categoryId)?.label ??
        "—");

  function toggleItem(id: string) {
    setExcludedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function includeAllFiltered() {
    setExcludedIds((prev) => {
      const next = new Set(prev);
      for (const item of filteredItems) next.delete(item.id);
      return next;
    });
  }

  function excludeAllFiltered() {
    setExcludedIds((prev) => {
      const next = new Set(prev);
      for (const item of filteredItems) next.add(item.id);
      return next;
    });
  }

  function handleExport() {
    if (includedItems.length === 0) return;
    exportLowStockToPdf(includedItems, {
      categoryLabel,
      generatedAt: new Date(),
    });
  }

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>
            منتجات بمخزون منخفض ({totalCount})
          </CardTitle>
          <Button
            type="button"
            size="sm"
            onClick={handleExport}
            disabled={includedItems.length === 0}
          >
            <FileDown className="h-4 w-4" />
            تصدير PDF ({includedItems.length})
          </Button>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full sm:max-w-xs">
            <Select
              label="تصفية حسب التصنيف"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              options={[
                { value: ALL_CATEGORIES, label: "جميع التصنيفات" },
                ...categoryOptions,
              ]}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={includeAllFiltered}>
              تضمين الكل
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={excludeAllFiltered}>
              استبعاد الكل
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted">
          حدّد المنتجات المراد تضمينها في ملف PDF لإعادة الطلب. المنتجات غير
          المحددة لن تُصدَّر.
        </p>
      </CardHeader>

      <CardContent>
        {filteredItems.length === 0 ? (
          <p className="text-sm text-muted text-center py-8">
            لا توجد منتجات منخفضة المخزون في هذا التصنيف
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">تصدير</TableHead>
                  <TableHead>المنتج</TableHead>
                  <TableHead>التصنيف</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>الكمية المتاحة</TableHead>
                  <TableHead>الحد الأدنى</TableHead>
                  <TableHead>مقترح للطلب</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => {
                  const included = !excludedIds.has(item.id);
                  const reorderQty = suggestedReorderQuantity(
                    item.stockQuantity,
                    item.minStockLevel
                  );

                  return (
                    <TableRow
                      key={item.id}
                      className={included ? undefined : "opacity-50"}
                    >
                      <TableCell className="text-center">
                        <input
                          type="checkbox"
                          checked={included}
                          onChange={() => toggleItem(item.id)}
                          className="h-4 w-4 rounded border-border text-gold focus:ring-gold/30"
                          aria-label={`تضمين ${item.productName} في التصدير`}
                        />
                      </TableCell>
                      <TableCell>
                        {item.productName} — {item.size}/{item.color}
                      </TableCell>
                      <TableCell className="text-muted">{item.category}</TableCell>
                      <TableCell dir="ltr">{item.sku}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            item.stockQuantity === 0 ? "danger" : "warning"
                          }
                        >
                          {item.stockQuantity}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.minStockLevel}</TableCell>
                      <TableCell className="font-medium text-brown">
                        {reorderQty}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
