import {
  getReportPeriodRange,
  normalizeBusinessDateRange,
} from "@/lib/business-day";
import { getSession } from "@/lib/auth";
import { getLoyaltyAnalytics } from "@/lib/actions/loyalty";
import { redirect } from "next/navigation";
import LoyaltyAnalyticsClient from "./LoyaltyAnalyticsClient";

interface LoyaltyAnalyticsPageProps {
  searchParams: Promise<{ from?: string; to?: string }>;
}

export default async function LoyaltyAnalyticsPage({
  searchParams,
}: LoyaltyAnalyticsPageProps) {
  const session = await getSession();
  if (session?.role !== "ADMIN") redirect("/dashboard");

  const params = await searchParams;
  const defaults = getReportPeriodRange("month");
  const normalized = normalizeBusinessDateRange(params.from, params.to);
  const range = {
    from: normalized.from ?? defaults.from,
    to: normalized.to ?? defaults.to,
  };
  const analytics = await getLoyaltyAnalytics(range);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-brown">تحليلات نقاط الولاء</h1>
        <p className="text-sm text-muted">
          متابعة اكتساب النقاط واستبدالها والالتزام الحالي للبرنامج.
        </p>
      </header>
      <LoyaltyAnalyticsClient analytics={analytics} />
    </div>
  );
}
