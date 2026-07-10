import { I18nProvider } from "@ecom/shared/@i18n";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import { SessionProvider } from "next-auth/react";
import { CustomerLayout } from "../components/CustomerLayout";
import { ToastProvider } from "../components/toast-provider";
import { CustomerThemeProvider } from "../lib/CustomerThemeProvider";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "../lib/i18n";
import { TRPCProvider } from "../lib/trpc";
import "./globals.css";

import { env } from "@customer/env";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "Ecom Express",
    template: "%s | Ecom Express",
  },
  description: "Discover articles, guides, and resources on Ecom Express.",
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
  // Khai báo favicon cho các thiết bị và kích thước
  icons: {
    icon: [
      { url: "/favicons/favicon.ico" },
      { url: "/favicons/favicon.svg", type: "image/svg+xml" },
      { url: "/favicons/favicon-96x96.png", sizes: "96x96", type: "image/png" },
    ],
    apple: [{ url: "/favicons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  // Khai báo file manifest cho Android/PWA
  manifest: "/favicons/site.webmanifest",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value;
  const lang =
    locale && (SUPPORTED_LOCALES as readonly string[]).includes(locale) ? locale : DEFAULT_LOCALE;

  return (
    <html lang={lang} className={inter.variable}>
      <body>
        <CustomerThemeProvider>
          <SessionProvider>
            <TRPCProvider>
              <I18nProvider initialLocale={lang}>
                <ToastProvider>
                  <div className="flex min-h-screen flex-col">
                    <CustomerLayout>{children}</CustomerLayout>
                  </div>
                </ToastProvider>
              </I18nProvider>
            </TRPCProvider>
          </SessionProvider>
        </CustomerThemeProvider>
      </body>
    </html>
  );
}
