"use client";

import Button from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export default function DashboardDataError({
  message,
}: {
  message: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
    >
      <p>{message}</p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        loading={isPending}
        onClick={() => startTransition(() => router.refresh())}
      >
        إعادة المحاولة
      </Button>
    </div>
  );
}
