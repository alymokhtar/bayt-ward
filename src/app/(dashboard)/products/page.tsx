import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { Card, CardContent } from "@/components/ui/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { getProducts } from "@/lib/actions/products";
import { formatCurrency } from "@/lib/utils";
import { Package, Plus, Search } from "lucide-react";
import Link from "next/link";

interface ProductsPageProps {
  searchParams: Promise<{ search?: string }>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const { search } = await searchParams;
  const products = await getProducts({ search });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brown">المنتجات</h1>
          <p className="text-sm text-muted mt-1">
            {products.length} منتج
          </p>
        </div>
        <Link href="/products/new">
          <Button>
            <Plus className="h-4 w-4" />
            إضافة منتج
          </Button>
        </Link>
        <Link href="/barcodes">
          <Button variant="outline">
            <Package className="h-4 w-4" />
            طباعة باركود
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form className="flex gap-3 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              <input
                name="search"
                defaultValue={search}
                placeholder="بحث بالاسم أو SKU أو الباركود..."
                className="w-full h-10 rounded-lg border border-border bg-white ps-10 pe-4 text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold"
              />
            </div>
            <Button type="submit" variant="secondary">
              بحث
            </Button>
          </form>

          {products.length === 0 ? (
            <EmptyState
              icon={<Package className="h-8 w-8 text-gold" strokeWidth={1.5} />}
              title="لا توجد منتجات"
              description="ابدأ بإضافة منتجات جديدة للمتجر"
              action={{ label: "إضافة منتج", href: "/products/new" }}
            />
          ) : (
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
                  const totalStock = product.variants.reduce(
                    (sum, v) => sum + v.stockQuantity,
                    0
                  );
                  const minPrice = Math.min(
                    ...product.variants.map((v) => v.sellingPrice)
                  );
                  const maxPrice = Math.max(
                    ...product.variants.map((v) => v.sellingPrice)
                  );
                  const priceLabel =
                    minPrice === maxPrice
                      ? formatCurrency(minPrice)
                      : `${formatCurrency(minPrice)} - ${formatCurrency(maxPrice)}`;

                  return (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {product.nameAr || product.name}
                          </p>
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
                            totalStock <=
                            product.variants.reduce(
                              (s, v) => s + v.minStockLevel,
                              0
                            ) /
                              product.variants.length
                              ? "warning"
                              : "default"
                          }
                        >
                          {totalStock}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium text-gold">
                        {priceLabel}
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
