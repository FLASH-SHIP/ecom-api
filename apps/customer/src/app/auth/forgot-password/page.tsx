"use client";

import { translate } from "@ecom/i18n";
import { useI18n } from "@ecom/shared/@i18n";
import { Button } from "@ecom/ui/components/button";
import { Input } from "@ecom/ui/components/input";
import { Label } from "@ecom/ui/components/label";
import { Lock } from "lucide-react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { AuthCard } from "../../../components/auth/AuthCard";
import { trpc } from "../../../lib/trpc";
import { zodResolver } from "../../../lib/zodResolver";

type FormValues = {
  email: string;
};

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { languageId: currentLocale } = useI18n();
  const [submitted, setSubmitted] = useState(false);

  const schema = useMemo(
    () =>
      z.object({
        email: z
          .string()
          .min(1, translate("customerAuth.register.emailRequired", currentLocale))
          .email(translate("customerAuth.register.emailInvalid", currentLocale)),
      }),
    [currentLocale],
  );

  const resolver = useMemo(() => zodResolver(schema), [schema]);

  const { control, handleSubmit, formState } = useForm<FormValues>({
    mode: "onChange",
    defaultValues: {
      email: "",
    },
    resolver,
  });

  const { isSubmitting } = formState;

  const forgotMutation = trpc.customer.auth.forgotPassword.useMutation({
    onSuccess: () => setSubmitted(true),
  });

  const handleClose = () => router.push("/auth/login");

  const onSubmit = (data: FormValues) => {
    forgotMutation.mutate({ email: data.email });
  };

  if (submitted) {
    return (
      <AuthCard icon={<Lock className="w-4.5 h-4.5" />} onClose={handleClose} showSupport>
        <div className="text-center flex flex-col items-center gap-3 select-none">
          <h1 className="text-xl font-bold text-foreground mt-1">
            {translate("customerAuth.forgotPassword.checkEmailTitle", currentLocale)}
          </h1>
          <p className="text-sm font-semibold text-muted-foreground max-w-[280px] leading-relaxed">
            {translate("customerAuth.forgotPassword.checkEmailDesc", currentLocale)}
          </p>
        </div>

        <NextLink
          href="/auth/login"
          className="flex w-full items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 h-11 text-sm font-semibold shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 text-center mt-3"
        >
          {translate("customerAuth.forgotPassword.backToLogin", currentLocale)}
        </NextLink>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={translate("customerAuth.forgotPassword.title", currentLocale)}
      description={translate("customerAuth.forgotPassword.desc", currentLocale)}
      icon={<Lock className="w-4.5 h-4.5" />}
      onClose={handleClose}
      showSupport
    >
      {/* Error banner */}
      {forgotMutation.error && (
        <div className="rounded-xl border border-rose-100 dark:border-rose-950/50 bg-rose-50 dark:bg-rose-950/20 px-4 py-3 text-xs font-semibold text-rose-600 dark:text-rose-400">
          {forgotMutation.error.message}
        </div>
      )}

      {/* Email form */}
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Controller
          name="email"
          control={control}
          render={({ field, fieldState }) => (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="forgot-email" className="text-xs font-bold text-muted-foreground">
                {translate("customerAuth.forgotPassword.emailLabel", currentLocale)}
              </Label>
              <Input
                {...field}
                id="forgot-email"
                type="email"
                placeholder={translate(
                  "customerAuth.forgotPassword.emailPlaceholder",
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

        <Button type="submit" disabled={isSubmitting} className="w-full mt-2">
          {isSubmitting && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
          )}
          {isSubmitting
            ? translate("customerAuth.forgotPassword.buttonLoading", currentLocale)
            : translate("customerAuth.forgotPassword.buttonLabel", currentLocale)}
        </Button>
      </form>
    </AuthCard>
  );
}
