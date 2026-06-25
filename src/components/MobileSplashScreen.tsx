"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { STORE_NAME, STORE_NAME_AR } from "@/lib/constants";

interface MobileSplashScreenProps {
  onComplete?: () => void;
}

export default function MobileSplashScreen({ onComplete }: MobileSplashScreenProps) {
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Animate progress bar over 1 second
    const duration = 1000;
    const interval = 30;
    const step = 100 / (duration / interval);
    let current = 0;

    const timer = setInterval(() => {
      current += step;
      if (current >= 100) {
        current = 100;
        clearInterval(timer);
        // Start fade out after progress completes
        setTimeout(() => {
          setFading(true);
          setTimeout(() => {
            setVisible(false);
            onComplete?.();
          }, 500);
        }, 200);
      }
      setProgress(current);
    }, interval);

    return () => clearInterval(timer);
  }, [onComplete]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-cream transition-opacity duration-500 ${
        fading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{
        background: `
          radial-gradient(circle at 20% 20%, color-mix(in srgb, #b8860b 12%, transparent) 0%, transparent 50%),
          radial-gradient(circle at 80% 80%, color-mix(in srgb, #b8860b 8%, transparent) 0%, transparent 50%),
          radial-gradient(circle at 50% 50%, color-mix(in srgb, #4b3621 5%, transparent) 0%, transparent 70%),
          #fdf5e6
        `,
      }}
    >
      {/* Decorative circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-20 -right-20 w-60 h-60 rounded-full opacity-10"
          style={{ background: "color-mix(in srgb, #b8860b 40%, transparent)" }}
        />
        <div
          className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full opacity-10"
          style={{ background: "color-mix(in srgb, #b8860b 30%, transparent)" }}
        />
      </div>

      {/* Logo container */}
      <div className="relative z-10 flex flex-col items-center">
        <div
          className="relative h-32 w-32 mb-6 rounded-2xl border-2 border-gold/30 shadow-2xl overflow-hidden flex items-center justify-center"
          style={{ background: "color-mix(in srgb, #4b3621 90%, #b8860b)" }}
        >
          <Image
            src="/images/logo-light.png"
            alt={STORE_NAME}
            width={100}
            height={100}
            className="object-contain p-2"
            priority
          />
        </div>

        <h1 className="text-2xl font-bold text-brown mb-1">{STORE_NAME_AR}</h1>
        <p className="text-sm text-gold-dark tracking-wider uppercase mb-8">
          {STORE_NAME}
        </p>

        {/* Loading bar */}
        <div className="w-48 h-1.5 rounded-full bg-cream-dark border border-gold/20 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-75 ease-out"
            style={{
              width: `${progress}%`,
              background: "linear-gradient(90deg, #b8860b, #d4a84b, #b8860b)",
              backgroundSize: "200% 100%",
              animation: "shimmer 1.5s infinite",
            }}
          />
        </div>

        <p className="text-xs text-muted mt-3" dir="rtl">
          جاري التحميل...
        </p>
      </div>
    </div>
  );
}
