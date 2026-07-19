import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Flower2, Headphones, MessageCircle, PackageCheck, Truck } from "lucide-react";
import { getWhatsAppUrl } from "@/lib/whatsapp";
import { optimizeCloudinaryUrl } from "@/lib/store/images";
import { getCategoryPath } from "@/lib/store/product-utils";

type CategoryCardProps = {
  category: {
    id: string;
    name: string;
    nameAr: string | null;
    description: string | null;
    _count: { products: number };
  };
  coverImage?: string | null;
};

export default function CategoryCard({ category, coverImage }: CategoryCardProps) {
  const name = category.nameAr || category.name;

  return (
    <Link
      href={getCategoryPath(category.id)}
      className="group block overflow-hidden rounded-lg border border-[var(--store-border)] bg-white shadow-[0_8px_24px_rgba(75,54,37,0.09)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_14px_34px_rgba(75,54,37,0.14)]"
    >
      <div className="relative aspect-[1.08/1] overflow-hidden bg-[var(--store-cream)]">
        {coverImage ? (
          <Image
            src={optimizeCloudinaryUrl(coverImage, { width: 640, height: 600, crop: "fill" })}
            alt={name}
            fill
            sizes="(max-width: 768px) 50vw, 20vw"
            className="store-image-zoom object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center px-3 text-center text-sm text-[var(--store-muted)]">
            {name}
          </div>
        )}
      </div>
      <div className="relative px-3 pb-4 pt-7 text-center">
        <span className="absolute left-1/2 top-0 inline-flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--store-gold)] text-white shadow-[0_6px_18px_rgba(184,137,56,0.32)]">
          <Flower2 className="h-5 w-5" />
        </span>
        <h3 className="text-base font-bold text-[var(--store-text)]">{name}</h3>
      </div>
    </Link>
  );
}

type StorePageHeroProps = {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
};

export function StorePageHero({
  title,
  description,
  backHref,
  backLabel,
}: StorePageHeroProps) {
  return (
    <section className="store-container py-10 md:py-14">
      <div className="store-soft-card p-6 md:p-9">
        {backHref && (
          <Link
            href={backHref}
            className="mb-6 inline-flex items-center gap-2 text-sm text-[var(--store-muted)] transition hover:text-[var(--store-gold)]"
          >
            <ArrowLeft className="h-4 w-4" />
            {backLabel || "رجوع"}
          </Link>
        )}
        <div className="max-w-3xl">
          <p className="mb-2 text-xs font-medium text-[var(--store-gold)]">Bayt Ward</p>
          <h1 className="text-3xl font-bold text-[var(--store-text)] md:text-4xl">
            {title}
          </h1>
          {description && (
            <p className="mt-4 text-base leading-7 text-[var(--store-muted)]">{description}</p>
          )}
        </div>
      </div>
    </section>
  );
}

type WhatsAppCtaProps = {
  whatsappNumber: string;
  storeName: string;
};

export function WhatsAppCta({ whatsappNumber, storeName }: WhatsAppCtaProps) {
  if (!whatsappNumber) return null;

  const href = getWhatsAppUrl(
    whatsappNumber,
    `السلام عليكم، أرغب في الاستفسار عن تشكيلات ${storeName}.`
  );

  return (
    <section className="store-container pb-6">
      <div className="store-soft-card flex flex-col items-center justify-between gap-5 px-5 py-5 text-center md:flex-row md:px-8 md:text-start">
        <div className="flex flex-col items-center gap-4 md:flex-row">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#35b553] text-white">
            <MessageCircle className="h-7 w-7" />
          </span>
          <div>
            <h2 className="text-lg font-bold text-[var(--store-text)]">اطلبي الآن عبر واتساب</h2>
            <p className="mt-1 text-sm text-[var(--store-muted)]">
              تواصلي معنا مباشرة على واتساب لطلب منتجاتك
            </p>
          </div>
        </div>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center justify-center rounded bg-[var(--store-gold)] px-8 text-sm font-bold text-white shadow-sm transition hover:bg-[var(--store-gold-deep)]"
        >
          تواصلي معنا
        </a>
      </div>
    </section>
  );
}

export function TrustSignals() {
  const items = [
    {
      title: "توصيل سريع",
      text: "إلى جميع أنحاء موريتانيا",
      icon: Truck,
    },
    {
      title: "جودة عالية",
      text: "منتجات مختارة بعناية",
      icon: PackageCheck,
    },
    {
      title: "خدمة عملاء مميزة",
      text: "نحن هنا لمساعدتك دائما",
      icon: Headphones,
    },
  ];

  return (
    <section className="store-container py-6">
      <div className="store-soft-card grid gap-0 overflow-hidden md:grid-cols-3">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.title}
              className="flex items-center justify-center gap-4 border-b border-[var(--store-border)] px-5 py-5 text-center md:border-b-0 md:border-l md:last:border-l-0"
            >
              <Icon className="h-9 w-9 shrink-0 text-[var(--store-gold)]" />
              <div>
                <h3 className="font-bold text-[var(--store-text)]">{item.title}</h3>
                <p className="mt-1 text-sm text-[var(--store-muted)]">{item.text}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
