import Link from "next/link";

interface PaginationNavProps {
  page: number;
  totalPages: number;
  basePath: string;
  searchParams?: Record<string, string | undefined>;
}

function buildHref(
  basePath: string,
  page: number,
  searchParams?: Record<string, string | undefined>
) {
  const params = new URLSearchParams();
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value) params.set(key, value);
    }
  }
  if (page > 1) params.set("page", String(page));
  else params.delete("page");
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export default function PaginationNav({
  page,
  totalPages,
  basePath,
  searchParams,
}: PaginationNavProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between gap-4 mt-6 pt-4 border-t border-border">
      <p className="text-sm text-muted">
        صفحة {page} من {totalPages}
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link
            href={buildHref(basePath, page - 1, searchParams)}
            className="h-9 px-4 inline-flex items-center rounded-lg border border-border text-sm hover:bg-brown/5"
          >
            السابق
          </Link>
        ) : (
          <span className="h-9 px-4 inline-flex items-center rounded-lg border border-border text-sm text-muted opacity-50">
            السابق
          </span>
        )}
        {page < totalPages ? (
          <Link
            href={buildHref(basePath, page + 1, searchParams)}
            className="h-9 px-4 inline-flex items-center rounded-lg border border-border text-sm hover:bg-brown/5"
          >
            التالي
          </Link>
        ) : (
          <span className="h-9 px-4 inline-flex items-center rounded-lg border border-border text-sm text-muted opacity-50">
            التالي
          </span>
        )}
      </div>
    </div>
  );
}
