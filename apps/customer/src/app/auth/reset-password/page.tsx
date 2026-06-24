"use client";

import { translate } from "@ecom/i18n";
import { Button } from "@ecom/ui/components/button";
import { Input } from "@ecom/ui/components/input";
import { Label } from "@ecom/ui/components/label";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle, Lock } from "lucide-react";
import NextLink from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { AuthCard } from "../../../components/auth/AuthCard";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type SupportedLocale } from "../../../lib/i18n";
import { trpc } from "../../../lib/trpc";

function ResetPasswordForm() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [error, setError] = useState<string | null>(null);

  // Detect current locale from path
  const currentLocale: SupportedLocale = pathname
    ? ((SUPPORTED_LOCALES.find(
        (l) => pathname.startsWith(`/${l}/`) || pathname === `/${l}`,
      ) as SupportedLocale) ?? DEFAULT_LOCALE)
    : DEFAULT_LOCALE;

  const schema = z
    .object({
      password: z.string().min(8, translate("customerAuth.register.passwordMin", currentLocale)),
      confirmPassword: z
        .string()
        .min(1, translate("customerAuth.register.passwordRequired", currentLocale)),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: translate("customerAuth.register.passwordMismatch", currentLocale),
      path: ["confirmPassword"],
    });

  type FormValues = z.infer<typeof schema>;

  const { control, handleSubmit, formState } = useForm<FormValues>({
    mode: "onChange",
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
    resolver: zodResolver(schema),
  });

  const { isSubmitting } = formState;

  const resetMutation = trpc.customer.auth.resetPassword.useMutation({
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleClose = () => router.push(`/${currentLocale}/auth/login`);

  const onSubmit = (data: FormValues) => {
    setError(null);
    resetMutation.mutate({ token, password: data.password });
  };

  if (!token) {
    return (
      <AuthCard icon={<Lock className="w-4.5 h-4.5" />} onClose={handleClose} showSupport>
        <div className="text-center flex flex-col items-center gap-3 py-4 select-none">
          <p className="text-rose-500 font-bold text-sm">
            {translate("customerAuth.resetPassword.invalidToken", currentLocale)}
          </p>
          <NextLink
            href={`/${currentLocale}/auth/forgot-password`}
            className="mt-2 text-cyan-500 font-bold text-sm hover:underline"
          >
            {translate("customerAuth.resetPassword.requestNewLink", currentLocale)}
          </NextLink>
        </div>
      </AuthCard>
    );
  }

  if (resetMutation.isSuccess) {
    return (
      <AuthCard icon={<Lock className="w-4.5 h-4.5" />} onClose={handleClose} showSupport>
        <div className="text-center flex flex-col items-center gap-3 select-none">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 shadow-sm mb-1">
            <CheckCircle className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            {translate("customerAuth.resetPassword.successTitle", currentLocale)}
          </h1>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 max-w-[280px] leading-relaxed">
            {translate("customerAuth.resetPassword.successDesc", currentLocale)}
          </p>
        </div>

        <NextLink
          href={`/${currentLocale}/auth/login`}
          className="flex w-full items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 h-11 text-sm font-semibold shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 text-center mt-3"
        >
          {translate("customerAuth.resetPassword.signIn", currentLocale)}
        </NextLink>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={translate("customerAuth.resetPassword.title", currentLocale)}
      description={translate("customerAuth.resetPassword.desc", currentLocale)}
      icon={<Lock className="w-4.5 h-4.5" />}
      onClose={handleClose}
      showSupport
    >
      {/* Error banner */}
      {(error || resetMutation.error) && (
        <div className="rounded-xl border border-rose-100 dark:border-rose-950/50 bg-rose-50 dark:bg-rose-950/20 px-4 py-3 text-xs font-semibold text-rose-600 dark:text-rose-400">
          {error || resetMutation.error?.message}
        </div>
      )}

      {/* Reset Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Controller
          name="password"
          control={control}
          render={({ field, fieldState }) => (
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="reset-password"
                className="text-xs font-bold text-slate-600 dark:text-slate-300"
              >
                {translate("customerAuth.resetPassword.newPasswordLabel", currentLocale)}
              </Label>
              <Input
                {...field}
                id="reset-password"
                type="password"
                placeholder={translate(
                  "customerAuth.resetPassword.newPasswordPlaceholder",
                  currentLocale,
                )}
                className="w-full bg-background/50 dark:bg-slate-900/30"
                showPasswordLabel={translate("auth.showPassword", currentLocale)}
                hidePasswordLabel={translate("auth.hidePassword", currentLocale)}
                aria-invalid={!!fieldState.error}
              />
              {fieldState.error && (
                <p className="text-xs text-destructive font-medium">{fieldState.error.message}</p>
              )}
            </div>
          )}
        />

        <Controller
          name="confirmPassword"
          control={control}
          render={({ field, fieldState }) => (
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="reset-confirm"
                className="text-xs font-bold text-slate-600 dark:text-slate-300"
              >
                {translate("customerAuth.resetPassword.confirmPasswordLabel", currentLocale)}
              </Label>
              <Input
                {...field}
                id="reset-confirm"
                type="password"
                placeholder={translate(
                  "customerAuth.resetPassword.confirmPasswordPlaceholder",
                  currentLocale,
                )}
                className="w-full bg-background/50 dark:bg-slate-900/30"
                showPasswordLabel={translate("auth.showPassword", currentLocale)}
                hidePasswordLabel={translate("auth.hidePassword", currentLocale)}
                aria-invalid={!!fieldState.error}
              />
              {fieldState.error && (
                <p className="text-xs text-destructive font-medium">{fieldState.error.message}</p>
              )}
            </div>
          )}
        />

        <Button type="submit" disabled={isSubmitting} className="w-full mt-2" size="lg">
          {isSubmitting && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
          )}
          {isSubmitting
            ? translate("customerAuth.resetPassword.buttonLoading", currentLocale)
            : translate("customerAuth.resetPassword.buttonLabel", currentLocale)}
        </Button>
      </form>
    </AuthCard>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full bg-white/75 dark:bg-slate-950/75 backdrop-blur-xl text-slate-800 dark:text-slate-100 rounded-3xl p-10 shadow-2xl text-center text-sm font-bold text-slate-400">
          Loading...
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
