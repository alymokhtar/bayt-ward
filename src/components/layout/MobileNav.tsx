"use client";

import { NAV_ITEMS } from "@/lib/constants";
import type { SessionUser } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Menu,
  ShoppingCart,
  Store,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

interface MobileNavProps {
  role: SessionUser["role"];
}

const MOBILE_TABS = [
  { title: "الرئيسية", href: "/dashboard", icon: LayoutDashboard },
  { title: "البيع", href: "/pos", icon: Store },
  { title: "المبيعات", href: "/sales", icon: ShoppingCart },
  { title: "العملاء", href: "/customers", icon: Users },
];

export default function MobileNav({ role }: MobileNavProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const allItems = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <>
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-sidebar border-t border-sidebar-foreground/10 safe-area-bottom">
        <div className="flex items-center justify-around h-16">
          {MOBILE_TABS.filter((tab) =>
            allItems.some((item) => item.href === tab.href)
          ).map((tab) => {
            const Icon = tab.icon;
            const isActive =
              pathname === tab.href || pathname.startsWith(`${tab.href}/`);

            return (
              <Link
                key={tab.href}
                href={tab.href}
                prefetch={false}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors min-w-[64px]",
                  isActive ? "text-gold" : "text-sidebar-foreground/60"
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 1.75} />
                <span className="text-[10px] font-medium">{tab.title}</span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="flex flex-col items-center gap-0.5 px-3 py-1 text-sidebar-foreground/60 min-w-[64px]"
          >
            <Menu className="h-5 w-5" />
            <span className="text-[10px] font-medium">المزيد</span>
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute bottom-0 inset-x-0 bg-sidebar rounded-t-2xl max-h-[70vh] overflow-y-auto animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between px-4 py-3 border-b border-sidebar-foreground/10">
              <p className="font-semibold text-sidebar-foreground">جميع الأقسام</p>
              <button onClick={() => setMenuOpen(false)} className="text-sidebar-foreground/60 p-1">
                <X className="h-5 w-5" />
              </button>
            </div>
            <ul className="p-3 grid grid-cols-3 gap-2">
              {allItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    pathname.startsWith(item.href));

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      prefetch={false}
                      onClick={() => setMenuOpen(false)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 rounded-xl p-3 text-center transition-colors",
                        isActive
                          ? "bg-gold text-primary-foreground"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-foreground/10"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-[11px] font-medium leading-tight">
                        {item.title}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
