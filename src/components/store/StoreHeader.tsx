"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, Search, ShoppingBag, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import { STORE_NAME_AR } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { getWhatsAppUrl } from "@/lib/whatsapp";

type StoreHeaderProps = {
  settings: Record<string, string>;
};

const STORE_BASE_PATH = "/store";

const NAV_LINKS = [
  { href: `${STORE_BASE_PATH}`, label: "الرئيسية" },
  { href: `${STORE_BASE_PATH}/categories`, label: "طرح" },
  { href: `${STORE_BASE_PATH}/categories`, label: "عبايات" },
  { href: `${STORE_BASE_PATH}/categories`, label: "ملابس منزلية" },
  { href: `${STORE_BASE_PATH}/categories`, label: "بيجامات" },
  { href: `${STORE_BASE_PATH}/products`, label: "إكسسوارات" },
  { href: `${STORE_BASE_PATH}/products`, label: "عروض" },
];

export default function StoreHeader({ settings }: StoreHeaderProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const storeName = settings.store_name_ar || STORE_NAME_AR;
  const whatsappNumber = settings.store_whatsapp || settings.store_phone || "01234567890";

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMenuOpen(false);
  }, [pathname]);

  const whatsappHref = whatsappNumber
    ? getWhatsAppUrl(whatsappNumber, "السلام عليكم، أرغب في الاستفسار عن منتجات بيت ورد.")
    : `${STORE_BASE_PATH}/contact`;

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-[var(--store-border)] transition-all duration-300",
        scrolled
          ? "bg-[var(--store-surface)]/95 shadow-[0_10px_30px_rgba(75,54,37,0.08)] backdrop-blur-xl"
          : "bg-[var(--store-surface)]/90 backdrop-blur"
      )}
    >
      <div className="store-container relative flex min-h-[6.6rem] items-center justify-center py-3 md:min-h-[8.9rem] md:pb-0">
        <div className="absolute left-0 top-4 hidden items-center gap-4 text-[var(--store-text)] md:flex">
          <button
            type="button"
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-[var(--store-gold-soft)]"
            aria-label="السلة - قريبا"
            title="السلة - قريبا"
          >
            <ShoppingBag className="h-5 w-5" />
            <span className="absolute right-1 top-0 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--store-gold)] px-1 text-[10px] font-bold text-white">
              2
            </span>
          </button>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-[var(--store-gold-soft)]"
            aria-label="حسابي - قريبا"
            title="حسابي - قريبا"
          >
            <UserRound className="h-5 w-5" />
          </button>
          <Link
            href={`${STORE_BASE_PATH}/search`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-[var(--store-gold-soft)]"
            aria-label="بحث"
          >
            <Search className="h-5 w-5" />
          </Link>
        </div>

        <button
          type="button"
          className="absolute right-0 top-5 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--store-border)] bg-white text-[var(--store-text)] shadow-sm md:hidden"
          aria-label={menuOpen ? "إغلاق القائمة" : "فتح القائمة"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        <Link href={STORE_BASE_PATH} className="flex items-center justify-center" aria-label={storeName}>
          <span className="relative h-16 w-24 sm:h-20 sm:w-28 md:h-24 md:w-36 lg:h-28 lg:w-40 xl:h-32 xl:w-44">
            <Image
              src="/images/icon2.png"
              alt={storeName}
              fill
              sizes="(min-width: 1280px) 250px, (min-width: 1024px) 160px, (min-width: 768px) 144px, 96px"
              className="object-contain"
              priority
            />
          </span>
        </Link>
      </div>

      <nav className="hidden border-t border-transparent md:block" aria-label="التنقل الرئيسي">
        <div className="store-container flex h-12 items-center justify-center gap-10">
          {NAV_LINKS.map((link) => {
            const active =
              link.href === STORE_BASE_PATH
                ? pathname === STORE_BASE_PATH || pathname === `${STORE_BASE_PATH}/`
                : pathname === link.href || pathname.startsWith(`${link.href}/`);

            return (
              <Link
                key={`${link.href}-${link.label}`}
                href={link.href}
                data-active={active}
                className={cn(
                  "store-link-hover text-sm font-medium transition-colors",
                  active
                    ? "text-[var(--store-gold)]"
                    : "text-[var(--store-text)] hover:text-[var(--store-gold)]"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {menuOpen && (
        <nav
          className="border-t border-[var(--store-border)] bg-[var(--store-surface)] px-4 py-4 md:hidden"
          aria-label="قائمة الجوال"
        >
          <ul className="space-y-1">
            {NAV_LINKS.map((link) => (
              <li key={`${link.href}-${link.label}`}>
                <Link
                  href={link.href}
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--store-text)] transition hover:bg-[var(--store-gold-soft)]"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 block rounded-lg bg-[var(--store-gold)] px-3 py-2.5 text-sm font-bold text-white"
              >
                تواصل عبر واتساب
              </a>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
