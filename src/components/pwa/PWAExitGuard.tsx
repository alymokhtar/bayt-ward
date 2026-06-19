"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const LOGOUT_URL = "/api/auth/logout";
const EXIT_WARNING_MESSAGE = "هل تريد تسجيل الخروج";

function isStandalonePWA() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator &&
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true)
  );
}

function requestLogout() {
  try {
    fetch(LOGOUT_URL, {
      method: "POST",
      credentials: "same-origin",
      keepalive: true,
    }).catch(() => {});
  } catch {
    navigator.sendBeacon?.(LOGOUT_URL);
  }
}

export default function PWAExitGuard() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/login" || !isStandalonePWA()) return;

    let promptedForUnload = false;

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      promptedForUnload = true;
      event.preventDefault();
      event.returnValue = EXIT_WARNING_MESSAGE;
      return EXIT_WARNING_MESSAGE;
    }

    function handlePageHide() {
      if (promptedForUnload) {
        requestLogout();
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [pathname]);

  return null;
}
