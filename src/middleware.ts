"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Heart, Menu, Search, ShoppingBag, X } from "lucide-react";
import { useEffect, useState } from "react";
import { STORE_NAME, STORE_NAME_AR } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { getWhatsAppUrl } from "@/lib/whatsapp";
import { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "bayt-ward-secret-key-2024"
);

const PROTECTED_ROUTES = [
  "/dashboard",
  "/pos",
  "/products",
  "/inventory",
  "/barcodes",
  "/sales",
  "/returns",
  "/customers",
  "/whatsapp",
  "/suppliers",
  "/purchases",
  "/expenses",
  "/reports",
  "/employees",
  "/settings",
];

/** Public storefront paths rewritten from dashboard URLs for guests */
const STOREFRONT_REWRITES: Record<string, string> = {
  "/products": "/store/products",
  "/categories": "/store/categories",
};

const CACHE_NAME = "bayt-ward-v2";
const STATIC_ASSETS = [
  "/",
  "/dashboard",
  "/pos",
  "/login",
  "/manifest.json",
  "/images/logo-light.png",
];

async function isValidSession(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

function isProtectedRoute(pathname: string): boolean {
  if (pathname === "/store" || pathname.startsWith("/store/")) {
    return false;
  }

  return PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

export default function StoreHeader({ settings }: StoreHeaderProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const storeName = settings.store_name_ar || STORE_NAME_AR;
  const whatsappNumber = settings.store_whatsapp || settings.store_phone || "";

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
          ? "border-b border-[var(--store-border)] bg-white/95 shadow-sm backdrop-blur-md"
          : "bg-[var(--store-bg)]/90 backdrop-blur-sm"
      )}
    >
      <div className="store-container">
        <div className="flex h-16 items-center justify-between gap-4 md:h-20">
          <Link href={STORE_BASE_PATH} className="flex items-center gap-3 shrink-0" aria-label={storeName}>
            <Image
              src="/store-logo.png"
              alt={storeName}
              width={32}
              height={32}
            />
            <span>{storeName}</span>
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
                    "store-link-hover text-sm tracking-wide transition-colors",
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
            <Link
              href={`${STORE_BASE_PATH}/search`}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--store-text)] transition hover:bg-[var(--store-gold-soft)]"
              aria-label="بحث"
            >
              <Search className="h-5 w-5" />
            </Link>
            <Link
              href={`${STORE_BASE_PATH}/cart`}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--store-text)] transition hover:bg-[var(--store-gold-soft)]"
              aria-label="سلة المشتريات"
            >
              <ShoppingBag className="h-5 w-5" />
            </Link>
            <Link
              href={`${STORE_BASE_PATH}/whatsapp`}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--store-text)] transition hover:bg-[var(--store-gold-soft)]"
              aria-label="واتساب"
            >
              <X className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

type StoreFooterProps = {
  settings: Record<string, string>;
};

export function StoreFooter({ settings }: StoreFooterProps) {
  const storeName = settings.store_name_ar || STORE_NAME_AR;
  const storeNameEn = settings.store_name || STORE_NAME;
  const whatsappNumber = settings.store_whatsapp || settings.store_phone || "";
  const address = settings.store_address || "";
  const year = new Date().getFullYear();

  const whatsappHref = whatsappNumber
    ? getWhatsAppUrl(whatsappNumber, "السلام عليكم، أرغب في التواصل مع بيت ورد.")
    : `${STORE_BASE_PATH}/contact`;

  return (
    <footer className="mt-20 border-t border-[var(--store-border)] bg-[var(--store-text)] text-white">
      <div className="store-container">
        <div className="flex h-16 items-center justify-between gap-4 md:h-20">
          <div className="flex items-center gap-3 shrink-0">
            <Image
              src="/store-logo.png"
              alt={storeName}
              width={32}
              height={32}
            />
            <span>{storeName}</span>
          </div>

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
                    "store-link-hover text-sm tracking-wide transition-colors",
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
            <Link
              href={`${STORE_BASE_PATH}/search`}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--store-text)] transition hover:bg-[var(--store-gold-soft)]"
              aria-label="بحث"
            >
              <Search className="h-5 w-5" />
            </Link>
            <Link
              href={`${STORE_BASE_PATH}/cart`}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--store-text)] transition hover:bg-[var(--store-gold-soft)]"
              aria-label="سلة المشتريات"
            >
              <ShoppingBag className="h-5 w-5" />
            </Link>
            <Link
              href={`${STORE_BASE_PATH}/whatsapp`}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--store-text)] transition hover:bg-[var(--store-gold-soft)]"
              aria-label="واتساب"
            >
              <X className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("session")?.value;
  const hasValidSession = token ? await isValidSession(token) : false;

  if (!hasValidSession && STOREFRONT_REWRITES[pathname]) {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = STOREFRONT_REWRITES[pathname];
    return NextResponse.rewrite(rewriteUrl);
  }

  // Guests hitting admin-style product URLs should see the public storefront page
  const adminProductDetailMatch = pathname.match(/^\/products\/([^/]+)$/);
  if (!hasValidSession && adminProductDetailMatch) {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = `/store/product/${adminProductDetailMatch[1]}`;
    return NextResponse.rewrite(rewriteUrl);
  }

  if (isProtectedRoute(pathname) && !hasValidSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    const response = NextResponse.redirect(loginUrl);
    if (token) {
      response.cookies.delete("session");
    }
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/pos/:path*",
    "/products/:path*",
    "/inventory/:path*",
    "/barcodes/:path*",
    "/sales/:path*",
    "/returns/:path*",
    "/customers/:path*",
    "/whatsapp/:path*",
    "/suppliers/:path*",
    "/purchases/:path*",
    "/expenses/:path*",
    "/reports/:path*",
    "/employees/:path*",
    "/settings/:path*",
    "/login",
  ],
};

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.pathname.startsWith("/api/")) return;
  if (url.pathname.startsWith("/_next/")) return;
  if (url.pathname === "/sw.js") return;
  if (isStorePath(url.pathname)) return;

  // Let the browser handle page navigations normally for faster, fresh routing.
  if (event.request.mode === "navigate") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && url.origin === self.location.origin) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((r) => r || caches.match("/")))
  );
});
