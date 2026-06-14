import Badge from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { getLowStockPreview } from "@/lib/actions/inventory";
import { getSession } from "@/lib/auth";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";

export default async function LowStockPanel() {
  const session = await getSession();
  if (session?.role !== "ADMIN" && session?.role !== "MANAGER") {
    return null;
  }

  let lowStockItems: Awaited<ReturnType<typeof getLowStockPreview>> = [];
  try {
    lowStockItems = await getLowStockPreview(8);
  } catch {
    lowStockItems = [];
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning" />
          تنبيهات المخزون
        </CardTitle>
      </CardHeader>
      <CardContent>
        {lowStockItems.length > 0 ? (
          <ul className="space-y-2 max-h-52 overflow-y-auto">
            {lowStockItems.map((v) => (
              <li
                key={v.id}
                className="flex items-center justify-between text-sm border-b border-border pb-2 last:border-0"
              >
                <span className="text-brown truncate">
                  {v.product.nameAr || v.product.name} — {v.size}/{v.color}
                </span>
                <Badge variant="warning">{v.stockQuantity}</Badge>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted text-center py-4">
            لا توجد تنبيهات حالياً
          </p>
        )}
        <Link
          href="/inventory?lowStock=true"
          className="mt-4 block text-center text-sm text-gold hover:underline"
        >
          عرض المخزون
        </Link>
      </CardContent>
    </Card>
  );
}
