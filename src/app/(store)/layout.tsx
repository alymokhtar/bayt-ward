import { Suspense } from "react";
import StoreFooter from "@/components/store/StoreFooter";
import StoreHeader from "@/components/store/StoreHeader";
import { getCachedStoreSettingsPublic } from "@/lib/store/cached-queries";
import { Cormorant_Garamond } from "next/font/google";
import "../store.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getCachedStoreSettingsPublic();

  return (
    <div className={`store-root ${cormorant.variable}`}>
      <Suspense fallback={<div className="h-16 border-b border-[var(--store-border)] bg-white" />}>
        <StoreHeader settings={settings} />
      </Suspense>
      <main id="main-content">{children}</main>
      <StoreFooter settings={settings} />
    </div>
  );
}
