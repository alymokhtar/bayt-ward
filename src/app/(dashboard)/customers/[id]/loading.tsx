import { Card, CardContent } from "@/components/ui/Card";

export default function CustomerDetailsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-gray-200" />
          <div className="h-4 w-64 animate-pulse rounded bg-gray-100" />
        </div>
        <div className="h-10 w-28 animate-pulse rounded-lg bg-gray-200" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="h-5 w-36 animate-pulse rounded bg-gray-200" />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
                <div className="h-6 w-32 animate-pulse rounded bg-gray-100" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
                <div className="h-6 w-40 animate-pulse rounded bg-gray-100" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
              <div className="h-20 w-full animate-pulse rounded-xl bg-gray-100" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="h-5 w-28 animate-pulse rounded bg-gray-200" />
            <div className="space-y-3">
              <div className="h-10 w-full animate-pulse rounded-lg bg-gray-100" />
              <div className="h-10 w-full animate-pulse rounded-lg bg-gray-100" />
              <div className="h-10 w-full animate-pulse rounded-lg bg-gray-100" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="h-5 w-40 animate-pulse rounded bg-gray-200" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="grid grid-cols-4 gap-3">
                <div className="h-4 animate-pulse rounded bg-gray-200" />
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
