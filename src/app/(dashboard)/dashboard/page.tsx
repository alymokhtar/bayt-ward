import { Suspense } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import DashboardStatCards from "@/app/(dashboard)/dashboard/DashboardStatCards";
import DashboardChartSection from "@/app/(dashboard)/dashboard/DashboardChartSection";
import DashboardRecentSalesSection from "@/app/(dashboard)/dashboard/DashboardRecentSalesSection";
import LowStockPanel from "@/app/(dashboard)/dashboard/LowStockPanel";

function SectionSkeleton({ className = "h-28" }: { className?: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className={`animate-pulse rounded-lg bg-brown/5 ${className}`} />
      </CardContent>
    </Card>
  );
}

function StatCardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <SectionSkeleton key={i} />
      ))}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brown">لوحة التحكم</h1>
        <p className="text-sm text-muted mt-1">نظرة عامة على أداء المتجر</p>
      </div>

        <Suspense fallback={<StatCardsSkeleton />}>
          <DashboardStatCards />
        </Suspense>

        <div className="grid gap-6 lg:grid-cols-3">
          <Suspense
            fallback={
              <Card className="lg:col-span-2">
                <CardContent className="pt-6">
                  <div className="h-[280px] animate-pulse rounded-lg bg-brown/5" />
                </CardContent>
              </Card>
            }
          >
            <DashboardChartSection />
          </Suspense>

          <Suspense fallback={<SectionSkeleton className="h-48" />}>
            <LowStockPanel />
          </Suspense>
        </div>

        <Suspense fallback={<SectionSkeleton className="h-64" />}>
          <DashboardRecentSalesSection />
        </Suspense>
      </div>
  );
}
