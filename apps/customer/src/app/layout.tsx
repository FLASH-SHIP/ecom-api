import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { CustomerLayout } from "../components/CustomerLayout";
import { HrefLangTags } from "../components/HrefLangTags";
import { CustomerThemeProvider } from "../lib/CustomerThemeProvider";
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
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale?: string }>;
}>) {
  const { locale } = await params;
  const lang = locale ?? "vi";

  return (
    <html lang={lang} className={inter.variable}>
      <head>
        <HrefLangTags />
      </head>
      <body>
        <CustomerThemeProvider>
          <SessionProvider>
            <TRPCProvider>
              <div className="flex min-h-screen flex-col">
                <CustomerLayout>{children}</CustomerLayout>
              </div>
            </TRPCProvider>
          </SessionProvider>
        </CustomerThemeProvider>
      </body>
    </html>
  );
}
