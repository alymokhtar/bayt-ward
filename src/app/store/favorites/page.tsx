import type { Metadata } from "next";
import FavoritesClient from "@/components/store/FavoritesClient";
import { StorePageHero } from "@/components/store/StoreSections";

export const metadata: Metadata = {
  title: "المفضلة",
  description: "منتجاتك المفضلة من بيت ورد",
};

export default function StoreFavoritesPage() {
  return (
    <>
      <StorePageHero
        title="المفضلة"
        description="القطع التي حفظتها لتعودي إليها بسهولة"
      />
      <section className="store-container pb-20">
        <FavoritesClient />
      </section>
    </>
  );
}
