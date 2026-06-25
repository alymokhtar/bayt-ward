import { cookies } from "next/headers";
import { STORE_NAME_AR } from "@/lib/constants";

export default async function DashboardLoading() {
  const cookieStore = await cookies();
  const showSplash = cookieStore.get("splash-show")?.value;

  if (!showSplash) {
    return <div className="min-h-screen bg-cream" />;
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-cream"
      style={{
        background: `
          radial-gradient(circle at 20% 20%, color-mix(in srgb, #b8860b 12%, transparent) 0%, transparent 50%),
          radial-gradient(circle at 80% 80%, color-mix(in srgb, #b8860b 8%, transparent) 0%, transparent 50%),
          radial-gradient(circle at 50% 50%, color-mix(in srgb, #4b3621 5%, transparent) 0%, transparent 70%),
          #fdf5e6
        `,
      }}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-20 -right-20 w-60 h-60 rounded-full opacity-10"
          style={{ background: "color-mix(in srgb, #b8860b 40%, transparent)" }}
        />
        <div
          className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full opacity-10"
          style={{ background: "color-mix(in srgb, #b8860b 30%, transparent)" }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center">
        <div
          className="relative h-32 w-32 mb-6 rounded-2xl border-2 border-gold/30 shadow-2xl overflow-hidden flex items-center justify-center"
          style={{ background: "color-mix(in srgb, #4b3621 90%, #b8860b)" }}
        >
          <div className="h-20 w-20 bg-cream/20 rounded-lg" />
        </div>

        <h1 className="text-2xl font-bold text-brown mb-1">{STORE_NAME_AR}</h1>
        <p className="text-sm text-gold-dark tracking-wider uppercase mb-8">
          Bayt Ward
        </p>

        <div className="w-48 h-1.5 rounded-full bg-cream-dark border border-gold/20 overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: "0%",
              background: "linear-gradient(90deg, #b8860b, #d4a84b, #b8860b)",
            }}
          />
        </div>

        <p className="text-xs text-muted mt-3" dir="rtl">
          جاري التحميل...
        </p>
      </div>
    </div>
  );
}
