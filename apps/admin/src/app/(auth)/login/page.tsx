"use client";

import { Button } from "@ecom/ui/components/button";
import { Card, CardContent } from "@ecom/ui/components/card";
import { Input } from "@ecom/ui/components/input";
import { Label } from "@ecom/ui/components/label";
import { cn } from "@ecom/ui/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

type FormType = {
  email: string;
  password: string;
};

const defaultValues: FormType = {
  email: "",
  password: "",
};

export default function LoginPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const schema = z.object({
    email: z.string().email(t("emailInvalid")).min(1, t("emailRequired")),
    password: z.string().min(1, t("passwordRequired")),
  });

  const { control, handleSubmit, formState } = useForm<FormType>({
    mode: "onChange",
    defaultValues,
    resolver: zodResolver(schema),
  });

  const { isSubmitting, dirtyFields } = formState;

  async function onSubmit(data: FormType) {
    setServerError(null);

    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    if (result?.error) {
      setServerError(t("loginError"));
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-w-0 flex-auto flex-col items-center justify-center py-8">
      <Card className="w-full max-w-sm rounded-xl shadow-sm sm:w-auto sm:max-w-none">
        <CardContent className="px-6 py-8 sm:p-12">
          <div className="mx-auto flex w-full max-w-80 flex-col gap-8 sm:mx-0 sm:w-80">
            {/* Title */}
            <div className="w-full">
              <Image src="/favicon.ico" alt="Ecom" width={48} height={48} priority />
              <h1 className="mt-8 text-4xl font-extrabold leading-tight tracking-tight">
                {t("login")}
              </h1>
              <p className="mt-1 font-medium text-muted-foreground">Ecom</p>
            </div>

            {/* Server error */}
            {serverError && (
              <div className="flex items-start gap-3 rounded-md border border-destructive/30 bg-red-50 px-4 py-3 text-sm text-destructive dark:bg-red-950">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                {serverError}
              </div>
            )}

            {/* Form */}
            <form
              noValidate
              className="flex w-full flex-col justify-center gap-4"
              onSubmit={handleSubmit(onSubmit)}
            >
              <Controller
                name="email"
                control={control}
                render={({ field, fieldState }) => (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="email">{t("email")}</Label>
                    <Input
                      {...field}
                      id="email"
                      autoFocus
                      type="email"
                      autoComplete="email"
                      placeholder="admin@ecom.com"
                      className={cn(fieldState.error && "border-destructive")}
                      required
                    />
                    {fieldState.error && (
                      <p className="text-xs text-destructive">{fieldState.error.message}</p>
                    )}
                  </div>
                )}
              />

              <Controller
                name="password"
                control={control}
                render={({ field, fieldState }) => (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="password">{t("password")}</Label>
                    <Input
                      {...field}
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      placeholder="••••••••"
                      className={cn(fieldState.error && "border-destructive")}
                      required
                      showPasswordLabel={t("showPassword")}
                      hidePasswordLabel={t("hidePassword")}
                    />
                    {fieldState.error && (
                      <p className="text-xs text-destructive">{fieldState.error.message}</p>
                    )}
                  </div>
                )}
              />

              <div className="flex justify-end">
                <a href="/forgot-password" className="text-sm font-medium hover:underline">
                  {t("forgotPassword")}
                </a>
              </div>

              <Button
                className="w-full"
                aria-label={t("loginButton")}
                disabled={isSubmitting || !dirtyFields.email}
                type="submit"
                size="lg"
              >
                {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                {isSubmitting ? t("loginLoading") : t("loginButton")}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
