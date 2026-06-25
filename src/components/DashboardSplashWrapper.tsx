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
    return !hasShown;
  });

  useEffect(() => {
    if (showSplash) {
      sessionStorage.setItem("splash-shown", "true");
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
