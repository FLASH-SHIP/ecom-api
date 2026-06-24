"use client";

import { translate } from "@ecom/i18n";
import { Button } from "@ecom/ui/components/button";
import { Input } from "@ecom/ui/components/input";
import { Label } from "@ecom/ui/components/label";
import { zodResolver } from "@hookform/resolvers/zod";
import NextLink from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { AuthCard } from "../../../components/auth/AuthCard";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type SupportedLocale } from "../../../lib/i18n";

type FormValues = {
  identifier: string;
  password: string;
};

export default function LoginPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [error, setError] = useState<string | null>(null);

  // Detect current locale from path
  const currentLocale: SupportedLocale = pathname
    ? ((SUPPORTED_LOCALES.find(
        (l) => pathname.startsWith(`/${l}/`) || pathname === `/${l}`,
      ) as SupportedLocale) ?? DEFAULT_LOCALE)
    : DEFAULT_LOCALE;

  const schema = z.object({
    identifier: z
      .string()
      .min(1, translate("customerAuth.login.emailUsernameRequired", currentLocale)),
    password: z.string().min(1, translate("customerAuth.register.passwordRequired", currentLocale)),
  });

  const { control, handleSubmit, formState } = useForm<FormValues>({
    mode: "onChange",
    defaultValues: {
      identifier: "",
      password: "",
    },
    resolver: zodResolver(schema),
  });

  const { isSubmitting } = formState;

  async function onSubmit(data: FormValues) {
    setError(null);

    try {
      const res = await signIn("credentials", {
        redirect: false,
        identifier: data.identifier,
        password: data.password,
      });

      if (res?.error) {
        setError(translate("customerAuth.login.invalidCredentials", currentLocale));
      } else {
        router.push(`/${currentLocale}/customer/dashboard`);
      }
    } catch (err) {
      console.error(err);
      setError(translate("customerAuth.login.unexpectedError", currentLocale));
    }
  }

  return (
    <AuthCard showLogo showLanguageSelector showSocials showSupport>
      {/* Error display */}
      {error && (
        <div className="rounded-xl border border-rose-100 dark:border-rose-950/50 bg-rose-50 dark:bg-rose-950/20 px-4 py-3 text-xs font-semibold text-rose-600 dark:text-rose-400">
          {error}
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {/* Email or Username */}
        <Controller
          name="identifier"
          control={control}
          render={({ field, fieldState }) => (
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="login-identifier"
                className="text-xs font-bold text-slate-600 dark:text-slate-300"
              >
                {translate("customerAuth.login.emailUsername", currentLocale)}
              </Label>
              <Input
                {...field}
                id="login-identifier"
                type="text"
                autoComplete="username"
                placeholder={translate(
                  "customerAuth.login.emailUsernamePlaceholder",
                  currentLocale,
                )}
                className="w-full bg-background/50 dark:bg-slate-900/30"
                aria-invalid={!!fieldState.error}
              />
              {fieldState.error && (
                <p className="text-xs text-destructive font-medium">{fieldState.error.message}</p>
              )}
            </div>
          )}
        />

        {/* Password */}
        <Controller
          name="password"
          control={control}
          render={({ field, fieldState }) => (
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="login-password"
                className="text-xs font-bold text-slate-600 dark:text-slate-300"
              >
                {translate("customerAuth.login.password", currentLocale)}
              </Label>
              <Input
                {...field}
                id="login-password"
                type="password"
                autoComplete="current-password"
                placeholder={translate("customerAuth.login.passwordPlaceholder", currentLocale)}
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

        {/* Forgot password */}
        <div className="flex justify-end -mt-1.5">
          <NextLink
            href={`/${currentLocale}/auth/forgot-password`}
            className="text-xs font-bold text-cyan-500 hover:text-cyan-600 transition-colors"
          >
            {translate("customerAuth.login.forgotPassword", currentLocale)}
          </NextLink>
        </div>

        {/* Submit button */}
        <Button type="submit" disabled={isSubmitting} className="w-full mt-2" size="lg">
          {isSubmitting && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
          )}
          {isSubmitting
            ? translate("customerAuth.login.signInLoading", currentLocale)
            : translate("customerAuth.login.signIn", currentLocale)}
        </Button>
      </form>

      {/* Footer Info */}
      <p className="text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
        {translate("customerAuth.login.dontHaveAccount", currentLocale)}{" "}
        <NextLink
          href={`/${currentLocale}/auth/register`}
          className="font-bold text-cyan-500 hover:underline transition-colors"
        >
          {translate("customerAuth.login.signUp", currentLocale)}
        </NextLink>
      </p>
    </AuthCard>
  );
}
