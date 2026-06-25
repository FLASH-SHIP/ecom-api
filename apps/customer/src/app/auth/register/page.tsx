"use client";

import { translate } from "@ecom/i18n";
import { Button } from "@ecom/ui/components/button";
import { Input } from "@ecom/ui/components/input";
import { Label } from "@ecom/ui/components/label";
import { zodResolver } from "@hookform/resolvers/zod";
import NextLink from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { AuthCard } from "../../../components/auth/AuthCard";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type SupportedLocale } from "../../../lib/i18n";
import { trpc } from "../../../lib/trpc";

export default function RegisterPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [codeCountdown, setCodeCountdown] = useState(0);

  // Detect current locale from path
  const currentLocale: SupportedLocale = pathname
    ? ((SUPPORTED_LOCALES.find(
        (l) => pathname.startsWith(`/${l}/`) || pathname === `/${l}`,
      ) as SupportedLocale) ?? DEFAULT_LOCALE)
    : DEFAULT_LOCALE;

  const schema = z.object({
    email: z
      .string()
      .min(1, translate("customerAuth.register.emailRequired", currentLocale))
      .email(translate("customerAuth.register.emailInvalid", currentLocale)),
    code: z
      .string()
      .min(1, translate("customerAuth.register.codeRequired", currentLocale))
      .length(6, translate("customerAuth.register.codeInvalid", currentLocale)),
    password: z.string().min(8, translate("customerAuth.register.passwordMin", currentLocale)),
  });

  type FormValues = z.infer<typeof schema>;

  const { control, handleSubmit, watch } = useForm<FormValues>({
    mode: "onChange",
    defaultValues: {
      email: "",
      code: "",
      password: "",
    },
    resolver: zodResolver(schema),
  });

  const emailValue = watch("email");

  // Restore countdown timer from localStorage on mount
  useEffect(() => {
    const sentAtStr = localStorage.getItem("customer_register_otp_sent_at");
    if (sentAtStr) {
      const sentAt = Number.parseInt(sentAtStr, 10);
      const elapsed = Math.floor((Date.now() - sentAt) / 1000);
      if (elapsed > 0 && elapsed < 120) {
        setCodeCountdown(120 - elapsed);
      } else {
        localStorage.removeItem("customer_register_otp_sent_at");
      }
    }
  }, []);

  // Handle code request countdown
  useEffect(() => {
    if (codeCountdown <= 0) {
      localStorage.removeItem("customer_register_otp_sent_at");
      return;
    }
    const timer = setInterval(() => {
      setCodeCountdown((prev) => {
        if (prev <= 1) {
          localStorage.removeItem("customer_register_otp_sent_at");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [codeCountdown]);

  const sendCodeMutation = trpc.customer.auth.sendVerificationCode.useMutation({
    onSuccess: () => {
      setSuccessMessage(translate("customerAuth.register.codeSent", currentLocale));
      localStorage.setItem("customer_register_otp_sent_at", Date.now().toString());
      setCodeCountdown(120); // 2 minutes countdown
      setError(null);
    },
    onError: (err) => {
      setError(err.message);
      setSuccessMessage(null);
    },
  });

  const registerMutation = trpc.customer.auth.register.useMutation({
    onSuccess: async (_, variables) => {
      localStorage.removeItem("customer_register_otp_sent_at");
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
      code: data.code,
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

      {/* Success display */}
      {successMessage && (
        <div className="rounded-xl border border-emerald-100 dark:border-emerald-950/50 bg-emerald-50 dark:bg-emerald-950/20 px-4 py-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          {successMessage}
        </div>
      )}

      {/* Register Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
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
              <div className="flex gap-2">
                <Input
                  {...field}
                  id="register-email"
                  type="email"
                  autoComplete="email"
                  placeholder={translate("customerAuth.register.emailPlaceholder", currentLocale)}
                  className="flex-1 bg-background/50 dark:bg-slate-900/30"
                  aria-invalid={!!fieldState.error}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={codeCountdown > 0 || sendCodeMutation.isPending || !emailValue}
                  onClick={() => {
                    if (emailValue) {
                      sendCodeMutation.mutate({ email: emailValue });
                    }
                  }}
                  className="shrink-0 h-10 select-none font-semibold text-xs border border-cyan-500/30 hover:border-cyan-500 text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300 dark:border-cyan-500/20"
                >
                  {sendCodeMutation.isPending && (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent mr-1.5" />
                  )}
                  {codeCountdown > 0
                    ? `${Math.floor(codeCountdown / 60)
                        .toString()
                        .padStart(2, "0")}:${(codeCountdown % 60).toString().padStart(2, "0")}`
                    : translate("customerAuth.register.getCode", currentLocale)}
                </Button>
              </div>
              {fieldState.error && (
                <p className="text-xs text-destructive font-medium">{fieldState.error.message}</p>
              )}
            </div>
          )}
        />

        {/* Verification Code */}
        <Controller
          name="code"
          control={control}
          render={({ field, fieldState }) => (
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="register-code"
                className="text-xs font-bold text-slate-600 dark:text-slate-300"
              >
                {translate("customerAuth.register.codeLabel", currentLocale)}
              </Label>
              <Input
                {...field}
                id="register-code"
                type="text"
                maxLength={6}
                placeholder={translate("customerAuth.register.codePlaceholder", currentLocale)}
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
