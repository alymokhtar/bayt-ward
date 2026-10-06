"use client";

import Button from "@/components/ui/Button";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

export default function InvoiceBackButton() {
  const router = useRouter();

  function handleBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.replace("/sales");
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={handleBack}
      aria-label="العودة"
    >
      <ArrowRight className="h-5 w-5" />
    </Button>
  );
}
