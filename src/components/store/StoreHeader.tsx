"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Heart, Menu, Search, ShoppingBag, X } from "lucide-react";
import { useEffect, useState } from "react";
import { STORE_NAME, STORE_NAME_AR } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { getWhatsAppUrl } from "@/lib/whatsapp";

type StoreHeaderProps = {
  settings: Record<string, string>;
};

const STORE_BASE_PATH = "/store";

const NAV_LINKS = [
  { href: `${STORE_BASE_PATH}`, label: "الرئيسية" },
  { href: `${STORE_BASE_PATH}/products`, label: "المنتجات" },
  { href: `${STORE_BASE_PATH}/categories`, label: "الأقسام" },
  { href: `${STORE_BASE_PATH}/about`, label: "من نحن" },
  { href: `${STORE_BASE_PATH}/contact`, label: "تواصل معنا" },
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
    setMenuOpen(false);
  }, [pathname]);

  const whatsappHref = whatsappNumber
    ? getWhatsAppUrl(whatsappNumber, "السلام عليكم، أرغب في الاستفسار عن منتجات بيت ورد.")
    : `${STORE_BASE_PATH}/contact`;

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-[var(--store-border)] bg-[var(--store-surface)]/90 shadow-[0_14px_40px_rgba(76,50,27,0.08)] backdrop-blur-2xl"
          : "bg-[var(--store-bg)]/80 backdrop-blur"
      )}
    >
      <div className="border-b border-[var(--store-border)]/70 bg-[var(--store-surface)]/70">
        <div className="store-container flex flex-wrap items-center justify-end gap-2 px-2 py-2 text-[11px] text-[var(--store-muted)] sm:px-0">
          <div className="flex items-center gap-2">
            <Link
              href={`${STORE_BASE_PATH}/search`}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--store-border)] bg-white text-[var(--store-text)]"
              aria-label="بحث"
            >
              <Search className="h-4 w-4" />
            </Link>
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--store-border)] bg-white text-[var(--store-text)]"
              aria-label="المفضلة — قريباً"
              title="المفضلة — قريباً"
            >
              <Heart className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--store-border)] bg-white text-[var(--store-text)]"
              aria-label="السلة — قريباً"
              title="السلة — قريباً"
            >
              <ShoppingBag className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      <div className="store-container">
        <div className="flex h-16 items-center justify-between gap-4 md:h-20">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--store-border)] bg-[var(--store-surface)] text-[var(--store-text)] shadow-sm md:hidden"
            aria-label={menuOpen ? "إغلاق القائمة" : "فتح القائمة"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <Link href={STORE_BASE_PATH} className="flex items-center gap-3 shrink-0" aria-label={storeName}>
            <div className="relative h-10 w-10 overflow-hidden rounded-full border border-[var(--store-border)] bg-[var(--store-surface)] shadow-sm md:h-12 md:w-12">
              <Image
                src="/images/logo-light.png"
                alt={storeName}
                fill
                sizes="48px"
                className="object-contain p-1"
                priority
              />
            </div>
            <div className="hidden sm:block">
              <p className="store-serif text-xl font-semibold leading-none text-[var(--store-text)] md:text-2xl">
                {storeName}
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.35em] text-[var(--store-muted)]">
                {settings.store_name || STORE_NAME}
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 md:flex" aria-label="التنقل الرئيسي">
            {NAV_LINKS.map((link) => {
              const active =
                link.href === STORE_BASE_PATH
                  ? pathname === STORE_BASE_PATH || pathname === `${STORE_BASE_PATH}/`
                  : pathname === link.href || pathname.startsWith(`${link.href}/`);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "store-link-hover text-sm tracking-[0.2em] transition-colors",
                    active
                      ? "text-[var(--store-gold)]"
                      : "text-[var(--store-text)] hover:text-[var(--store-gold)]"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1 sm:gap-2">
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center gap-2 rounded-full bg-[#25D366] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#1da851] sm:inline-flex"
            >
              واتساب
            </a>
          </div>
        </div>
      </div>

      {menuOpen && (
        <nav
          className="border-t border-[var(--store-border)] bg-[var(--store-surface)] px-4 py-4 md:hidden"
          aria-label="قائمة الجوال"
        >
          <ul className="space-y-1">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="block rounded-2xl px-3 py-2.5 text-sm text-[var(--store-text)] transition hover:bg-[var(--store-gold-soft)]"
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
                className="block rounded-2xl bg-[#25D366] px-3 py-2.5 text-sm font-medium text-white"
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
