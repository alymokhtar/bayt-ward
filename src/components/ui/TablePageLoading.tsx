export default function TablePageLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-8 w-48 rounded-lg bg-brown/10" />
        <div className="mt-2 h-4 w-32 rounded bg-muted/20" />
      </div>
      <div className="rounded-xl border border-border bg-white p-6 space-y-4">
        <div className="h-10 w-full max-w-md rounded-lg bg-brown/5" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-12 rounded-lg bg-brown/5" />
        ))}
      </div>
    </div>
  );
}
