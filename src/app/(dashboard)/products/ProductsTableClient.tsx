"use client";

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ConfirmDeleteDialog from "@/components/ui/ConfirmDeleteDialog";
import Modal from "@/components/ui/Modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { deleteProduct, getProduct } from "@/lib/actions/products";
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
  brand: string | null;
  publishToWebsite: boolean;
  featuredProduct: boolean;
  isActive: boolean;
  category: { name: string; nameAr: string | null };
  images?: {
    id: string;
    url: string;
    isPrimary: boolean;
  }[];
  variants: {
    id: string;
    size: string;
    color: string;
    colorHex: string | null;
    stockQuantity: number;
    minStockLevel: number;
    sellingPrice: number;
    isActive: boolean;
    images?: {
      id: string;
      url: string;
      isPrimary: boolean;
    }[];
  }[];
};

type ProductDetail = Awaited<ReturnType<typeof getProduct>>;

interface ProductsTableClientProps {
  products: Product[];
}

function getProductSummary(product: Product) {
  const activeVariants = product.variants.filter((variant) => variant.isActive);
  const totalStock = activeVariants.reduce(
    (sum, v) => sum + v.stockQuantity,
    0
  );
  const outOfStockVariants = activeVariants.filter((v) => v.stockQuantity === 0);
  const lowStockVariants = activeVariants.filter(
    (v) => v.stockQuantity <= v.minStockLevel
  );
  const prices = activeVariants.map((v) => v.sellingPrice);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const priceLabel =
    minPrice === maxPrice
      ? formatCurrency(minPrice)
      : `${formatCurrency(minPrice)} - ${formatCurrency(maxPrice)}`;

  return {
    totalStock,
    activeVariantCount: activeVariants.length,
    outOfStockVariants,
    lowStockVariants,
    priceLabel,
  };
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
  const [selectedProduct, setSelectedProduct] = useState<ProductDetail | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState("");
  const selectedSummary = useMemo(
    () =>
      selectedProduct
        ? getProductSummary({
            ...selectedProduct,
            publishToWebsite: false,
            featuredProduct: false,
            variants: selectedProduct.variants.map((variant) => ({
              ...variant,
              images: variant.images,
            })),
          })
        : null,
    [selectedProduct]
  );

  async function openProductDetails(productId: string) {
    setSelectedProductId(productId);
    setSelectedProduct(null);
    setDetailsError(null);
    setIsLoadingDetails(true);
    try {
      setSelectedProduct(await getProduct(productId));
    } catch (error) {
      console.error("Failed to load product details", error);
      setDetailsError("تعذر تحميل تفاصيل المنتج. يرجى المحاولة مرة أخرى.");
    } finally {
      setIsLoadingDetails(false);
    }
  }

  async function handleDeleteProduct() {
    if (!productToDelete) return;

    setIsDeleting(true);
    setDeleteError(null);

    const result = await deleteProduct(productToDelete.id);

    if (result.success) {
      setDeleteSuccess(result.data.message);
      setIsDeleting(false);
      setProductToDelete(null);
      router.refresh();
      return;
    }

    setDeleteError(result.error || "حدث خطأ غير متوقع");
    setIsDeleting(false);
  }

  return (
    <>
      {deleteSuccess && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {deleteSuccess}
        </div>
      )}
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
            const primaryMedia =
              product.images?.[0] ??
              product.variants.find((variant) => variant.images?.length)?.images?.[0] ??
              null;
            const primaryImageUrl = primaryMedia?.url || null;

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
                        onClick={() => void openProductDetails(product.id)}
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
                  {summary.activeVariantCount} متغير نشط
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <Badge
                      variant={summary.outOfStockVariants.length || summary.lowStockVariants.length ? "warning" : "default"}
                    >
                      {summary.totalStock}
                    </Badge>
                    {summary.outOfStockVariants.length > 0 && (
                      <p className="text-xs text-red-700">
                        نفد: {summary.outOfStockVariants.map((v) => `${v.size}/${v.color}`).join("، ")}
                      </p>
                    )}
                    {summary.lowStockVariants.length > 0 && (
                      <p className="text-xs text-amber-700">
                        منخفض: {summary.lowStockVariants
                          .filter((v) => v.stockQuantity > 0)
                          .map((v) => `${v.size}/${v.color}`)
                          .join("، ") || "توجد متغيرات نافدة"}
                      </p>
                    )}
                  </div>
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
                        setDeleteSuccess("");
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
        isOpen={!!selectedProductId}
        onClose={() => {
          setSelectedProductId(null);
          setSelectedProduct(null);
          setDetailsError(null);
        }}
        title={selectedProduct?.nameAr || selectedProduct?.name}
        description={selectedProduct?.brand || undefined}
        size="xl"
      >
        {isLoadingDetails && <p className="py-8 text-center text-muted">جارٍ تحميل تفاصيل المنتج...</p>}
        {detailsError && <p className="py-8 text-center text-red-700">{detailsError}</p>}
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

      <ConfirmDeleteDialog
        isOpen={!!productToDelete}
        onClose={() => {
          if (!isDeleting) {
            setProductToDelete(null);
            setDeleteError(null);
          }
        }}
        onConfirm={handleDeleteProduct}
        title="تأكيد حذف المنتج"
        description="سيُحذف المنتج إذا لم تكن له حركات أو سجلات تاريخية، وإلا فسيُؤرشف المنتج ومتغيراته للحفاظ على السجلات."
        itemName={productToDelete?.nameAr || productToDelete?.name || undefined}
        loading={isDeleting}
      >
        {deleteError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {deleteError}
          </div>
        )}
      </ConfirmDeleteDialog>
    </>
  );
}
