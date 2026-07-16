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
        "mb-10 space-y-3",
        align === "center" ? "text-center mx-auto max-w-2xl" : "text-start",
        className
      )}
    >
      {eyebrow && (
        <p className="text-xs uppercase tracking-[0.35em] text-[var(--store-gold)]">
          {eyebrow}
        </p>
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
