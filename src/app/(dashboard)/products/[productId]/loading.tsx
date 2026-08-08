import { Card, CardContent } from "@/components/ui/Card";

export default function ProductEditLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-2">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-gray-200" />
          <div className="h-4 w-64 animate-pulse rounded bg-gray-100" />
        </div>
        <div className="h-10 w-28 animate-pulse rounded-lg bg-gray-200" />
      </div>

      <Card>
        <CardContent className="space-y-6 pt-6">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
                <div className="h-11 w-full animate-pulse rounded-lg bg-gray-100" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-28 animate-pulse rounded bg-gray-200" />
                <div className="h-11 w-full animate-pulse rounded-lg bg-gray-100" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
                <div className="h-24 w-full animate-pulse rounded-lg bg-gray-100" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
                  <div className="h-11 w-full animate-pulse rounded-lg bg-gray-100" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
                  <div className="h-11 w-full animate-pulse rounded-lg bg-gray-100" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
                <div className="h-40 w-full animate-pulse rounded-xl bg-gray-100" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
                <div className="h-20 w-full animate-pulse rounded-xl bg-gray-100" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
