import ProductForm from "@/app/(dashboard)/products/ProductForm";
import { getCategories } from "@/lib/actions/categories";
import { getProduct, getUsedColors } from "@/lib/actions/products";
import { notFound } from "next/navigation";

interface EditProductPageProps {
  params: Promise<{ productId: string }>;
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { productId } = await params;

  let product;
  let categories;
  let usedColors: string[];
  try {
    [product, categories, usedColors] = await Promise.all([
      getProduct(productId),
      getCategories(true),
      getUsedColors(),
    ]);
  } catch {
    notFound();
  }

  return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-brown">تعديل المنتج</h1>
          <p className="text-sm text-muted mt-1">
            {product.nameAr || product.name}
          </p>
        </div>
        <ProductForm
          categories={categories}
          product={product}
          usedColors={usedColors}
        />
      </div>
    );
}
