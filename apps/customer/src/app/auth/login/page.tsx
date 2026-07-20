"use client";

import { translate } from "@ecom/i18n";
import { useI18n } from "@ecom/shared/@i18n";
import { Button } from "@ecom/ui/components/button";
import { Input } from "@ecom/ui/components/input";
import { Label } from "@ecom/ui/components/label";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { AuthCard } from "../../../components/auth/AuthCard";
import { zodResolver } from "../../../lib/zodResolver";

type FormValues = {
  identifier: string;
  password: string;
};

export default function LoginPage() {
  const router = useRouter();
  const { languageId: currentLocale } = useI18n();
  const [error, setError] = useState<string | null>(null);

  const schema = useMemo(
    () =>
      z.object({
        identifier: z
          .string()
          .min(1, translate("customerAuth.login.emailUsernameRequired", currentLocale)),
        password: z
          .string()
          .min(1, translate("customerAuth.register.passwordRequired", currentLocale)),
      }),
    [currentLocale],
  );

  const resolver = useMemo(() => zodResolver(schema), [schema]);

  const { control, handleSubmit, formState } = useForm<FormValues>({
    mode: "onChange",
    defaultValues: {
      identifier: "",
      password: "",
    },
    resolver,
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
        router.push("/dashboard");
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
              <Label htmlFor="login-identifier" className="text-xs font-bold text-muted-foreground">
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
                className="w-full bg-background/50"
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
              <Label htmlFor="login-password" className="text-xs font-bold text-muted-foreground">
                {translate("customerAuth.login.password", currentLocale)}
              </Label>
              <Input
                {...field}
                id="login-password"
                type="password"
                autoComplete="current-password"
                placeholder={translate("customerAuth.login.passwordPlaceholder", currentLocale)}
                className="w-full bg-background/50"
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
            href="/auth/forgot-password"
            className="text-xs font-bold text-primary hover:text-primary/80 transition-colors"
          >
            {translate("customerAuth.login.forgotPassword", currentLocale)}
          </NextLink>
        </div>

        {/* Submit button */}
        <Button type="submit" disabled={isSubmitting} className="w-full mt-2">
          {isSubmitting && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
          )}
          {isSubmitting
            ? translate("customerAuth.login.signInLoading", currentLocale)
            : translate("customerAuth.login.signIn", currentLocale)}
        </Button>
      </form>

      {/* Footer Info */}
      <p className="text-center text-xs font-semibold text-muted-foreground">
        {translate("customerAuth.login.dontHaveAccount", currentLocale)}{" "}
        <NextLink
          href="/auth/register"
          className="font-bold text-primary hover:underline transition-colors"
        >
          {translate("customerAuth.login.signUp", currentLocale)}
        </NextLink>
      </p>
    </AuthCard>
  );
}
