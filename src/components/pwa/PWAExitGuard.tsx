"use client";

import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const EXIT_WARNING_MESSAGE = "هل تريد تسجيل الخروج";
const LOGOUT_BACKUP_URL = "/settings?logoutBackup=1#manual-backup";

function isStandalonePWA() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator &&
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true)
  );
}

function isMobileDevice() {
  return typeof window !== "undefined" && window.innerWidth <= 768;
}

export default function PWAExitGuard() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (
      pathname === "/login" ||
      pathname === "/settings" ||
      !isStandalonePWA() ||
      isMobileDevice()
    ) {
      return;
    }

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = EXIT_WARNING_MESSAGE;

      window.setTimeout(() => {
        if (!document.hidden) {
          router.push(LOGOUT_BACKUP_URL);
        }
      }, 0);

      return EXIT_WARNING_MESSAGE;
    }

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [pathname, router]);

  return null;
}
