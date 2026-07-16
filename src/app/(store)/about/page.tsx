import type { Metadata } from "next";
import { StorePageHero } from "@/components/store/StoreSections";
import { getCachedStoreSettingsPublic } from "@/lib/store/cached-queries";
import { STORE_NAME, STORE_NAME_AR } from "@/lib/constants";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getCachedStoreSettingsPublic();
  const name = settings.store_name_ar || STORE_NAME_AR;

  return {
    title: "من نحن",
    description: `تعرفي على ${name} — متجر الحجاب والملابس النسائية.`,
  };
}

export default async function AboutPage() {
  const settings = await getCachedStoreSettingsPublic();
  const storeName = settings.store_name_ar || STORE_NAME_AR;

  return (
    <>
      <StorePageHero
        title="من نحن"
        description={`${storeName} — وجهتكِ للأناقة الهادئة`}
      />
      <section className="store-container max-w-3xl pb-20 space-y-6 text-sm leading-8 text-[var(--store-muted)]">
        <p>
          {storeName} ({settings.store_name || STORE_NAME}) متجر متخصص في الحجاب
          والملابس النسائية، يقدم تشكيلات تجمع بين الأناقة والراحة والجودة.
        </p>
        <p>
          نؤمن أن كل امرأة تستحق قطعاً تعكس شخصيتها — لذلك نختار منتجاتنا
          بعناية، ونركز على التفاصيل، الخامات، والتجربة السلسة من التصفح حتى
          الطلب.
        </p>
        <p>
          يمكنكِ تصفح منتجاتنا المنشورة وطلب أي قطعة مباشرة عبر واتساب — فريقنا
          يساعدكِ في اختيار المقاس واللون المناسب.
        </p>
      </section>
    </>
  );
}
