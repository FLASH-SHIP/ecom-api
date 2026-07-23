import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import { HrefLangTags } from "../components/HrefLangTags";
import { WebLayout } from "../components/WebLayout";
import { CustomerThemeProvider } from "../lib/CustomerThemeProvider";
import { TRPCProvider } from "@web/lib/trpc";
import "./globals.css";

import { env } from "@web/env";

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

  const cookieStore = await cookies();
  const isLoggedIn =
    cookieStore.has("authjs.session-token") || cookieStore.has("__Secure-authjs.session-token");

  return (
    <html lang={lang} className={inter.variable}>
      <head>
        <HrefLangTags />
      </head>
      <body>
        <CustomerThemeProvider>
          <TRPCProvider>
            <div className="flex min-h-screen flex-col">
              <WebLayout isLoggedIn={isLoggedIn}>{children}</WebLayout>
            </div>
          </TRPCProvider>
        </CustomerThemeProvider>
      </body>
    </html>
  );
}
