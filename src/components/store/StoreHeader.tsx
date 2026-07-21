"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Heart,
  Menu,
  MessageCircle,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useStorefrontState } from "@/components/store/StorefrontStateProvider";
import { STORE_NAME_AR } from "@/lib/constants";
import { cn, formatCurrency } from "@/lib/utils";
import { formatPhoneForWhatsApp, getWhatsAppUrl } from "@/lib/whatsapp";

type StoreHeaderProps = {
  settings: Record<string, string>;
};

const STORE_BASE_PATH = "/store";

const NAV_LINKS = [
  { href: `${STORE_BASE_PATH}`, label: "الرئيسية" },
  { href: `${STORE_BASE_PATH}/categories`, label: "طرح" },
  { href: `${STORE_BASE_PATH}/categories`, label: "عبايات" },
  { href: `${STORE_BASE_PATH}/categories`, label: "ملابس منزلية" },
  { href: `${STORE_BASE_PATH}/products`, label: "إكسسوارات" },
  { href: `${STORE_BASE_PATH}/products`, label: "عروض" },
];

export default function StoreHeader({ settings }: StoreHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    cartItems,
    cartCount,
    favoritesCount,
    updateCartQuantity,
    removeFromCart,
    clearCart,
  } = useStorefrontState();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);

  const storeName = settings.store_name_ar || STORE_NAME_AR;
  const whatsappNumber = settings.store_whatsapp || settings.store_phone || "";
  const currencySymbol = settings.currency_symbol || "MRU";
  const cartTotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    [cartItems]
  );

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
    setSearchOpen(false);
    setCartOpen(false);
  }, [pathname]);

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = searchQuery.trim();

    setSearchOpen(false);
    router.push(
      query
        ? `${STORE_BASE_PATH}/search?q=${encodeURIComponent(query)}`
        : `${STORE_BASE_PATH}/search`
    );
  }

  function handleWhatsAppOrder() {
    if (!whatsappNumber || cartItems.length === 0) return;

    const lines = cartItems.map(
      (item) =>
        `- ${item.name} (الكمية: ${item.quantity}) - ${formatCurrency(
          item.unitPrice * item.quantity,
          item.currencySymbol
        )}`
    );
    const message = [
      "مرحباً متجر Bayt Ward، أرغب في إتمام طلب هذه المنتجات:",
      ...lines,
      `الإجمالي: ${formatCurrency(cartTotal, currencySymbol)}`,
    ].join("\n");

    const existingWhatsAppNumber = formatPhoneForWhatsApp(whatsappNumber);
    const encodedMessage = encodeURIComponent(message);

    window.open(
      `https://wa.me/${existingWhatsAppNumber}?text=${encodedMessage}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

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

  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b border-[var(--store-border)] transition-all duration-300",
        scrolled
          ? "bg-[var(--store-surface)]/95 shadow-[0_10px_30px_rgba(75,54,37,0.08)] backdrop-blur-xl"
          : "bg-[var(--store-surface)]/90 backdrop-blur"
      )}
    >
      <div className="store-container relative flex min-h-[3.8rem] items-center justify-center py-1 md:min-h-[5rem]">
        <div className="absolute left-0 top-3 flex items-center gap-1.5 sm:gap-2 md:gap-4">
          <button
            type="button"
            className={actionButtonClass}
            aria-label="بحث"
            aria-expanded={searchOpen}
            title="بحث"
            onClick={() => setSearchOpen((open) => !open)}
          >
            <Search className="h-5 w-5" />
          </button>
          <Link
            href={`${STORE_BASE_PATH}/favorites`}
            className={actionButtonClass}
            aria-label="المفضلة"
            title="المفضلة"
          >
            <Heart className="h-5 w-5" />
            {favoritesCount > 0 && <span className={badgeClass}>{favoritesCount}</span>}
          </Link>
          <button
            type="button"
            className={actionButtonClass}
            aria-label="السلة"
            aria-expanded={cartOpen}
            title="السلة"
            onClick={() => setCartOpen(true)}
          >
            <ShoppingBag className="h-5 w-5" />
            {cartCount > 0 && <span className={badgeClass}>{cartCount}</span>}
          </button>
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

        <Link
          href={STORE_BASE_PATH}
          className="flex items-center justify-center gap-1.5 sm:gap-2"
          aria-label={storeName}
        >
          <span className="relative h-24 w-32 sm:h-28 sm:w-36 md:h-32 md:w-44 lg:h-36 lg:w-52 xl:h-40 xl:w-60">
            <Image
              src="/images/icon2.png"
              alt={storeName}
              fill
              sizes="(min-width: 1280px) 288px, (min-width: 1024px) 256px, (min-width: 768px) 208px, 144px"
              className="object-contain"
              priority
            />
          </span>
          <span className="font-[Cairo,serif] text-base font-semibold leading-none tracking-[0.12em] text-[var(--store-text)] sm:text-lg md:text-xl lg:text-[1.5rem]">
            Bayt Ward
          </span>
        </Link>
      </div>

      {searchOpen && (
        <div className="border-t border-[var(--store-border)] bg-[var(--store-surface)]/95 px-4 py-3 shadow-[0_14px_34px_rgba(75,54,37,0.08)] backdrop-blur-xl">
          <form
            onSubmit={handleSearchSubmit}
            className="store-container flex items-center gap-2 rounded-full border border-[var(--store-border)] bg-[#FDFBF7] px-3 py-2"
            role="search"
          >
            <Search className="h-4 w-4 shrink-0 text-[var(--store-gold)]" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              autoFocus
              className="min-w-0 flex-1 bg-transparent px-2 py-1 text-sm text-[var(--store-text)] outline-none placeholder:text-[var(--store-muted)]"
              placeholder="ابحثي عن منتج..."
              aria-label="بحث المتجر"
            />
            <button
              type="submit"
              className="rounded-full bg-[var(--store-gold)] px-5 py-2 text-xs font-bold text-white transition hover:bg-[var(--store-gold-deep)]"
            >
              بحث
            </button>
          </form>
        </div>
      )}

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

      {cartOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 bg-black/40 z-40"
            aria-label="إغلاق السلة"
            onClick={() => setCartOpen(false)}
          />
          <aside
            className="fixed top-0 left-0 h-screen w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-label="سلة التسوق"
          >
            <div className="flex items-center justify-between border-b border-[var(--store-border)] px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--store-gold)]">
                  Bayt Ward
                </p>
                <h2 className="store-serif text-xl font-semibold text-[var(--store-text)]">
                  سلة التسوق
                </h2>
              </div>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--store-border)] bg-white text-[var(--store-text)]"
                onClick={() => setCartOpen(false)}
                aria-label="إغلاق السلة"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-[#FDFBF7] px-5 py-4">
              {cartItems.length === 0 ? (
                <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--store-border)] bg-white/70 px-6 text-center">
                  <ShoppingBag className="h-10 w-10 text-[var(--store-gold)]" />
                  <p className="mt-4 font-semibold text-[var(--store-text)]">السلة فارغة</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--store-muted)]">
                    أضيفي قطعك المفضلة وستظهر هنا فوراً.
                  </p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {cartItems.map((item) => (
                    <li
                      key={item.id}
                      className="rounded-2xl border border-[var(--store-border)] bg-white/85 p-3 shadow-sm"
                    >
                      <div className="flex gap-3">
                        <Link
                          href={item.href}
                          className="h-20 w-16 shrink-0 overflow-hidden rounded-xl bg-[var(--store-cream)]"
                          onClick={() => setCartOpen(false)}
                        >
                          {item.imageUrl ? (
                            <Image
                              src={item.imageUrl}
                              alt={item.name}
                              width={64}
                              height={80}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="block h-full w-full bg-[var(--store-cream)]" />
                          )}
                        </Link>
                        <div className="min-w-0 flex-1">
                          <Link
                            href={item.href}
                            onClick={() => setCartOpen(false)}
                            className="line-clamp-1 text-sm font-semibold text-[var(--store-text)] hover:text-[var(--store-gold)]"
                          >
                            {item.name}
                          </Link>
                          <p className="mt-1 text-xs text-[var(--store-muted)]">
                            {[item.color, item.size].filter(Boolean).join(" / ")}
                          </p>
                          <p className="mt-2 text-sm font-bold text-[var(--store-text)]" dir="ltr">
                            {formatCurrency(item.unitPrice, item.currencySymbol)}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="self-start rounded-full p-2 text-[var(--store-muted)] transition hover:bg-[var(--store-gold-soft)] hover:text-[var(--store-gold)]"
                          onClick={() => removeFromCart(item.id)}
                          aria-label="حذف من السلة"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="inline-flex items-center rounded-full border border-[var(--store-border)] bg-[#FDFBF7]">
                          <button
                            type="button"
                            className="inline-flex h-8 w-8 items-center justify-center text-[var(--store-text)]"
                            onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                            aria-label="تقليل الكمية"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="min-w-8 text-center text-sm font-semibold">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            className="inline-flex h-8 w-8 items-center justify-center text-[var(--store-text)]"
                            onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                            aria-label="زيادة الكمية"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <p className="text-sm font-bold text-[var(--store-text)]" dir="ltr">
                          {formatCurrency(item.unitPrice * item.quantity, item.currencySymbol)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-t border-[var(--store-border)] bg-white px-5 py-4">
              <div className="flex items-center justify-between text-sm text-[var(--store-muted)]">
                <span>الإجمالي</span>
                <span className="text-lg font-bold text-[var(--store-text)]" dir="ltr">
                  {formatCurrency(cartTotal, currencySymbol)}
                </span>
              </div>
              <button
                type="button"
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#1da851] disabled:cursor-not-allowed disabled:opacity-50"
                onClick={handleWhatsAppOrder}
                disabled={!whatsappNumber || cartItems.length === 0}
              >
                <MessageCircle className="h-4 w-4" />
                اطلبي عبر واتساب
              </button>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  className="rounded-full border border-[var(--store-border)] bg-[#FDFBF7] px-4 py-3 text-sm font-semibold text-[var(--store-text)] transition hover:border-[var(--store-gold)] disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={clearCart}
                  disabled={cartItems.length === 0}
                >
                  تفريغ
                </button>
                <Link
                  href="/store/products"
                  className="rounded-full bg-[var(--store-gold)] px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-[var(--store-gold-deep)]"
                  onClick={() => setCartOpen(false)}
                >
                  متابعة التسوق
                </Link>
              </div>
            </div>
          </aside>
        </>
      )}
    </header>
  );
}
