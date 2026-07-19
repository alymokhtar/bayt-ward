import type { Metadata } from "next";
import { StorePageHero } from "@/components/store/StoreSections";
import { getCachedStoreSettingsPublic } from "@/lib/store/cached-queries";
import { getWhatsAppUrl } from "@/lib/whatsapp";
import { STORE_NAME_AR } from "@/lib/constants";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "تواصل معنا",
  description: "تواصلي مع بيت ورد عبر واتساب أو الهاتف.",
};

export default async function ContactPage() {
  const settings = await getCachedStoreSettingsPublic();
  const storeName = settings.store_name_ar || STORE_NAME_AR;
  const whatsappNumber = settings.store_whatsapp || settings.store_phone || "";

  const whatsappHref = whatsappNumber
    ? getWhatsAppUrl(whatsappNumber, `السلام عليكم، أرغب في التواصل مع ${storeName}.`)
    : null;

  return (
    <>
      <StorePageHero
        title="تواصل معنا"
        description="نسعد بخدمتكِ — تواصلي معنا في أي وقت"
      />
      <section className="store-container max-w-xl pb-20">
        <div className="store-shell space-y-4 p-8 md:p-10">
          {whatsappNumber && whatsappHref && (
            <div className="rounded-[1.25rem] border border-[var(--store-border)] bg-white/70 p-4">
              <p className="text-[11px] uppercase tracking-[0.25em] text-[var(--store-gold)]">
                واتساب
              </p>
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex text-lg font-medium text-[var(--store-text)] hover:text-[var(--store-gold)]"
                dir="ltr"
              >
                {whatsappNumber}
              </a>
            </div>
          )}
          {settings.store_phone && (
            <div className="rounded-[1.25rem] border border-[var(--store-border)] bg-white/70 p-4">
              <p className="text-[11px] uppercase tracking-[0.25em] text-[var(--store-gold)]">
                الهاتف
              </p>
              <p className="mt-2 text-lg" dir="ltr">
                {settings.store_phone}
              </p>
            </div>
          )}
          {settings.store_address && (
            <div className="rounded-[1.25rem] border border-[var(--store-border)] bg-white/70 p-4">
              <p className="text-[11px] uppercase tracking-[0.25em] text-[var(--store-gold)]">
                العنوان
              </p>
              <p className="mt-2 text-sm leading-7 text-[var(--store-muted)]">
                {settings.store_address}
              </p>
            </div>
          )}
          {settings.store_email && (
            <div className="rounded-[1.25rem] border border-[var(--store-border)] bg-white/70 p-4">
              <p className="text-[11px] uppercase tracking-[0.25em] text-[var(--store-gold)]">
                البريد
              </p>
              <p className="mt-2" dir="ltr">
                {settings.store_email}
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
