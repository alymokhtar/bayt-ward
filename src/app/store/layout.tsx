import type { Viewport } from "next";
import { Suspense } from "react";
import StoreFooter from "@/components/store/StoreFooter";
import StoreHeader from "@/components/store/StoreHeader";
import { StorefrontStateProvider } from "@/components/store/StorefrontStateProvider";
import { getCachedStoreSettingsPublic, getCachedStoreCategories } from "@/lib/store/cached-queries";
import { getActivePromotionsData } from "@/lib/promotions-data";
import "../store.css";

export const viewport: Viewport = {
  themeColor: "#FDFBF7",
};

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, categories, activePromotions] = await Promise.all([
    getCachedStoreSettingsPublic(),
    getCachedStoreCategories(6),
    getActivePromotionsData(),
  ]);

  return (
    <div className="store-root store-layout flex min-h-screen min-h-dvh flex-col bg-[#FDFBF7]">
      <StorefrontStateProvider activePromotions={activePromotions}>
        <Suspense fallback={<div className="h-16 border-b border-[var(--store-border)] bg-[var(--store-surface)]" />}>
          <StoreHeader settings={settings} categories={categories} />
        </Suspense>
        <main id="main-content" className="flex-1">{children}</main>
        <StoreFooter settings={settings} />
      </StorefrontStateProvider>
    </div>
  );
}
