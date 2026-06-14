import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { getDashboardChartData } from "@/lib/actions/dashboard";

const SalesChart = dynamic(
  () => import("@/app/(dashboard)/dashboard/SalesChart"),
  {
    loading: () => (
      <div className="h-[280px] animate-pulse rounded-lg bg-brown/5" />
    ),
  }
);

export default async function DashboardChartSection() {
  const salesChartData = await getDashboardChartData();

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>مبيعات آخر 7 أيام</CardTitle>
      </CardHeader>
      <CardContent>
        <SalesChart data={salesChartData} />
      </CardContent>
    </Card>
  );
}
