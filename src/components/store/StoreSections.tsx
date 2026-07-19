import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
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
      className="group relative block overflow-hidden rounded-[1.8rem] border border-[var(--store-border)] bg-[var(--store-surface)] p-2 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-[1.35rem] bg-[var(--store-border)]">
        {coverImage ? (
          <Image
            src={optimizeCloudinaryUrl(coverImage, { width: 700, height: 875, crop: "fill" })}
            alt={name}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="store-image-zoom object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-neutral-100 text-[var(--store-muted)]">
            {name}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5 text-white">
          <div className="mb-3 inline-flex rounded-full border border-white/20 bg-white/15 px-3 py-1 text-[10px] uppercase tracking-[0.3em] backdrop-blur">
            {category._count.products} منتج
          </div>
          <h3 className="store-serif text-2xl font-semibold">{name}</h3>
        </div>
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
      <div className="rounded-[2rem] border border-[var(--store-border)] bg-[var(--store-surface)]/90 p-8 shadow-[0_16px_45px_rgba(80,54,28,0.06)] backdrop-blur md:p-10">
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
          <p className="store-pill mb-4">Bayt Ward</p>
          <h1 className="store-serif text-4xl font-semibold text-[var(--store-text)] md:text-5xl">
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
    <section className="store-container py-16">
      <div className="rounded-[2rem] border border-[var(--store-border)] bg-[linear-gradient(135deg,rgba(255,250,243,1),rgba(245,232,210,0.9))] px-8 py-12 text-center text-[var(--store-text)] shadow-[0_20px_50px_rgba(80,54,28,0.08)] md:px-16">
        <p className="text-[11px] uppercase tracking-[0.35em] text-[var(--store-gold)]">
          طلب سريع
        </p>
        <h2 className="store-serif mt-3 text-3xl font-semibold md:text-4xl">
          جاهزة للطلب؟ تواصلي معنا الآن
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[var(--store-muted)]">
          فريقنا يساعدكِ في اختيار المقاس واللون المناسب وإتمام طلبكِ بسهولة عبر واتساب.
        </p>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 inline-flex items-center justify-center rounded-full bg-[#25D366] px-8 py-3.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#1da851]"
        >
          اطلبي عبر واتساب
        </a>
      </div>
    </section>
  );
}
