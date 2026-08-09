export default function StoreLoading() {
  return (
    <div className="store-container py-8">
      <div className="animate-pulse rounded-2xl border border-[var(--store-border)] bg-[var(--store-surface)] p-6">
        <div className="h-8 w-56 rounded bg-[var(--store-gold-soft)]" />
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-48 rounded-xl bg-[var(--store-cream)]" />
          ))}
        </div>
      </div>
    </div>
  );
}
