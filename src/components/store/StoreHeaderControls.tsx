"use client";

import React, { useEffect, useMemo, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { useStorefrontState } from "@/components/store/StorefrontStateProvider";
import { getWhatsAppUrl } from "@/lib/whatsapp";
import { formatCurrency } from "@/lib/utils";

type Props = {
  settings: Record<string, string>;
  navLinks: Array<{ href: string; label: string }>;
  whatsappHref: string;
  currencySymbol: string;
  actionButtonClass: string;
  badgeClass: string;
};

export default function StoreHeaderControls({
  settings,
  navLinks,
  whatsappHref,
  currencySymbol,
  actionButtonClass,
  badgeClass,
}: Props) {
  const router = useRouter();
  const { cartItems, cartCount, favoritesCount, updateCartQuantity, removeFromCart, clearCart } =
    useStorefrontState();

  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function handleRouteChange() {
      setMenuOpen(false);
      setSearchOpen(false);
      setCartOpen(false);
    }

    // close overlays on navigation
    // next/navigation doesn't expose router events, so rely on mount/unmount or manual calls
    return () => {
      // noop
    };
  }, [router]);

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = searchQuery.trim();
    setSearchOpen(false);
    router.push(query ? `/store/search?q=${encodeURIComponent(query)}` : `/store/search`);
  }

  function handleWhatsAppOrder() {
    const whatsappNumber = settings.store_whatsapp || settings.store_phone || "";
    if (!whatsappNumber || cartItems.length === 0) return;

    const origin =
      typeof window !== "undefined" && window.location?.origin
        ? window.location.origin
        : process.env.NEXT_PUBLIC_SITE_URL || "";

    const lines = cartItems.map((item) => {
      const productUrl = item.productId
        ? `${origin}/store/product/${item.productId}`.replace(/([^:]\/)\/+/g, "$1")
        : item.href;

      const details = [item.color, item.size].filter(Boolean).join(" / ");

      return [
        `- المنتج: ${item.name}`,
        `  المواصفات: ${details || "بدون مواصفات"} | الكمية: ${item.quantity}`,
        `  السعر: ${formatCurrency(item.unitPrice * item.quantity, item.currencySymbol)}`,
        `  الرابط: ${productUrl}`,
      ].join("\n");
    });

    const message = [
      "مرحباً متجر Bayt Ward، أرغب في إتمام طلب هذه المنتجات:",
      ...lines,
      `الإجمالي: ${formatCurrency(cartItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0), currencySymbol)}`,
    ].join("\n");

    const whatsappUrl = getWhatsAppUrl(whatsappNumber, message);

    clearCart();
    setCartOpen(false);
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }

  const actions = (
    <>
      <button
        id="store-search-button"
        type="button"
        className={actionButtonClass}
        aria-label="بحث"
        aria-expanded={searchOpen}
        title="بحث"
        onClick={() => setSearchOpen((open) => !open)}
      >
        <Search className="h-5 w-5" />
      </button>
      <Link href={`/store/favorites`} className={actionButtonClass} aria-label="المفضلة" title="المفضلة">
        <Heart className="h-5 w-5" />
        {favoritesCount > 0 && <span className={badgeClass}>{favoritesCount}</span>}
      </Link>
      <button
        id="store-cart-button"
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
    </>
  );

  // render menu icon into the server-rendered menu button
  const menuButtonNode = typeof document !== "undefined" ? document.getElementById("store-menu-button") : null;
  const actionsPlaceholder = typeof document !== "undefined" ? document.getElementById("store-header-actions-placeholder") : null;

  return (
    <>
      {mounted && menuButtonNode
        ? createPortal(
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-[var(--store-text)] shadow-sm transition hover:bg-amber-100 md:hidden"
              aria-label={menuOpen ? "إغلاق القائمة" : "فتح القائمة"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>,
            menuButtonNode
          )
        : null}

      {mounted && actionsPlaceholder ? createPortal(actions, actionsPlaceholder) : null}

      {searchOpen && (
        <div className="border-t border-[var(--store-border)] bg-[var(--store-surface)]/95 px-4 py-3 shadow-[0_14px_34px_rgba(75,54,37,0.08)] backdrop-blur-xl">
          <form onSubmit={handleSearchSubmit} className="store-container flex items-center gap-2 rounded-full border border-[var(--store-border)] bg-[#FDFBF7] px-3 py-2" role="search">
            <Search className="h-4 w-4 shrink-0 text-[var(--store-gold)]" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              autoFocus
              className="min-w-0 flex-1 bg-transparent px-2 py-1 text-sm text-[var(--store-text)] outline-none placeholder:text-[var(--store-muted)]"
              placeholder="ابحثي عن منتج..."
              aria-label="بحث المتجر"
            />
            <button type="submit" className="rounded-full bg-[var(--store-gold)] px-5 py-2 text-xs font-bold text-white transition hover:bg-[var(--store-gold-deep)]">
              بحث
            </button>
          </form>
        </div>
      )}

      {menuOpen && (
        <nav className="border-t border-[var(--store-border)] bg-[var(--store-surface)] px-4 py-4 md:hidden" aria-label="قائمة الجوال">
          <ul className="space-y-1">
            {navLinks.map((link) => (
              <li key={`${link.href}-${link.label}`}>
                <Link href={link.href} className="block rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--store-text)] transition hover:bg-[var(--store-gold-soft)]" onClick={() => setMenuOpen(false)}>
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="mt-2 block rounded-lg bg-[var(--store-gold)] px-3 py-2.5 text-sm font-bold text-white">
                تواصل عبر واتساب
              </a>
            </li>
          </ul>
        </nav>
      )}

      {cartOpen &&
        mounted &&
        createPortal(
          <>
            <button type="button" className="fixed inset-0 bg-black/40 z-[90]" aria-label="إغلاق السلة" onClick={() => setCartOpen(false)} />
            <aside className="fixed top-0 left-0 h-screen w-full max-w-sm bg-white shadow-2xl z-[100] flex flex-col" role="dialog" aria-modal="true" aria-label="سلة التسوق">
              <div className="flex items-center justify-between border-b border-[var(--store-border)] px-5 py-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--store-gold)]">Bayt Ward</p>
                  <h2 className="store-serif text-xl font-semibold text-[var(--store-text)]">سلة التسوق</h2>
                </div>
                <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--store-border)] bg-white text-[var(--store-text)]" onClick={() => setCartOpen(false)} aria-label="إغلاق السلة">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto bg-[#FDFBF7] px-5 py-4">
                {cartItems.length === 0 ? (
                  <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--store-border)] bg-white/70 px-6 text-center">
                    <ShoppingBag className="h-10 w-10 text-[var(--store-gold)]" />
                    <p className="mt-4 font-semibold text-[var(--store-text)]">السلة فارغة</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--store-muted)]">أضيفي قطعك المفضلة وستظهر هنا فوراً.</p>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {cartItems.map((item) => (
                      <li key={item.id} className="rounded-2xl border border-[var(--store-border)] bg-white/85 p-3 shadow-sm">
                        <div className="flex gap-3">
                          <Link href={item.href} className="h-20 w-16 shrink-0 overflow-hidden rounded-xl bg-[var(--store-cream)]" onClick={() => setCartOpen(false)}>
                            {item.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={item.imageUrl} alt={item.name} width={64} height={80} className="h-full w-full object-cover" />
                            ) : (
                              <span className="block h-full w-full bg-[var(--store-cream)]" />
                            )}
                          </Link>
                          <div className="min-w-0 flex-1">
                            <Link href={item.href} onClick={() => setCartOpen(false)} className="line-clamp-1 text-sm font-semibold text-[var(--store-text)] hover:text-[var(--store-gold)]">
                              {item.name}
                            </Link>
                            <p className="mt-1 text-xs text-[var(--store-muted)]">{[item.color, item.size].filter(Boolean).join(" / ")}</p>
                            <p className="mt-2 text-sm font-bold text-[var(--store-text)]" dir="ltr">{formatCurrency(item.unitPrice, item.currencySymbol)}</p>
                          </div>
                          <button type="button" className="self-start rounded-full p-2 text-[var(--store-muted)] transition hover:bg-[var(--store-gold-soft)] hover:text-[var(--store-gold)]" onClick={() => removeFromCart(item.id)} aria-label="حذف من السلة">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <div className="inline-flex items-center rounded-full border border-[var(--store-border)] bg-[#FDFBF7]">
                            <button type="button" className="inline-flex h-8 w-8 items-center justify-center text-[var(--store-text)]" onClick={() => updateCartQuantity(item.id, item.quantity - 1)} aria-label="تقليل الكمية">
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="min-w-8 text-center text-sm font-semibold">{item.quantity}</span>
                            <button type="button" className="inline-flex h-8 w-8 items-center justify-center text-[var(--store-text)]" onClick={() => updateCartQuantity(item.id, item.quantity + 1)} aria-label="زيادة الكمية">
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <p className="text-sm font-bold text-[var(--store-text)]" dir="ltr">{formatCurrency(item.unitPrice * item.quantity, item.currencySymbol)}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="border-t border-[var(--store-border)] bg-white px-5 py-4">
                <div className="flex items-center justify-between text-sm text-[var(--store-muted)]">
                  <span>الإجمالي</span>
                  <span className="text-lg font-bold text-[var(--store-text)]" dir="ltr">{formatCurrency(cartItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0), currencySymbol)}</span>
                </div>
                <button type="button" className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#1da851] disabled:cursor-not-allowed disabled:opacity-50" onClick={handleWhatsAppOrder} disabled={!settings.store_whatsapp && !settings.store_phone && cartItems.length === 0}>
                  <MessageCircle className="h-4 w-4" />
                  اطلبي عبر واتساب
                </button>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <button type="button" className="rounded-full border border-[var(--store-border)] bg-[#FDFBF7] px-4 py-3 text-sm font-semibold text-[var(--store-text)] transition hover:border-[var(--store-gold)] disabled:cursor-not-allowed disabled:opacity-50" onClick={clearCart} disabled={cartItems.length === 0}>
                    تفريغ
                  </button>
                  <Link href="/store/products" className="rounded-full bg-[var(--store-gold)] px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-[var(--store-gold-deep)]" onClick={() => setCartOpen(false)}>
                    متابعة التسوق
                  </Link>
                </div>
              </div>
            </aside>
          </>,
          document.body
        )}
    </>
  );
}
