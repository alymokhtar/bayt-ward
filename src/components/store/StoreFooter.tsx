import Link from "next/link";
import Image from "next/image";
import { Camera, MessageCircle, Music2 } from "lucide-react";
import { STORE_NAME, STORE_NAME_AR } from "@/lib/constants";
import { getWhatsAppUrl } from "@/lib/whatsapp";

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
    ? getWhatsAppUrl(whatsappNumber, "السلام عليكم، أرغب في التواصل مع بيت ورد.")
    : `${STORE_BASE_PATH}/contact`;

  return (
    <footer className="border-t border-[var(--store-border)] bg-[#f1eadf] text-[var(--store-text)]">
      <div className="store-container grid items-center gap-6 py-7 md:grid-cols-3">
        <div className="flex items-center justify-center gap-5 text-[var(--store-muted)] md:justify-start">
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="sr-only"
          >
            واتساب
          </a>
          <Camera className="h-5 w-5" aria-hidden="true" />
          <MessageCircle className="h-5 w-5" aria-hidden="true" />
          <Music2 className="h-5 w-5" aria-hidden="true" />
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
