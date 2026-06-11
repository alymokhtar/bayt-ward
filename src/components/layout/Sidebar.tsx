"use client";

import { NAV_ITEMS, STORE_NAME, STORE_NAME_AR } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/auth";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarProps {
  role: SessionUser["role"];
}

export default function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();

  const filteredItems = NAV_ITEMS.filter((item) =>
    item.roles.includes(role)
  );

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col bg-brown text-cream min-h-screen">
      <div className="flex flex-col items-center gap-2 border-b border-cream/10 px-6 py-6">
        <div className="relative h-14 w-14 overflow-hidden rounded-full border-2 border-gold/40 bg-cream/10">
          <Image
            src="/images/logo-light.png"
            alt={STORE_NAME}
            fill
            className="object-contain p-1.5"
            priority
          />
        </div>
        <div className="text-center">
          <p className="text-lg font-bold tracking-wide">{STORE_NAME_AR}</p>
          <p className="text-xs text-cream/60 font-light tracking-widest uppercase">
            {STORE_NAME}
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {filteredItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" &&
                pathname.startsWith(item.href));

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-gold text-white shadow-md"
                      : "text-cream/80 hover:bg-cream/10 hover:text-cream"
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" strokeWidth={1.75} />
                  <span>{item.title}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-cream/10 px-6 py-4">
        <p className="text-xs text-cream/40 text-center">
          © {new Date().getFullYear()} {STORE_NAME_AR}
        </p>
      </div>
    </aside>
  );
}
