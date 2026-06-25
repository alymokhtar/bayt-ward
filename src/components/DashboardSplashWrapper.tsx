"use client";

import { useEffect, useState, type ReactNode } from "react";
import MobileSplashScreen from "./MobileSplashScreen";

export default function DashboardSplashWrapper({
  children,
}: {
  children: ReactNode;
}) {
  const [showSplash, setShowSplash] = useState(false);

  useEffect(() => {
    // Show splash only once per browser session (after login)
    const hasShown = sessionStorage.getItem("splash-shown");
    if (!hasShown) {
      setShowSplash(true);
      sessionStorage.setItem("splash-shown", "true");
    }
  }, []);

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
