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
import { trpc } from "../../../lib/trpc";

export default function RegisterPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [error, setError] = useState<string | null>(null);

  // Detect current locale from path
  const currentLocale: SupportedLocale = pathname
    ? ((SUPPORTED_LOCALES.find(
        (l) => pathname.startsWith(`/${l}/`) || pathname === `/${l}`,
      ) as SupportedLocale) ?? DEFAULT_LOCALE)
    : DEFAULT_LOCALE;

  const schema = z
    .object({
      name: z.string().min(1, translate("customerAuth.register.nameRequired", currentLocale)),
      email: z
        .string()
        .min(1, translate("customerAuth.register.emailRequired", currentLocale))
        .email(translate("customerAuth.register.emailInvalid", currentLocale)),
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

  const { control, handleSubmit } = useForm<FormValues>({
    mode: "onChange",
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    resolver: zodResolver(schema),
  });

  const registerMutation = trpc.customer.auth.register.useMutation({
    onSuccess: async (_, variables) => {
      try {
        await signIn("credentials", {
          redirect: false,
          identifier: variables.email,
          password: variables.password,
        });
        router.push(`/${currentLocale}/customer/dashboard`);
      } catch (err) {
        console.error("Auto sign in failed:", err);
        router.push(`/${currentLocale}/auth/login`);
      }
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const onSubmit = (data: FormValues) => {
    setError(null);
    registerMutation.mutate({
      email: data.email,
      password: data.password,
      name: data.name || undefined,
    });
  };

  const isPending = registerMutation.isPending;

  return (
    <AuthCard showLogo showLanguageSelector showSocials showSupport>
      {/* Title */}
      <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-1 select-none">
        {translate("customerAuth.register.title", currentLocale)}
      </h1>

      {/* Error display */}
      {(error || registerMutation.error) && (
        <div className="rounded-xl border border-rose-100 dark:border-rose-950/50 bg-rose-50 dark:bg-rose-950/20 px-4 py-3 text-xs font-semibold text-rose-600 dark:text-rose-400">
          {error || registerMutation.error?.message}
        </div>
      )}

      {/* Register Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {/* Họ và tên */}
        <Controller
          name="name"
          control={control}
          render={({ field, fieldState }) => (
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="register-name"
                className="text-xs font-bold text-slate-600 dark:text-slate-300"
              >
                {translate("customerAuth.register.nameLabel", currentLocale)}
              </Label>
              <Input
                {...field}
                id="register-name"
                type="text"
                autoComplete="name"
                placeholder={translate("customerAuth.register.namePlaceholder", currentLocale)}
                className="w-full bg-background/50 dark:bg-slate-900/30"
                aria-invalid={!!fieldState.error}
              />
              {fieldState.error && (
                <p className="text-xs text-destructive font-medium">{fieldState.error.message}</p>
              )}
            </div>
          )}
        />

        {/* Email */}
        <Controller
          name="email"
          control={control}
          render={({ field, fieldState }) => (
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="register-email"
                className="text-xs font-bold text-slate-600 dark:text-slate-300"
              >
                {translate("customerAuth.register.emailLabel", currentLocale)}
              </Label>
              <Input
                {...field}
                id="register-email"
                type="email"
                autoComplete="email"
                placeholder={translate("customerAuth.register.emailPlaceholder", currentLocale)}
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
                htmlFor="register-password"
                className="text-xs font-bold text-slate-600 dark:text-slate-300"
              >
                {translate("customerAuth.register.passwordLabel", currentLocale)}
              </Label>
              <Input
                {...field}
                id="register-password"
                type="password"
                autoComplete="new-password"
                placeholder={translate("customerAuth.register.passwordPlaceholder", currentLocale)}
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

        {/* Confirm Password */}
        <Controller
          name="confirmPassword"
          control={control}
          render={({ field, fieldState }) => (
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="register-confirm-password"
                className="text-xs font-bold text-slate-600 dark:text-slate-300"
              >
                {translate("customerAuth.register.confirmPasswordLabel", currentLocale)}
              </Label>
              <Input
                {...field}
                id="register-confirm-password"
                type="password"
                autoComplete="new-password"
                placeholder={translate(
                  "customerAuth.register.confirmPasswordPlaceholder",
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

        {/* Submit button */}
        <Button type="submit" disabled={isPending} className="w-full mt-2" size="lg">
          {isPending && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
          )}
          {isPending
            ? translate("customerAuth.register.signUpLoading", currentLocale)
            : translate("customerAuth.register.signUp", currentLocale)}
        </Button>
      </form>

      {/* Footer Info */}
      <p className="text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
        {translate("customerAuth.register.alreadyHaveAccount", currentLocale)}{" "}
        <NextLink
          href={`/${currentLocale}/auth/login`}
          className="font-bold text-cyan-500 hover:underline transition-colors"
        >
          {translate("customerAuth.register.signIn", currentLocale)}
        </NextLink>
      </p>
    </AuthCard>
  );
}
