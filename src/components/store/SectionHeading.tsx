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
        "mb-8 space-y-3 md:mb-10",
        align === "center" ? "mx-auto max-w-2xl text-center" : "text-start",
        className
      )}
    >
      {eyebrow && (
        <div className="flex items-center justify-center gap-3 text-[var(--store-gold)] md:justify-start">
          <span className="h-px w-8 bg-[var(--store-border)]" />
          <p className="text-[11px] uppercase tracking-[0.35em]">
            {eyebrow}
          </p>
          <span className="h-px w-8 bg-[var(--store-border)]" />
        </div>
      )}
      <h2 className="store-serif text-3xl font-semibold text-[var(--store-text)] md:text-4xl">
        {title}
      </h2>
      {description && (
        <p className="text-sm leading-7 text-[var(--store-muted)] md:text-base">
          {description}
        </p>
      )}
    </div>
  );
}
