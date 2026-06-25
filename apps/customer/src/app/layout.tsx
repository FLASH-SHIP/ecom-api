import { I18nProvider } from "@ecom/shared/@i18n";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import { SessionProvider } from "next-auth/react";
import { CustomerLayout } from "../components/CustomerLayout";
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
    default: "Ecom — Your all-in-one platform",
    template: "%s | Ecom",
  },
  description: "Discover articles, guides, and resources on Ecom.",
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
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
                <div className="flex min-h-screen flex-col">
                  <CustomerLayout>{children}</CustomerLayout>
                </div>
              </I18nProvider>
            </TRPCProvider>
          </SessionProvider>
        </CustomerThemeProvider>
      </body>
    </html>
  );
}
