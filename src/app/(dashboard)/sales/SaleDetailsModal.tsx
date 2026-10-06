"use client";

import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import InvoiceDetailView from "@/app/(dashboard)/sales/InvoiceDetailView";
import { getSale } from "@/lib/actions/sales";
import { getStoreSettings } from "@/lib/actions/settings";
import { useEffect, useState } from "react";

type SaleData = Awaited<ReturnType<typeof getSale>>;
type StoreSettings = Awaited<ReturnType<typeof getStoreSettings>>;

interface SaleDetailsModalProps {
  saleId: string | null;
  onClose: () => void;
}

export default function SaleDetailsModal({
  saleId,
  onClose,
}: SaleDetailsModalProps) {
  const [sale, setSale] = useState<SaleData | null>(null);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!saleId) return;

    let active = true;
    const currentSaleId = saleId;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const [saleData, storeSettings] = await Promise.all([
          getSale(currentSaleId),
          getStoreSettings(),
        ]);
        if (!active) return;
        setSale(saleData);
        setSettings(storeSettings);
      } catch {
        if (active) setError("خطأ في تحميل بيانات الفاتورة");
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [saleId]);

  if (!saleId) return null;

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`فاتورة ${sale?.invoiceNumber || ""}`}
      size="xl"
      footer={
        <div className="flex justify-end">
          <Button variant="ghost" onClick={onClose}>
            إغلاق
          </Button>
        </div>
      }
    >
      {loading && (
        <div className="space-y-3 animate-pulse">
          <div className="h-4 rounded bg-brown/5" />
          <div className="h-4 rounded bg-brown/5" />
          <div className="h-4 rounded bg-brown/5" />
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {!loading && !error && sale && (
        <InvoiceDetailView sale={sale} settings={settings} />
      )}
    </Modal>
  );
}
