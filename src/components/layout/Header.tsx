"use client";

import Button from "@/components/ui/Button";
import type { SessionUser } from "@/lib/auth";
import { STORE_NAME_AR } from "@/lib/constants";
import { getRoleLabel } from "@/lib/utils";
import { LogOut, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface HeaderProps {
  user: SessionUser;
}

export default function Header({ user }: HeaderProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      setLoading(false);
    }
  }

  return (
    <header className="sticky top-0 z-40 flex h-14 md:h-16 items-center justify-between border-b border-border bg-white/80 px-4 md:px-6 backdrop-blur-md">
      <div className="md:hidden">
        <h1 className="text-base font-semibold text-brown">{STORE_NAME_AR}</h1>
      </div>
      <div className="hidden md:block">
        <h1 className="text-lg font-semibold text-brown">{STORE_NAME_AR}</h1>
        <p className="text-xs text-muted">نظام إدارة المتجر</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gold/15">
            <User className="h-4 w-4 text-gold" />
          </div>
          <div className="text-start">
            <p className="text-sm font-medium text-brown">{user.name}</p>
            <p className="text-xs text-muted">{getRoleLabel(user.role)}</p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          loading={loading}
          className="gap-1.5 hidden sm:inline-flex"
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
