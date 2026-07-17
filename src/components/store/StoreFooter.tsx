import Link from "next/link";
import Image from "next/image";
import { STORE_NAME, STORE_NAME_AR } from "@/lib/constants";
import { getWhatsAppUrl } from "@/lib/whatsapp";

type StoreFooterProps = {
  settings: Record<string, string>;
};

const STORE_BASE_PATH = "/store";

const QUICK_LINKS = [
  { href: `${STORE_BASE_PATH}`, label: "الرئيسية" },
  { href: `${STORE_BASE_PATH}/products`, label: "المنتجات" },
  { href: `${STORE_BASE_PATH}/categories`, label: "الأقسام" },
  { href: `${STORE_BASE_PATH}/about`, label: "من نحن" },
  { href: `${STORE_BASE_PATH}/contact`, label: "تواصل معنا" },
];

export default function StoreFooter({ settings }: StoreFooterProps) {
  const storeName = settings.store_name_ar || STORE_NAME_AR;
  const storeNameEn = settings.store_name || STORE_NAME;
  const whatsappNumber = settings.store_whatsapp || settings.store_phone || "";
  const address = settings.store_address || "";
  const year = new Date().getFullYear();

  const whatsappHref = whatsappNumber
    ? getWhatsAppUrl(whatsappNumber, "السلام عليكم، أرغب في التواصل مع بيت ورد.")
    : `${STORE_BASE_PATH}/contact`;

  return (
    <footer className="mt-20 border-t border-[var(--store-border)] bg-[var(--store-text)] text-white">
      <div className="store-container py-14 md:py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative h-12 w-12 overflow-hidden rounded-full border border-white/20 bg-white">
                <Image
                  src="/images/logo-light.png"
                  alt={storeName}
                  fill
                  sizes="48px"
                  className="object-contain p-1.5"
                />
              </div>
              <div>
                <p className="store-serif text-2xl font-semibold">{storeName}</p>
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">
                  {storeNameEn}
                </p>
              </div>
            </div>
            <p className="max-w-xs text-sm leading-7 text-white/70">
              متجر أنيق للحجاب والملابس النسائية — تشكيلات مختارة بعناية تجمع بين
              الأناقة والراحة والجودة.
            </p>
          </div>

          <div>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.25em] text-[var(--store-gold)]">
              روابط سريعة
            </h2>
            <ul className="space-y-2">
              {QUICK_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/75 transition hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.25em] text-[var(--store-gold)]">
              تواصل معنا
            </h2>
            <ul className="space-y-3 text-sm text-white/75">
              {whatsappNumber && (
                <li>
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition hover:text-white"
                  >
                    واتساب: {whatsappNumber}
                  </a>
                </li>
              )}
              {settings.store_phone && (
                <li dir="ltr" className="text-right">
                  هاتف: {settings.store_phone}
                </li>
              )}
              {address && <li>{address}</li>}
            </ul>
          </div>

          <div>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.25em] text-[var(--store-gold)]">
              تابعينا
            </h2>
            <p className="text-sm text-white/70">
              قريباً — روابط فيسبوك وإنستجرام
            </p>
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-6 text-center text-xs text-white/50">
          © {year} {storeName} — جميع الحقوق محفوظة
        </div>
      </div>
    </footer>
  );
}
