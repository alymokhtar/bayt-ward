import ProductForm from "@/app/(dashboard)/products/ProductForm";
import { getCategories } from "@/lib/actions/categories";
import { getUsedColors } from "@/lib/actions/products";

export default async function NewProductPage() {
  const [categories, usedColors] = await Promise.all([
    getCategories(),
    getUsedColors(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brown">إضافة منتج جديد</h1>
        <p className="text-sm text-muted mt-1">
          أضف منتجاً مع متغيرات المقاس واللون
        </p>
      </div>
      <ProductForm categories={categories} usedColors={usedColors} />
    </div>
  );
}
