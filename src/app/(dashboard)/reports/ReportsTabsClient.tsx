"use client";

import Button from "@/components/ui/Button";
import {
  getReportPeriodRange,
  type ReportPeriod,
} from "@/lib/business-day";
import type { SalesChannelFilter } from "@/lib/sales-analytics";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

const tabs = [
  { id: "sales", label: "تقرير المبيعات" },
  { id: "inventory", label: "تقرير المخزون" },
  { id: "profit", label: "تقرير الأرباح" },
  { id: "top", label: "أفضل المنتجات" },
];

const periodPresets = [
  { id: "today", label: "اليوم" },
  { id: "week", label: "الأسبوع" },
  { id: "month", label: "الشهر" },
] as const;

interface ReportsTabsClientProps {
  activeTab: string;
  from: string;
  to: string;
  period: string;
  channel: SalesChannelFilter;
}

export default function ReportsTabsClient({
  activeTab,
  from,
  to,
  period,
  channel,
}: ReportsTabsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [dateFrom, setDateFrom] = useState(from);
  const [dateTo, setDateTo] = useState(to);
  const [selectedChannel, setSelectedChannel] = useState(channel);
  const showPeriodPresets = activeTab === "sales" || activeTab === "profit";
  const showDateFilters = activeTab !== "inventory";

  function navigate(params: URLSearchParams) {
    if (!params.get("tab")) params.set("tab", activeTab);
    startTransition(() => router.push(`/reports?${params.toString()}`));
  }

  function setTab(tab: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    navigate(params);
  }

  function applyPreset(preset: Exclude<ReportPeriod, "custom">) {
    const range = getReportPeriodRange(preset);
    setDateFrom(range.from);
    setDateTo(range.to);

    const params = new URLSearchParams(searchParams.toString());
    params.set("from", range.from);
    params.set("to", range.to);
    params.set("period", preset);
    navigate(params);
  }

  function applyDates() {
    const params = new URLSearchParams(searchParams.toString());
    params.set("from", dateFrom);
    params.set("to", dateTo);
    params.set("period", "custom");
    navigate(params);
  }

  function applyChannel(nextChannel: SalesChannelFilter) {
    setSelectedChannel(nextChannel);
    const params = new URLSearchParams(searchParams.toString());
    params.set("channel", nextChannel);
    navigate(params);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="reports-channel" className="text-sm font-medium text-brown">
          قناة البيع
        </label>
        <select
          id="reports-channel"
          value={selectedChannel}
          onChange={(event) => applyChannel(event.target.value as SalesChannelFilter)}
          disabled={isPending}
          className="h-10 min-w-52 rounded-lg border border-border bg-white px-3 text-sm text-brown"
        >
          <option value="ALL">الكل</option>
          <option value="POS">مبيعات الفرع (POS)</option>
          <option value="ONLINE">طلبات المتجر (ONLINE)</option>
        </select>
        <p className="text-xs text-muted">
          المصروفات العامة والمخزون لا يرتبطان بقناة بيع.
        </p>
      </div>
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

      {showDateFilters && (
        <div className="space-y-3">
          {showPeriodPresets && (
            <div className="flex flex-wrap gap-2">
              {periodPresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.id)}
                  disabled={isPending}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    period === preset.id
                      ? "bg-gold text-primary-foreground"
                      : "border border-border text-brown hover:bg-gold/10"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          )}

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
        </div>
      )}
    </div>
  );
}
