import type { Metadata } from "next";
import { StorePageHero } from "@/components/store/StoreSections";
import { getCachedStoreSettingsPublic } from "@/lib/store/cached-queries";
import { getWhatsAppUrl } from "@/lib/whatsapp";
import { STORE_NAME_AR } from "@/lib/constants";
import { MessageCircle, Phone, Mail, MapPin } from "lucide-react";
import { SiFacebook, SiInstagram, SiTiktok, SiYoutube, SiSnapchat, SiX } from "react-icons/si";

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
          {settings.google_maps_embed_url && (
            <div className="rounded-[1.25rem] border border-[var(--store-border)] bg-white/70 p-4 overflow-hidden">
              <p className="text-[11px] uppercase tracking-[0.25em] text-[var(--store-gold)]">
                الموقع على الخريطة
              </p>
              <div className="mt-4">
                {settings.google_maps_embed_url.includes("iframe") ? (
                  // Direct HTML embed code
                  <div
                    dangerouslySetInnerHTML={{ __html: settings.google_maps_embed_url }}
                    className="rounded-lg overflow-hidden"
                  />
                ) : settings.google_maps_embed_url.startsWith("http") ? (
                  // Share link - convert to embed URL
                  <iframe
                    src={settings.google_maps_embed_url.replace(/\/maps\//gi, "/maps/embed/")}
                    width="100%"
                    height="400"
                    style={{ border: 0, borderRadius: "0.5rem" }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                ) : (
                  // Fallback: search by address
                  <iframe
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(settings.store_address || settings.google_maps_embed_url)}&output=embed`}
                    width="100%"
                    height="400"
                    style={{ border: 0, borderRadius: "0.5rem" }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                )}
              </div>
            </div>
          )}
          {/* Social links */}
          {(settings.social_facebook_url || settings.social_instagram_url || settings.social_tiktok_url || settings.social_youtube_url || settings.social_snapchat_url || settings.social_x_url) && (
            <div className="rounded-[1.25rem] border border-[var(--store-border)] bg-white/70 p-4">
              <p className="text-[11px] uppercase tracking-[0.25em] text-[var(--store-gold)]">
                حساباتنا على مواقع التواصل الاجتماعي
              </p>
              <div className="mt-2 flex items-center gap-4">
                {(() => {
                  const IconWrap = ({ href, label, title, children, hoverClasses = "" }: any) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      title={title}
                      className={`inline-flex items-center justify-center h-9 w-9 rounded-full bg-[#f7efe6] text-[var(--store-text)] transition-transform duration-200 transform hover:scale-110 ${hoverClasses}`}
                    >
                      {children}
                    </a>
                  );

                  return (
                    <>
                      {settings.social_facebook_url && (
                        <IconWrap href={settings.social_facebook_url} label="Facebook" title="فيسبوك" hoverClasses="hover:bg-[#1877F2] hover:text-white">
                          <SiFacebook className="h-5 w-5" />
                        </IconWrap>
                      )}
                      {settings.social_instagram_url && (
                        <IconWrap href={settings.social_instagram_url} label="Instagram" title="انستغرام" hoverClasses="hover:bg-gradient-to-r hover:from-[#E4405F] hover:to-[#833AB4] hover:text-white">
                          <SiInstagram className="h-5 w-5" />
                        </IconWrap>
                      )}
                      {settings.social_tiktok_url && (
                        <IconWrap href={settings.social_tiktok_url} label="TikTok" title="تيك توك" hoverClasses="hover:bg-[#000000] hover:text-white">
                          <SiTiktok className="h-5 w-5" />
                        </IconWrap>
                      )}
                      {settings.social_youtube_url && (
                        <IconWrap href={settings.social_youtube_url} label="YouTube" title="يوتيوب" hoverClasses="hover:bg-[#FF0000] hover:text-white">
                          <SiYoutube className="h-5 w-5" />
                        </IconWrap>
                      )}
                      {settings.social_snapchat_url && (
                        <IconWrap href={settings.social_snapchat_url} label="Snapchat" title="سناب شات" hoverClasses="hover:bg-[#FFFC00] hover:text-black">
                          <SiSnapchat className="h-5 w-5" />
                        </IconWrap>
                      )}
                      {settings.social_x_url && (
                        <IconWrap href={settings.social_x_url} label="X" title="إكس" hoverClasses="hover:bg-[#000000] hover:text-white">
                          <SiX className="h-5 w-5" />
                        </IconWrap>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
