"use client";

import Button from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { FormEvent } from "react";

interface SearchFormProps {
  action: string;
  placeholder?: string;
  defaultValue?: string;
  children?: React.ReactNode;
}

export default function SearchForm({
  action,
  placeholder = "بحث...",
  defaultValue = "",
  children,
}: SearchFormProps) {
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
      <div className="relative flex-1 min-w-[200px] max-w-md">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
        <input
          name="search"
          defaultValue={defaultValue}
          placeholder={placeholder}
          className="w-full h-10 rounded-lg border border-border bg-white ps-10 pe-4 text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold"
        />
      </div>
      {children}
      <Button type="submit" variant="secondary">
        بحث
      </Button>
    </form>
  );
}
