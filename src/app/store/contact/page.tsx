import type { Metadata } from "next";
import { StorePageHero } from "@/components/store/StoreSections";
import { getCachedStoreSettingsPublic } from "@/lib/store/cached-queries";
import { getWhatsAppUrl } from "@/lib/whatsapp";
import { STORE_NAME_AR } from "@/lib/constants";
import { MessageCircle, Phone, Mail, MapPin, Facebook, Instagram, Youtube, Twitter, Link as LinkIcon } from "lucide-react";

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
                className="mt-2 inline-flex items-center gap-3 text-lg font-medium text-[var(--store-text)] hover:text-[var(--store-gold)]"
                dir="ltr"
              >
                <MessageCircle className="h-5 w-5 text-[var(--store-gold)]" />
                <span>{whatsappNumber}</span>
              </a>
            </div>
          )}
          {settings.store_phone && (
            <div className="rounded-[1.25rem] border border-[var(--store-border)] bg-white/70 p-4">
              <p className="text-[11px] uppercase tracking-[0.25em] text-[var(--store-gold)]">
                الهاتف
              </p>
              <a
                href={`tel:${settings.store_phone}`}
                className="mt-2 inline-flex items-center gap-3 text-lg font-medium text-[var(--store-text)] hover:text-[var(--store-gold)]"
                dir="ltr"
              >
                <Phone className="h-5 w-5 text-[var(--store-gold)]" />
                <span>{settings.store_phone}</span>
              </a>
            </div>
          )}
          {settings.store_address && (
            <div className="rounded-[1.25rem] border border-[var(--store-border)] bg-white/70 p-4">
              <p className="text-[11px] uppercase tracking-[0.25em] text-[var(--store-gold)]">
                العنوان
              </p>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  settings.store_address
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-start gap-3 text-sm leading-7 text-[var(--store-muted)] hover:text-[var(--store-gold)]"
              >
                <MapPin className="h-5 w-5 text-[var(--store-gold)] mt-1" />
                <span>{settings.store_address}</span>
              </a>
            </div>
          )}
          {settings.store_email && (
            <div className="rounded-[1.25rem] border border-[var(--store-border)] bg-white/70 p-4">
              <p className="text-[11px] uppercase tracking-[0.25em] text-[var(--store-gold)]">
                البريد
              </p>
              <a
                href={`mailto:${settings.store_email}`}
                className="mt-2 inline-flex items-center gap-3 text-lg font-medium text-[var(--store-text)] hover:text-[var(--store-gold)]"
                dir="ltr"
              >
                <Mail className="h-5 w-5 text-[var(--store-gold)]" />
                <span>{settings.store_email}</span>
              </a>
            </div>
          )}
          {/* Social links */}
          {(settings.social_facebook_url || settings.social_instagram_url || settings.social_tiktok_url || settings.social_youtube_url || settings.social_snapchat_url || settings.social_x_url) && (
            <div className="rounded-[1.25rem] border border-[var(--store-border)] bg-white/70 p-4">
              <p className="text-[11px] uppercase tracking-[0.25em] text-[var(--store-gold)]">
                حساباتنا على مواقع التواصل الاجتماعي
              </p>
              <div className="mt-2 flex items-center gap-4">
                {settings.social_facebook_url && (
                  <a href={settings.social_facebook_url} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                    <Facebook className="h-6 w-6 text-[var(--store-gold)]" />
                  </a>
                )}
                {settings.social_instagram_url && (
                  <a href={settings.social_instagram_url} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                    <Instagram className="h-6 w-6 text-[var(--store-gold)]" />
                  </a>
                )}
                {settings.social_tiktok_url && (
                  <a href={settings.social_tiktok_url} target="_blank" rel="noopener noreferrer" aria-label="TikTok">
                    <LinkIcon className="h-6 w-6 text-[var(--store-gold)]" />
                  </a>
                )}
                {settings.social_youtube_url && (
                  <a href={settings.social_youtube_url} target="_blank" rel="noopener noreferrer" aria-label="YouTube">
                    <Youtube className="h-6 w-6 text-[var(--store-gold)]" />
                  </a>
                )}
                {settings.social_snapchat_url && (
                  <a href={settings.social_snapchat_url} target="_blank" rel="noopener noreferrer" aria-label="Snapchat">
                    <LinkIcon className="h-6 w-6 text-[var(--store-gold)]" />
                  </a>
                )}
                {settings.social_x_url && (
                  <a href={settings.social_x_url} target="_blank" rel="noopener noreferrer" aria-label="X">
                    <Twitter className="h-6 w-6 text-[var(--store-gold)]" />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
