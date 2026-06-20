import SettingsClient from "@/app/(dashboard)/settings/SettingsClient";
import AppearanceSettingsPanel from "@/app/(dashboard)/settings/AppearanceSettingsPanel";
import ManualBackupPanel from "@/components/backup/ManualBackupPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { getSettings } from "@/lib/actions/settings";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Settings } from "lucide-react";

interface SettingsPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const session = await getSession();
  if (!session) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const logoutAfterExport = params?.logoutBackup === "1";
  const settings = await getSettings();
  const themeAccent = settings.theme_accent;
  const canManageStoreSettings = session.role === "ADMIN";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/10">
          <Settings className="h-5 w-5 text-gold" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-brown">الإعدادات</h1>
          <p className="text-sm text-muted mt-1">
            {canManageStoreSettings ? "إعدادات المتجر" : "إعداداتك الشخصية"}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>المظهر</CardTitle>
        </CardHeader>
        <CardContent>
          <AppearanceSettingsPanel
            themeAccent={themeAccent}
            userId={session.id}
            canSaveGlobally={canManageStoreSettings}
          />
        </CardContent>
      </Card>

      {canManageStoreSettings && (
        <Card>
          <CardHeader>
            <CardTitle>بيانات المتجر</CardTitle>
          </CardHeader>
          <CardContent>
            <SettingsClient settings={settings} />
          </CardContent>
        </Card>
      )}

      <Card id="manual-backup">
        <CardHeader>
          <CardTitle>النسخ الاحتياطي اليدوي</CardTitle>
        </CardHeader>
        <CardContent>
          <ManualBackupPanel
            logoutAfterExport={logoutAfterExport}
            canRestore={canManageStoreSettings}
          />
        </CardContent>
      </Card>
    </div>
  );
}
