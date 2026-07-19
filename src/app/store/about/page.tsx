import type { Metadata } from "next";
import { StorePageHero } from "@/components/store/StoreSections";
import { getCachedStoreSettingsPublic } from "@/lib/store/cached-queries";
import { STORE_NAME_AR } from "@/lib/constants";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "من نحن",
  description: "تعرفي على بيت ورد وسبب اختيارنا لتشكيلات الحجاب والملابس النسائية.",
};

export default async function AboutPage() {
  const settings = await getCachedStoreSettingsPublic();
  const storeName = settings.store_name_ar || STORE_NAME_AR;

  return (
    <>
      <StorePageHero
        title="من نحن"
        description={`نقدم لعملائنا في ${storeName} تشكيلات مختارة بعناية من الحجاب والملابس النسائية بأسلوب أنيق ومريح.`}
      />
      <section className="store-container max-w-4xl pb-20">
        <div className="store-shell p-8 text-sm leading-8 text-[var(--store-muted)] md:p-10">
          <p>
            {storeName} هو اسم يرمز إلى الأناقة الهادئة، التفاصيل الدقيقة، والاختيار الدقيق
            في عالم الحجاب والملابس النسائية.
          </p>
          <p className="mt-4">
            نركز على تقديم تشكيلات تجمع بين الراحة، الجودة، واللمسة الأنيقة، مع اهتمام
            خاص بتقديم تجربة تسوق بسيطة ومريحة عبر واتساب أو من خلال المتجر الإلكتروني.
          </p>
        </div>
      </section>
    </>
  );
}
