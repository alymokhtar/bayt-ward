import type { ReactNode } from "react";

type StoreSocialLinkProps = {
  href: string;
  label: string;
  title: string;
  hoverClasses?: string;
  children: ReactNode;
};

export default function StoreSocialLink({
  href,
  label,
  title,
  hoverClasses = "",
  children,
}: StoreSocialLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={title}
      className={`inline-flex h-9 w-9 transform items-center justify-center rounded-full bg-[#f7efe6] text-[var(--store-text)] transition-transform duration-200 hover:scale-110 ${hoverClasses}`}
    >
      {children}
    </a>
  );
}
