import Link from "next/link";
import Image from "next/image";
import { Camera, MessageCircle, Music2, MapPin } from "lucide-react";
import { SiFacebook, SiInstagram, SiTiktok, SiYoutube, SiSnapchat, SiX } from "react-icons/si";
import { STORE_NAME, STORE_NAME_AR } from "@/lib/constants";
import { getWhatsAppUrl } from "@/lib/whatsapp";
import { getShareUrl, isSafeGoogleMapsUrl } from "@/lib/maps-utils";

type StoreFooterProps = {
  settings: Record<string, string>;
};

const STORE_BASE_PATH = "/store";

const QUICK_LINKS = [
  { href: `${STORE_BASE_PATH}/about`, label: "من نحن" },
  { href: `${STORE_BASE_PATH}/contact`, label: "سياسة الخصوصية" },
  { href: `${STORE_BASE_PATH}/contact`, label: "الشروط والأحكام" },
];

export default function StoreFooter({ settings }: StoreFooterProps) {
  const storeName = settings.store_name_ar || STORE_NAME_AR;
  const storeNameEn = settings.store_name || STORE_NAME;
  const whatsappNumber = settings.store_whatsapp || settings.store_phone || "";
  const year = new Date().getFullYear();

  const whatsappHref = whatsappNumber
    ? getWhatsAppUrl(whatsappNumber, "مرحباً، أرغب في التواصل مع بيت ورد.")
    : `${STORE_BASE_PATH}/contact`;

  // Get maps URL if it's a share URL
  const mapsShareUrl = isSafeGoogleMapsUrl(settings.google_maps_embed_url)
    ? getShareUrl(settings.google_maps_embed_url)
    : null;

  return (
    <footer className="border-t border-[var(--store-border)] bg-[#f1eadf] text-[var(--store-text)]">
      <div className="store-container grid items-center gap-6 py-7 md:grid-cols-3">
        <div className="flex items-center justify-center gap-4 text-[var(--store-muted)] md:justify-start">
          {/** Helper: Social icon wrapper that implements hybrid hover interaction */}
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
                {!settings.social_facebook_url && !settings.social_instagram_url && !settings.social_tiktok_url && !settings.social_youtube_url && !settings.social_snapchat_url && !settings.social_x_url && (
                  <>
                    <span className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-[#f7efe6] text-[var(--store-text)]">
                      <Camera className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-[#f7efe6] text-[var(--store-text)]">
                      <MessageCircle className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-[#f7efe6] text-[var(--store-text)]">
                      <Music2 className="h-5 w-5" aria-hidden="true" />
                    </span>
                  </>
                )}
              </>
            );
          })()}
        </div>

        <Link href={STORE_BASE_PATH} className="mx-auto flex flex-col items-center" aria-label={storeName}>
          <span className="relative h-20 w-24">
            <Image
              src="/images/logo-light.png"
              alt={storeName}
              fill
              sizes="96px"
              className="object-contain"
            />
          </span>
        </Link>

        <div className="space-y-3 text-center text-xs text-[var(--store-muted)] md:text-end">
          {settings.store_address && (
            <div className="mb-3 pb-3 border-b border-[var(--store-border)]">
              <a
                href={
                  mapsShareUrl ||
                  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.store_address)}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[var(--store-text)] hover:text-[var(--store-gold)] transition-colors"
                title="افتح الموقع في خرائط جوجل"
              >
                <MapPin className="h-4 w-4" />
                <span className="line-clamp-2">{settings.store_address}</span>
              </a>
            </div>
          )}
          <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2 md:justify-end" aria-label="روابط سريعة">
            {QUICK_LINKS.map((link) => (
              <Link key={link.label} href={link.href} className="transition hover:text-[var(--store-gold)]">
                {link.label}
              </Link>
            ))}
          </nav>
          <p>
            جميع الحقوق محفوظة © {storeNameEn} {year}
          </p>
        </div>
      </div>
    </footer>
  );
}
