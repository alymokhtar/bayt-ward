import type { Viewport } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import StoreFooter from "@/components/store/StoreFooter";
import StoreHeader from "@/components/store/StoreHeader";
import { StorefrontStateProvider } from "@/components/store/StorefrontStateProvider";
import { getCachedStoreSettingsPublic } from "@/lib/store/cached-queries";
import localFont from "next/font/local";
import "../store.css";

const cairo = localFont({
  src: "../../../public/fonts/arabtype.ttf",
  variable: "--font-cairo",
  weight: "300 700",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#FDFBF7",
};

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();
  const settings = await getCachedStoreSettingsPublic();

  return (
    <div className={`store-root store-layout ${cairo.variable} ${cairo.className} flex min-h-screen min-h-dvh flex-col bg-[#FDFBF7]`}>
      <StorefrontStateProvider>
        <Suspense fallback={<div className="h-16 border-b border-[var(--store-border)] bg-[var(--store-surface)]" />}>
          <StoreHeader settings={settings} />
        </Suspense>
        <main id="main-content" className="flex-1">{children}</main>
        <StoreFooter settings={settings} />
      </StorefrontStateProvider>
    </div>
  );
}
