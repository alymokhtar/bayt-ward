export default function PosLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-10 w-48 rounded-lg bg-brown/10" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-white h-96" />
        <div className="rounded-xl border border-border bg-white h-96" />
      </div>
    </div>
  );
}
