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
import { deleteProduct } from "@/lib/actions/products";
import { formatCurrency } from "@/lib/utils";
import { ExternalLink, Image as ImageIcon, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type Product = {
  id: string;
  name: string;
  nameAr: string | null;
  description: string | null;
  brand: string | null;
  imageUrl: string | null;
  publishToWebsite: boolean;
  featuredProduct: boolean;
  isActive: boolean;
  category: { name: string; nameAr: string | null };
  colors: {
    id: string;
    color: string;
    colorHex: string | null;
    media: {
      id: string;
      url: string;
      altText: string | null;
      isPrimary: boolean;
      isActive: boolean;
    }[];
  }[];
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

function getProductIdentifier(product: Product): string | null {
  const productWithAlternateIds = product as Product & {
    productId?: string | null;
    _id?: string | null;
  };

  const candidate =
    productWithAlternateIds.id ??
    productWithAlternateIds.productId ??
    productWithAlternateIds._id;

  return typeof candidate === "string" && candidate.trim() ? candidate : null;
}

export default function ProductsTableClient({
  products,
}: ProductsTableClientProps) {
  const router = useRouter();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const selectedSummary = useMemo(
    () => (selectedProduct ? getProductSummary(selectedProduct) : null),
    [selectedProduct]
  );

  async function handleDeleteProduct() {
    if (!productToDelete) return;

    setIsDeleting(true);
    setDeleteError(null);

    const result = await deleteProduct(productToDelete.id);

    if (result.success) {
      setProductToDelete(null);
      router.refresh();
      return;
    }

    setDeleteError(result.error || "حدث خطأ غير متوقع");
    setIsDeleting(false);
  }

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
            const productId = getProductIdentifier(product);
            const mediaItems = product.colors.flatMap((color) => color.media);
            const primaryMedia = mediaItems.find((item) => item.isPrimary && item.isActive) ?? mediaItems.find((item) => item.isActive) ?? null;
            const primaryImageUrl = product.imageUrl || primaryMedia?.url || null;
            const imageCount = mediaItems.filter((item) => item.isActive).length;

            return (
              <TableRow key={product.id}>
                <TableCell>
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-brown/5">
                      {primaryImageUrl ? (
                        <Image src={primaryImageUrl} alt={product.nameAr || product.name} width={48} height={48} className="h-full w-full object-cover" />
                      ) : (
                        <ImageIcon className="h-5 w-5 text-muted" />
                      )}
                    </div>
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
                      <div className="mt-2 flex flex-wrap gap-2">
                        {product.publishToWebsite && <Badge variant="gold">مُنشَر</Badge>}
                        {product.featuredProduct && <Badge variant="outline">Featured</Badge>}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {product.category.nameAr || product.category.name}
                </TableCell>
                <TableCell>
                  <div className="space-y-1 text-sm">
                    <div>{product.variants.length} متغير</div>
                    <div className="text-xs text-muted">{imageCount} صورة متاحة</div>
                  </div>
                </TableCell>
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
                  <div className="flex items-center gap-2">
                    {productId ? (
                      <Link
                        href={`/products/${productId}`}
                        onClick={() => {
                          console.log(product);
                          console.log("Resolved product id:", productId);
                        }}
                        className="text-sm text-gold hover:underline"
                      >
                        تعديل
                      </Link>
                    ) : (
                      <span className="text-sm text-muted">تعديل</span>
                    )}
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        setDeleteError(null);
                        setProductToDelete(product);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      حذف
                    </Button>
                  </div>
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
                <div className="flex items-center gap-2">
                  {(() => {
                    const selectedProductId = getProductIdentifier(selectedProduct);
                    return selectedProductId ? (
                      <Link
                        href={`/products/${selectedProductId}`}
                        onClick={() => {
                          console.log(selectedProduct);
                          console.log("Resolved selected product id:", selectedProductId);
                        }}
                      >
                        <Button size="sm" variant="outline">
                          <ExternalLink className="h-4 w-4" />
                          تعديل
                        </Button>
                      </Link>
                    ) : null;
                  })()}
                  <Button
                    type="button"
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      setSelectedProduct(null);
                      setDeleteError(null);
                      setProductToDelete(selectedProduct);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    حذف
                  </Button>
                </div>
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

      <Modal
        isOpen={!!productToDelete}
        onClose={() => {
          if (!isDeleting) {
            setProductToDelete(null);
            setDeleteError(null);
          }
        }}
        title="تأكيد الحذف"
        description="لن تتمكن من التراجع عن هذا الإجراء"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm leading-6 text-brown">
            هل تريد حذف المنتج{" "}
            <span className="font-semibold">
              {productToDelete?.nameAr || productToDelete?.name || "هذا المنتج"}
            </span>{" "}
            نهائياً من النظام وقاعدة البيانات؟
          </p>

          {deleteError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {deleteError}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setProductToDelete(null);
                setDeleteError(null);
              }}
              disabled={isDeleting}
            >
              إلغاء
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              loading={isDeleting}
              onClick={handleDeleteProduct}
            >
              حذف نهائي
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
