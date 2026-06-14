import BarcodesClient from "@/app/(dashboard)/barcodes/BarcodesClient";
import PaginationNav from "@/components/ui/PaginationNav";
import { getAllVariantsForBarcodes } from "@/lib/actions/products";
import { Barcode } from "lucide-react";

interface BarcodesPageProps {
  searchParams: Promise<{ search?: string; page?: string }>;
}

export default async function BarcodesPage({ searchParams }: BarcodesPageProps) {
  const { search, page } = await searchParams;
  const result = await getAllVariantsForBarcodes({
    search,
    page: page ? Number(page) : 1,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 no-print">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/10">
          <Barcode className="h-5 w-5 text-gold" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-brown">طباعة الباركود</h1>
          <p className="text-sm text-muted mt-1">
            اختاري المنتجات واطبعي ملصقات الباركود
          </p>
        </div>
      </div>

      <BarcodesClient variants={result.items} />
      <PaginationNav
        page={result.page}
        totalPages={result.totalPages}
        basePath="/barcodes"
        searchParams={{ search }}
      />
    </div>
  );
}
