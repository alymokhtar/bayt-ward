"use client";

import Button from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { FormEvent } from "react";

interface FilterFormProps {
  action: string;
  children: React.ReactNode;
  submitLabel?: string;
}

export default function FilterForm({
  action,
  children,
  submitLabel = "تصفية",
}: FilterFormProps) {
  const router = useRouter();

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const params = new URLSearchParams();

    formData.forEach((value, key) => {
      if (typeof value === "string" && value.trim()) {
        params.set(key, value.trim());
      }
    });

    const query = params.toString();
    router.push(`${action}${query ? `?${query}` : ""}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 mb-6">
      {children}
      <Button type="submit" variant="secondary">
        {submitLabel}
      </Button>
    </form>
  );
}
