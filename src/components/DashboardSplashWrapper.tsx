"use client";

import { useEffect, useState, type ReactNode } from "react";
import MobileSplashScreen from "./MobileSplashScreen";

export default function DashboardSplashWrapper({
  children,
}: {
  children: ReactNode;
}) {
  const [showSplash, setShowSplash] = useState(() => {
    const hasShown = sessionStorage.getItem("splash-shown");
    const isMobile = typeof window !== "undefined" ? window.innerWidth <= 768 : false;
    // لا تظهر splash screen على الموبايل أبداً
    return !hasShown && !isMobile;
  });

  useEffect(() => {
    if (showSplash) {
      sessionStorage.setItem("splash-shown", "true");
      // Clear the cookie so splash won't show on next navigation
      document.cookie = "splash-show=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }
  }, [showSplash]);

  const handleComplete = () => {
    setShowSplash(false);
  };

  if (showSplash) {
    return (
      <>
        <MobileSplashScreen onComplete={handleComplete} />
        {/* Render children hidden so data preloads in background */}
        <div className="hidden" aria-hidden="true">
          {children}
        </div>
      </>
    );
  }

  return <>{children}</>;
}
