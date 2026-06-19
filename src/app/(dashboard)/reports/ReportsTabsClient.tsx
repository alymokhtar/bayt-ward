"use client";

import Button from "@/components/ui/Button";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

const tabs = [
  { id: "sales", label: "تقرير المبيعات" },
  { id: "inventory", label: "تقرير المخزون" },
  { id: "profit", label: "تقرير الأرباح" },
  { id: "top", label: "أفضل المنتجات" },
];

interface ReportsTabsClientProps {
  activeTab: string;
  from: string;
  to: string;
}

export default function ReportsTabsClient({
  activeTab,
  from,
  to,
}: ReportsTabsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [dateFrom, setDateFrom] = useState(from);
  const [dateTo, setDateTo] = useState(to);

  function setTab(tab: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    startTransition(() => router.push(`/reports?${params.toString()}`));
  }

  function applyDates() {
    const params = new URLSearchParams(searchParams.toString());
    params.set("from", dateFrom);
    params.set("to", dateTo);
    if (!params.get("tab")) params.set("tab", activeTab);
    startTransition(() => router.push(`/reports?${params.toString()}`));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-border pb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setTab(tab.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-gold text-primary-foreground"
                : "text-brown hover:bg-gold/10"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab !== "inventory" && (
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-36">
            <label className="mb-1 block text-xs text-muted">من</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-10 w-full rounded-lg border border-border px-3 text-sm"
            />
          </div>
          <div className="min-w-36">
            <label className="mb-1 block text-xs text-muted">إلى</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-10 w-full rounded-lg border border-border px-3 text-sm"
            />
          </div>
          <Button variant="secondary" onClick={applyDates} loading={isPending}>
            تطبيق
          </Button>
        </div>
      )}
    </div>
  );
}
