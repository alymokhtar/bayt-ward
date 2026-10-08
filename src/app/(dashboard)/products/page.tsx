import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import { Card, CardContent } from "@/components/ui/Card";
import ProductsTableClient from "@/app/(dashboard)/products/ProductsTableClient";
import { getProducts } from "@/lib/actions/products";
import { getCategories } from "@/lib/actions/categories";
import PaginationNav from "@/components/ui/PaginationNav";
import SearchForm from "@/components/ui/SearchForm";
import { Package, Plus } from "lucide-react";
import Link from "next/link";

interface ProductsPageProps {
  searchParams: Promise<{
    search?: string;
    page?: string;
    categoryId?: string;
    includeInactive?: string;
  }>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const { search, page, categoryId, includeInactive } = await searchParams;
  const [result, categories] = await Promise.all([
    getProducts({
      search,
      categoryId,
      includeInactive: includeInactive === "true",
      page: page ? Number(page) : 1,
    }),
    getCategories(),
  ]);
  const products = result.items;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brown">المنتجات</h1>
          <p className="text-sm text-muted mt-1">
            {result.total} منتج
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
          <SearchForm
            action="/products"
            placeholder="بحث بالاسم أو SKU أو الباركود..."
            defaultValue={search}
          >
            <select
              name="categoryId"
              defaultValue={categoryId ?? ""}
              aria-label="تصفية حسب القسم"
              className="h-10 min-w-[180px] rounded-lg border border-border bg-white px-3 text-sm text-brown focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
            >
              <option value="">كل الأقسام</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.nameAr || category.name}
                </option>
              ))}
            </select>
            <label className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-white px-3 text-sm text-brown">
              <input
                type="checkbox"
                name="includeInactive"
                value="true"
                defaultChecked={includeInactive === "true"}
                className="h-4 w-4 accent-gold"
              />
              عرض المؤرشف
            </label>
          </SearchForm>

          {products.length === 0 ? (
            <EmptyState
              icon={<Package className="h-8 w-8 text-gold" strokeWidth={1.5} />}
              title="لا توجد منتجات"
              description="ابدأ بإضافة منتجات جديدة للمتجر"
              action={{ label: "إضافة منتج", href: "/products/new" }}
            />
          ) : (
            <ProductsTableClient products={products} />
          )}
          <PaginationNav
            page={result.page}
            totalPages={result.totalPages}
            basePath="/products"
            searchParams={{ search, categoryId, includeInactive }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
