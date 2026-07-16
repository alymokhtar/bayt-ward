import type { StoreProductListItem } from "@/lib/store/types";
import ProductCard from "@/components/store/ProductCard";

type ProductGridProps = {
  products: StoreProductListItem[];
  currencySymbol?: string;
};

export default function ProductGrid({
  products,
  currencySymbol,
}: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--store-border)] bg-white px-6 py-16 text-center">
        <p className="store-serif text-2xl text-[var(--store-text)]">
          لا توجد منتجات متاحة حالياً
        </p>
        <p className="mt-2 text-sm text-[var(--store-muted)]">
          تابعينا قريباً لتشكيلات جديدة
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
      {products.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          currencySymbol={currencySymbol}
          priority={index < 4}
        />
      ))}
    </div>
  );
}
