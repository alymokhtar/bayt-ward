import InvoiceBackButton from "@/app/(dashboard)/sales/InvoiceBackButton";
import InvoiceDetailView from "@/app/(dashboard)/sales/InvoiceDetailView";
import { getSale } from "@/lib/actions/sales";
import { getStoreSettings } from "@/lib/actions/settings";
import { formatDateTime } from "@/lib/utils";
import { notFound } from "next/navigation";

interface SaleDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function SaleDetailPage({ params }: SaleDetailPageProps) {
  const { id } = await params;

  let sale: Awaited<ReturnType<typeof getSale>>;
  let settings: Awaited<ReturnType<typeof getStoreSettings>>;
  try {
    [sale, settings] = await Promise.all([getSale(id), getStoreSettings()]);
  } catch {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <InvoiceBackButton />
        <div>
          <h1 className="text-2xl font-bold text-brown">
            فاتورة {sale.invoiceNumber}
          </h1>
          <p className="text-sm text-muted">{formatDateTime(sale.createdAt)}</p>
        </div>
      </div>
      <InvoiceDetailView sale={sale} settings={settings} />
    </div>
  );
}
