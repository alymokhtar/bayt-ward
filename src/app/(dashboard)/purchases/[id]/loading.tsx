import { Card, CardContent } from "@/components/ui/Card";

export default function PurchaseDetailsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-gray-200" />
          <div className="h-4 w-64 animate-pulse rounded bg-gray-100" />
        </div>
        <div className="h-10 w-28 animate-pulse rounded-lg bg-gray-200" />
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
              <div className="h-6 w-40 animate-pulse rounded bg-gray-100" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
              <div className="h-6 w-36 animate-pulse rounded bg-gray-100" />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="h-20 animate-pulse rounded-xl bg-gray-100" />
            <div className="h-20 animate-pulse rounded-xl bg-gray-100" />
            <div className="h-20 animate-pulse rounded-xl bg-gray-100" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="h-5 w-32 animate-pulse rounded bg-gray-200" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="grid grid-cols-5 gap-3">
                <div className="h-4 animate-pulse rounded bg-gray-200" />
                <div className="h-4 animate-pulse rounded bg-gray-100" />
                <div className="h-4 animate-pulse rounded bg-gray-100" />
                <div className="h-4 animate-pulse rounded bg-gray-100" />
                <div className="h-4 animate-pulse rounded bg-gray-100" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
