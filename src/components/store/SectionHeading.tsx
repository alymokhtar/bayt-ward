import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "center" | "start";
  className?: string;
};

export default function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "mb-7 space-y-2 md:mb-9",
        align === "center" ? "mx-auto max-w-2xl text-center" : "text-start",
        className
      )}
    >
      {eyebrow && (
        <p className="text-xs font-medium text-[var(--store-gold)]">{eyebrow}</p>
      )}
      <h2 className="text-2xl font-bold text-[var(--store-text)] md:text-3xl">
        {title}
      </h2>
      <div
        className={cn(
          "flex items-center gap-3 text-[var(--store-gold)]",
          align === "center" ? "justify-center" : "justify-start"
        )}
        aria-hidden="true"
      >
        <span className="h-px w-20 bg-[var(--store-gold)]/50" />
        <Sparkles className="h-4 w-4" />
        <span className="h-px w-20 bg-[var(--store-gold)]/50" />
      </div>
      {description && (
        <p className="text-sm leading-7 text-[var(--store-muted)] md:text-base">
          {description}
        </p>
      )}
    </div>
  );
}
