"use client";

import { translate } from "@ecom/i18n";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import NextLink from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AuthCard } from "../../../components/auth/AuthCard";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type SupportedLocale } from "../../../lib/i18n";
import { trpc } from "../../../lib/trpc";

function VerifyEmailContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  // Detect current locale from path
  const currentLocale: SupportedLocale = pathname
    ? ((SUPPORTED_LOCALES.find(
        (l) => pathname.startsWith(`/${l}/`) || pathname === `/${l}`,
      ) as SupportedLocale) ?? DEFAULT_LOCALE)
    : DEFAULT_LOCALE;

  const verifyMutation = trpc.customer.auth.verifyEmail.useMutation();

  if (!token) {
    return (
      <div className="text-center flex flex-col items-center gap-3 py-4 select-none">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/20 text-rose-500 shadow-sm mb-1">
          <XCircle className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          {translate("customerAuth.verifyEmail.invalidTokenTitle", currentLocale)}
        </h1>
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 max-w-[280px] leading-relaxed">
          {translate("customerAuth.verifyEmail.invalidTokenDesc", currentLocale)}
        </p>
        <NextLink
          href={`/${currentLocale}/auth/login`}
          className="flex w-full items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 h-11 text-sm font-semibold shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 text-center mt-3"
        >
          {translate("customerAuth.verifyEmail.backToLogin", currentLocale)}
        </NextLink>
      </div>
    );
  }

  if (verifyMutation.isIdle) {
    verifyMutation.mutate({ token });
  }

  if (verifyMutation.isPending) {
    return (
      <div className="text-center flex flex-col items-center gap-3 py-6 select-none">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
        <h1 className="text-lg font-bold text-slate-900 dark:text-white mt-2">
          {translate("customerAuth.verifyEmail.verifyingTitle", currentLocale)}
        </h1>
        <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold">
          {translate("customerAuth.verifyEmail.verifyingDesc", currentLocale)}
        </p>
      </div>
    );
  }

  if (verifyMutation.isError) {
    return (
      <div className="text-center flex flex-col items-center gap-3 py-4 select-none">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/20 text-rose-500 shadow-sm mb-1">
          <XCircle className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          {translate("customerAuth.verifyEmail.errorTitle", currentLocale)}
        </h1>
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 max-w-[280px] leading-relaxed">
          {verifyMutation.error.message}
        </p>
        <NextLink
          href={`/${currentLocale}/auth/login`}
          className="flex w-full items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 h-11 text-sm font-semibold shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 text-center mt-3"
        >
          {translate("customerAuth.verifyEmail.backToLogin", currentLocale)}
        </NextLink>
      </div>
    );
  }

  return (
    <div className="text-center flex flex-col items-center gap-3 py-4 select-none">
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 shadow-sm mb-1">
        <CheckCircle className="w-6 h-6" />
      </div>
      <h1 className="text-xl font-bold text-slate-900 dark:text-white">
        {translate("customerAuth.verifyEmail.successTitle", currentLocale)}
      </h1>
      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 max-w-[280px] leading-relaxed">
        {translate("customerAuth.verifyEmail.successDesc", currentLocale)}
      </p>
      <NextLink
        href={`/${currentLocale}/customer/dashboard`}
        className="flex w-full items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 h-11 text-sm font-semibold shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 text-center mt-3"
      >
        {translate("customerAuth.verifyEmail.goToDashboard", currentLocale)}
      </NextLink>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <AuthCard showSupport>
      <Suspense
        fallback={
          <div className="py-8 text-center text-sm font-bold text-slate-400 select-none">
            Loading...
          </div>
        }
      >
        <VerifyEmailContent />
      </Suspense>
    </AuthCard>
  );
}
