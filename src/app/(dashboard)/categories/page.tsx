import CategoriesClient from "@/app/(dashboard)/categories/CategoriesClient";
import { Card, CardContent } from "@/components/ui/Card";
import { getCategories } from "@/lib/actions/categories";

export default async function CategoriesPage() {
  const categories = await getCategories(true);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brown">التصنيفات</h1>
        <p className="text-sm text-muted mt-1">إدارة تصنيفات المنتجات</p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <CategoriesClient categories={categories} />
        </CardContent>
      </Card>
    </div>
  );
}
