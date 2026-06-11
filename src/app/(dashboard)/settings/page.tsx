import SettingsClient from "@/app/(dashboard)/settings/SettingsClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { getSettings } from "@/lib/actions/settings";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Settings } from "lucide-react";

export default async function SettingsPage() {
  const session = await getSession();
  if (session?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const settings = await getSettings();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/10">
          <Settings className="h-5 w-5 text-gold" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-brown">الإعدادات</h1>
          <p className="text-sm text-muted mt-1">إعدادات المتجر</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>بيانات المتجر</CardTitle>
        </CardHeader>
        <CardContent>
          <SettingsClient settings={settings} />
        </CardContent>
      </Card>
    </div>
  );
}
