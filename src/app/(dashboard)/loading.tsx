import { Card, CardContent } from "@/components/ui/Card";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-44 animate-pulse rounded-lg bg-gray-200" />
        <div className="h-4 w-64 animate-pulse rounded-lg bg-gray-100" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index}>
            <CardContent className="space-y-3 pt-6">
              <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
              <div className="h-8 w-32 animate-pulse rounded bg-gray-100" />
              <div className="h-3 w-40 animate-pulse rounded bg-gray-100" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="space-y-4 pt-6">
            <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
            <div className="h-56 w-full animate-pulse rounded-xl bg-gray-100" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 pt-6">
            <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
            <div className="h-10 w-full animate-pulse rounded-lg bg-gray-100" />
            <div className="h-10 w-full animate-pulse rounded-lg bg-gray-100" />
            <div className="h-10 w-full animate-pulse rounded-lg bg-gray-100" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="space-y-3 pt-6">
          <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
          <div className="h-40 w-full animate-pulse rounded-xl bg-gray-100" />
        </CardContent>
      </Card>
    </div>
  );
}
