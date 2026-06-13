export default function PageLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-8 w-48 rounded-lg bg-brown/10" />
        <div className="mt-2 h-4 w-32 rounded bg-muted/20" />
      </div>
      <div className="rounded-xl border border-border bg-white p-6 h-96" />
    </div>
  );
}
