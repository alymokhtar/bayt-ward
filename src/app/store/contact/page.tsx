import type { Metadata } from "next";
import { StorePageHero } from "@/components/store/StoreSections";
import { getCachedStoreSettingsPublic } from "@/lib/store/cached-queries";
import { getWhatsAppUrl } from "@/lib/whatsapp";
import { getShareUrl, processGoogleMapsUrl } from "@/lib/maps-utils";
import { STORE_NAME_AR } from "@/lib/constants";
import { MessageCircle, Phone, Mail, MapPin, ExternalLink } from "lucide-react";
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

  // Process Google Maps URL
  const mapsData = processGoogleMapsUrl(settings.google_maps_embed_url);
  const mapShareUrl = getShareUrl(settings.google_maps_embed_url) ||
    (settings.store_address
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.store_address)}`
      : null);

  return (
    <>
      <StorePageHero
        title="تواصل معنا"
        description="نسعد بخدمتكِ — تواصلي معنا في أي وقت"
      />
      <section className="store-container max-w-xl pb-20">
        <div className="store-shell space-y-4 p-8 md:p-10">
          {settings.store_phone && (
            <div className="rounded-[1.25rem] border border-[var(--store-border)] bg-white/70 p-4">
              <p className="text-[11px] text-[var(--store-gold)]" dir="rtl">
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
          {whatsappNumber && whatsappHref && (
            <div className="rounded-[1.25rem] border border-[var(--store-border)] bg-white/70 p-4">
              <p className="text-[11px] text-[var(--store-gold)]" dir="rtl">
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
          {(settings.social_facebook_url || settings.social_instagram_url || settings.social_tiktok_url || settings.social_youtube_url || settings.social_snapchat_url || settings.social_x_url) && (
            <div className="rounded-[1.25rem] border border-[var(--store-border)] bg-white/70 p-4">
              <p className="text-[11px] text-[var(--store-gold)]" dir="rtl">
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
          {settings.store_email && (
            <div className="rounded-[1.25rem] border border-[var(--store-border)] bg-white/70 p-4">
              <p className="text-[11px] text-[var(--store-gold)]" dir="rtl">
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
          {settings.store_address && mapShareUrl && (
            <div className="rounded-[1.25rem] border border-[var(--store-border)] bg-white/70 p-4 transition-all shadow-sm hover:border-amber-700/40 cursor-pointer">
              <p className="text-[11px] text-[var(--store-gold)]" dir="rtl">
                العنوان
              </p>
              <a
                href={mapShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-start gap-3 text-sm leading-7 text-[var(--store-muted)] hover:text-[var(--store-gold)]"
              >
                <MapPin className="h-5 w-5 text-[var(--store-gold)] mt-1" />
                <span>{settings.store_address}</span>
              </a>
            </div>
          )}
          {/* Google Maps Section */}
          {mapsData.isValid && mapsData.type === 'embed' && mapsData.embedUrl && (
            <div className="rounded-[1.25rem] border border-[var(--store-border)] bg-white/70 p-4 overflow-hidden">
              <p className="text-[11px] text-[var(--store-gold)]" dir="rtl">
                الموقع على الخريطة
              </p>
              <div className="mt-4">
                <iframe
                  src={mapsData.embedUrl}
                  width="100%"
                  height="400"
                  style={{ border: 0, borderRadius: "0.5rem" }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>
          )}
          {mapsData.isValid && mapsData.type === 'card' && mapsData.shareUrl && (
            <div className="rounded-[1.25rem] border border-[var(--store-border)] bg-white/70 p-4">
              <p className="text-[11px] text-[var(--store-gold)]" dir="rtl">
                الموقع على الخريطة
              </p>
              <div className="mt-4 flex flex-col gap-3 items-center text-center">
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-[var(--store-gold)]/10">
                  <MapPin className="h-8 w-8 text-[var(--store-gold)]" />
                </div>
                <p className="text-sm text-[var(--store-text)]">
                  شاهد فرعنا على خرائط جوجل
                </p>
                <a
                  href={mapsData.shareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--store-gold)] text-white font-medium hover:bg-[var(--store-gold)]/90 transition-colors text-sm"
                >
                  <span>عرض الموقع</span>
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
