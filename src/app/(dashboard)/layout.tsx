import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";
import InstallPrompt from "@/components/pwa/InstallPrompt";
import { resolveSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { type ReactNode } from "react";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await resolveSession();

  if (!session) {
    redirect("/api/auth/logout?redirect=/login");
  }

  return (
    <div className="flex min-h-screen bg-cream">
      <Sidebar role={session.role} />
      <div className="flex flex-1 flex-col min-w-0">
        <Header user={session} />
        <main className="flex-1 overflow-auto p-4 md:p-6 pb-24 md:pb-6">
          {children}
        </main>
      </div>
      <MobileNav role={session.role} />
      <InstallPrompt />
    </div>
  );
}
