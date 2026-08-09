import Image from "next/image";
import Link from "next/link";
import {
  Heart,
} from "lucide-react";
import { useMemo } from "react";
import { STORE_NAME_AR } from "@/lib/constants";
import { cn, formatCurrency } from "@/lib/utils";
import { formatPhoneForWhatsApp, getWhatsAppUrl } from "@/lib/whatsapp";
import StoreHeaderControls from "@/components/store/StoreHeaderControls";

type StoreHeaderProps = {
  settings: Record<string, string>;
  categories?: Array<{ id: string; name?: string | null; nameAr?: string | null }>;
};

const STORE_BASE_PATH = "/store";



export default function StoreHeader({ settings, categories }: StoreHeaderProps) {
  const scrolled = false;

  const navLinks = useMemo(() => {
    const links: { href: string; label: string }[] = [];

    links.push({ href: STORE_BASE_PATH, label: "الرئيسية" });

    if (categories && categories.length > 0) {
      categories.slice(0, 4).forEach((c) => {
        links.push({ href: `${STORE_BASE_PATH}/categories/${c.id}`, label: c.nameAr || c.name || "القسم" });
      });
    }

    links.push({ href: `${STORE_BASE_PATH}/contact`, label: "تواصل معنا" });

    return links;
  }, [categories]);

  const storeName = settings.store_name_ar || STORE_NAME_AR;
  const whatsappNumber = settings.store_whatsapp || settings.store_phone || "";
  const currencySymbol = settings.currency_symbol || "MRU";

  const whatsappHref = whatsappNumber
    ? getWhatsAppUrl(
        whatsappNumber,
        "السلام عليكم، أرغب في الاستفسار عن منتجات بيت ورد."
      )
    : `${STORE_BASE_PATH}/contact`;

  const actionButtonClass =
    "relative inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--store-text)] transition hover:bg-[var(--store-gold-soft)] hover:text-[var(--store-gold)]";
  const badgeClass =
    "absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--store-gold)] px-1 text-[10px] font-bold leading-none text-white";

  // Client-side interactive controls component (client component imported above)

  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b border-[var(--store-border)] transition-all duration-300",
        scrolled
          ? "bg-[var(--store-surface)]/95 shadow-[0_10px_30px_rgba(75,54,37,0.08)] backdrop-blur-xl"
          : "bg-[var(--store-surface)]/90 backdrop-blur"
      )}
    >
      <div className="store-container flex w-full flex-row items-center justify-between py-2 sm:py-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <div id="store-menu-button" className="inline-flex h-11 w-11 md:hidden" />

          <Link
            href={STORE_BASE_PATH}
            className="flex items-center gap-2.5 sm:gap-3"
            aria-label={storeName}
          >
            <span className="relative flex h-14 w-14 shrink-0 items-center justify-center sm:h-16 sm:w-16">
              <Image
                src="/images/icon2.png"
                alt={storeName}
                width={64}
                height={64}
                className="h-full w-full object-contain scale-125"
                priority
              />
            </span>
            <span class="font-[Cairo,serif] text-base font-semibold leading-none tracking-[0.12em] text-[var(--store-text)] sm:text-lg md:text-xl" style="
    font-weight: bold;
">بيت ورد</span>
          </Link>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <div id="store-header-actions-placeholder" />
        </div>
      </div>

      {/* interactive client controls (search, cart panel, mobile menu) */}
      <StoreHeaderControls
        settings={settings}
        navLinks={navLinks}
        whatsappHref={whatsappHref}
        currencySymbol={currencySymbol}
        actionButtonClass={actionButtonClass}
        badgeClass={badgeClass}
      />

      <nav className="hidden border-t border-transparent md:block" aria-label="التنقل الرئيسي">
        <div className="store-container flex h-12 items-center justify-center gap-10">
          {navLinks.map((link) => {
            return (
              <Link
                key={`${link.href}-${link.label}`}
                href={link.href}
                className={cn(
                  "store-link-hover text-sm font-medium transition-colors",
                  "text-[var(--store-text)] hover:text-[var(--store-gold)]"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* interactive overlays are rendered by client component */}
    </header>
  );
}
