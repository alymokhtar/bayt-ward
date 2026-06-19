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
import { formatCurrency } from "@/lib/utils";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

type Product = {
  id: string;
  name: string;
  nameAr: string | null;
  description: string | null;
  brand: string | null;
  imageUrl: string | null;
  isActive: boolean;
  category: { name: string; nameAr: string | null };
  variants: {
    id: string;
    sku: string;
    barcode: string | null;
    size: string;
    color: string;
    colorHex: string | null;
    stockQuantity: number;
    minStockLevel: number;
    costPrice: number;
    sellingPrice: number;
    isActive: boolean;
  }[];
};

interface ProductsTableClientProps {
  products: Product[];
}

function getProductSummary(product: Product) {
  const totalStock = product.variants.reduce(
    (sum, v) => sum + v.stockQuantity,
    0
  );
  const totalMinStock = product.variants.reduce(
    (sum, v) => sum + v.minStockLevel,
    0
  );
  const prices = product.variants.map((v) => v.sellingPrice);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const priceLabel =
    minPrice === maxPrice
      ? formatCurrency(minPrice)
      : `${formatCurrency(minPrice)} - ${formatCurrency(maxPrice)}`;

  return { totalStock, totalMinStock, priceLabel };
}

export default function ProductsTableClient({
  products,
}: ProductsTableClientProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const selectedSummary = useMemo(
    () => (selectedProduct ? getProductSummary(selectedProduct) : null),
    [selectedProduct]
  );

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>المنتج</TableHead>
            <TableHead>التصنيف</TableHead>
            <TableHead>المتغيرات</TableHead>
            <TableHead>المخزون</TableHead>
            <TableHead>السعر</TableHead>
            <TableHead>الحالة</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => {
            const summary = getProductSummary(product);

            return (
              <TableRow key={product.id}>
                <TableCell>
                  <div>
                    <button
                      type="button"
                      onClick={() => setSelectedProduct(product)}
                      className="font-medium text-brown text-start hover:text-gold hover:underline"
                    >
                      {product.nameAr || product.name}
                    </button>
                    {product.brand && (
                      <p className="text-xs text-muted">{product.brand}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {product.category.nameAr || product.category.name}
                </TableCell>
                <TableCell>{product.variants.length}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      summary.totalStock <=
                      summary.totalMinStock / Math.max(product.variants.length, 1)
                        ? "warning"
                        : "default"
                    }
                  >
                    {summary.totalStock}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium text-gold">
                  {summary.priceLabel}
                </TableCell>
                <TableCell>
                  <Badge variant={product.isActive ? "success" : "danger"}>
                    {product.isActive ? "نشط" : "غير نشط"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Link
                    href={`/products/${product.id}`}
                    className="text-sm text-gold hover:underline"
                  >
                    تعديل
                  </Link>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Modal
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        title={selectedProduct?.nameAr || selectedProduct?.name}
        description={selectedProduct?.brand || undefined}
        size="xl"
      >
        {selectedProduct && selectedSummary && (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted">التصنيف</p>
                <p className="mt-1 font-medium text-brown">
                  {selectedProduct.category.nameAr ||
                    selectedProduct.category.name}
                </p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted">إجمالي المخزون</p>
                <p className="mt-1 font-medium text-brown">
                  {selectedSummary.totalStock}
                </p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted">السعر</p>
                <p className="mt-1 font-medium text-gold">
                  {selectedSummary.priceLabel}
                </p>
              </div>
            </div>

            {selectedProduct.description && (
              <div>
                <p className="text-xs text-muted">الوصف</p>
                <p className="mt-1 text-sm leading-6 text-brown">
                  {selectedProduct.description}
                </p>
              </div>
            )}

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <h3 className="font-semibold text-brown">المتغيرات</h3>
                <Link href={`/products/${selectedProduct.id}`}>
                  <Button size="sm" variant="outline">
                    <ExternalLink className="h-4 w-4" />
                    تعديل
                  </Button>
                </Link>
              </div>
              <div className="max-h-72 overflow-y-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>المقاس</TableHead>
                      <TableHead>اللون</TableHead>
                      <TableHead>المخزون</TableHead>
                      <TableHead>سعر البيع</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedProduct.variants.map((variant) => (
                      <TableRow key={variant.id}>
                        <TableCell dir="ltr">{variant.sku}</TableCell>
                        <TableCell>{variant.size}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-2">
                            {variant.colorHex && (
                              <span
                                className="h-3 w-3 rounded-full border border-border"
                                style={{ backgroundColor: variant.colorHex }}
                              />
                            )}
                            {variant.color}
                          </span>
                        </TableCell>
                        <TableCell>{variant.stockQuantity}</TableCell>
                        <TableCell className="font-medium text-gold">
                          {formatCurrency(variant.sellingPrice)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
