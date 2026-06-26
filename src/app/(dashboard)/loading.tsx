export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-8 w-48 rounded-lg bg-brown/10" />
        <div className="mt-2 h-4 w-32 rounded bg-muted/20" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-white p-6 h-28" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-border bg-white h-[280px]" />
        <div className="rounded-xl border border-border bg-white h-48" />
      </div>
      <div className="rounded-xl border border-border bg-white h-64" />
    </div>
  );
}
