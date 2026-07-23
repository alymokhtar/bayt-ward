import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import PWAExitGuard from "@/components/pwa/PWAExitGuard";
import PWARegister from "@/components/pwa/PWARegister";
import "./globals.css";

const cairo = localFont({
  src: "../../public/fonts/arabtype.ttf",
  variable: "--font-cairo",
  weight: "300 700",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "بيت ورد | Bayt Ward",
    template: "%s | بيت ورد",
  },
  description:
    "نظام إدارة متجر بيت ورد للملابس النسائية — مبيعات، مخزون، وتقارير",
  keywords: ["بيت ورد", "Bayt Ward", "ملابس نسائية", "إدارة متجر"],
  authors: [{ name: "Bayt Ward" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "بيت ورد",
  },
  icons: {
    icon: "/images/logo-light.png",
    apple: "/images/logo-light.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#FDFBF7",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${cairo.variable} ${cairo.className} h-full`}
    >
      <body className="min-h-full flex flex-col font-sans antialiased">
        {children}
        <PWAExitGuard />
        <PWARegister />
      </body>
    </html>
  );
}
