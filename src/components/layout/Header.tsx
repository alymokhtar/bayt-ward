"use client";

import Button from "@/components/ui/Button";
import type { SessionUser } from "@/lib/auth";
import { STORE_NAME_AR } from "@/lib/constants";
import { getRoleLabel } from "@/lib/utils";
import { LogOut, User } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface HeaderProps {
  user: SessionUser;
}

export default function Header({ user }: HeaderProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  function handleLogout() {
    const isMobile = typeof window !== "undefined" ? window.innerWidth <= 768 : false;

    if (isMobile) {
      // على الموبايل: تسجيل الخروج مباشرة بدون نسخ احتياطي
      setLoading(true);
      fetch("/api/auth/logout", { method: "POST" }).then(() => {
        router.replace("/login");
      });
      return;
    }

    const confirmed = window.confirm(
      "هل تريد تسجيل الخروج؟ يجب تنزيل نسخة احتياطية قبل إغلاق الجلسة."
    );

    if (!confirmed) return;

    setLoading(true);
    router.push("/settings?logoutBackup=1#manual-backup");
  }

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-white/90 px-4 py-2 backdrop-blur-md md:px-6 md:py-3">
      <div className="flex items-center gap-2.5">
        <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border border-gold/20 md:h-9 md:w-9">
          <Image
            src="/images/logo-light.png"
            alt={STORE_NAME_AR}
            fill
            className="object-cover"
            sizes="36px"
            priority
          />
        </div>
        <div className="min-w-0">
          <h1 className="text-sm font-semibold text-brown md:text-base">{STORE_NAME_AR}</h1>
          <p className="hidden text-[11px] text-muted md:block">نظام إدارة المتجر</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 rounded-full bg-gold/10 px-3 py-1.5 sm:flex">
          <User className="h-4 w-4 text-gold" />
          <div className="text-start">
            <p className="text-sm font-medium text-brown">{user.name}</p>
            <p className="text-[11px] text-muted">{getRoleLabel(user.role)}</p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          loading={loading}
          className="hidden gap-1.5 sm:inline-flex"
        >
          <LogOut className="h-4 w-4" />
          خروج
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          loading={loading}
          className="sm:hidden"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
