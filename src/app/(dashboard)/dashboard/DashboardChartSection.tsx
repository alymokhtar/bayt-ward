import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { getDashboardChartData } from "@/lib/actions/dashboard";
import DashboardDataError from "@/app/(dashboard)/dashboard/DashboardDataError";

const SalesChart = dynamic(
  () => import("@/app/(dashboard)/dashboard/SalesChart"),
  {
    loading: () => (
      <div className="h-[280px] animate-pulse rounded-lg bg-brown/5" />
    ),
  }
);

export default async function DashboardChartSection() {
  const result = await getDashboardChartData();

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>إجمالي المبيعات خلال آخر 7 أيام</CardTitle>
      </CardHeader>
      <CardContent>
        {result.success ? (
          <SalesChart data={result.data} />
        ) : (
          <div className="flex h-[280px] items-center">
            <div className="w-full">
              <DashboardDataError message={result.error.message} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
