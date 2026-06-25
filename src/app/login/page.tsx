import { STORE_NAME, STORE_NAME_AR } from "@/lib/constants";
import Image from "next/image";
import { Suspense } from "react";
import LoginForm from "./LoginForm";
import MobileSplashScreen from "@/components/MobileSplashScreen";

export default function LoginPage() {
  return (
    <>
      <MobileSplashScreen />
      <div className="flex min-h-screen">
      <div className="bayt-ward-pattern hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23B8860B' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center max-w-md">
          <div className="relative h-32 w-32 mb-8 rounded-full border-4 border-gold/30 bg-cream/10 shadow-2xl overflow-hidden">
            <Image
              src="/images/logo-light.png"
              alt={STORE_NAME}
              fill
              sizes="128px"
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-4xl font-bold text-cream mb-2">{STORE_NAME_AR}</h1>
          <p className="text-gold-light text-lg tracking-widest uppercase mb-6">
            {STORE_NAME}
          </p>
          <p className="text-cream/70 text-base leading-relaxed">
            نظام إدارة متكامل لمتجر الملابس الحريمي — مبيعات، مخزون، عملاء،
            وتقارير
          </p>
          <div className="mt-10 flex gap-3">
            <div className="h-1 w-12 rounded-full bg-gold" />
            <div className="h-1 w-6 rounded-full bg-gold/40" />
            <div className="h-1 w-3 rounded-full bg-gold/20" />
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center bg-cream px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center lg:hidden">
            <div className="relative mx-auto h-20 w-20 mb-4 rounded-full border-2 border-gold/30 bg-white shadow-lg overflow-hidden">
              <Image
                src="/images/logo-light.png"
                alt={STORE_NAME}
                fill
                sizes="80px"
                className="object-contain"
                priority
              />
            </div>
            <h1 className="text-2xl font-bold text-brown">{STORE_NAME_AR}</h1>
            <p className="text-sm text-muted mt-1">{STORE_NAME}</p>
          </div>

          <div className="rounded-2xl border border-border bg-white p-8 shadow-xl shadow-brown/5">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-brown">تسجيل الدخول</h2>
              <p className="text-sm text-muted mt-1">
                أدخل بيانات حسابك للوصول إلى لوحة التحكم
              </p>
            </div>
            <Suspense fallback={<div className="h-48 animate-pulse rounded-lg bg-cream-dark" />}>
              <LoginForm />
            </Suspense>
          </div>

          <p className="mt-6 text-center text-xs text-muted">
            © {new Date().getFullYear()} {STORE_NAME_AR} — جميع الحقوق محفوظة
          </p>
        </div>
      </div>
    </div>
  </>
  );
}
