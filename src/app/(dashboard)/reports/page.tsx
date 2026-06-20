import { Suspense } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import ReportsTabsClient from "@/app/(dashboard)/reports/ReportsTabsClient";
import ReportsContentSection from "@/app/(dashboard)/reports/ReportsContentSection";
import {
  detectReportPeriod,
  getReportPeriodRange,
} from "@/lib/business-day";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

interface ReportsPageProps {
  searchParams: Promise<{
    tab?: string;
    from?: string;
    to?: string;
    period?: string;
  }>;
}

function ContentSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-brown/5" />
        ))}
      </div>
      <div className="h-64 rounded-xl bg-brown/5" />
    </div>
  );
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const session = await getSession();
  if (session?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const activeTab = params.tab || "sales";

  const todayRange = getReportPeriodRange("today");
  const from = params.from || todayRange.from;
  const to = params.to || todayRange.to;
  const period =
    params.period ||
    (params.from || params.to
      ? detectReportPeriod(from, to)
      : "today");

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-brown">التقارير</h1>
        <p className="text-sm text-muted">
          تحليلات وإحصائيات المتجر لمتابعة المبيعات والمخزون والأرباح.
        </p>
      </div>
      <Card>
        <CardContent className="pt-6 space-y-6">
          <ReportsTabsClient
            activeTab={activeTab}
            from={from}
            to={to}
            period={period}
          />
          <Suspense
            key={`${activeTab}-${from}-${to}`}
            fallback={<ContentSkeleton />}
          >
            <ReportsContentSection
              activeTab={activeTab}
              from={from}
              to={to}
            />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
