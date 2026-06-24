"use client";

import { Button } from "@ecom/ui/components/button";
import { Input } from "@ecom/ui/components/input";
import { Label } from "@ecom/ui/components/label";
import { CheckCircle, Lock } from "lucide-react";
import NextLink from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AuthCard } from "../../../components/auth/AuthCard";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type SupportedLocale } from "../../../lib/i18n";
import { trpc } from "../../../lib/trpc";

const translations = {
  vi: {
    title: "Đặt lại mật khẩu",
    desc: "Nhập mật khẩu mới cho tài khoản của bạn.",
    newPasswordLabel: "Mật khẩu mới",
    newPasswordPlaceholder: "Tối thiểu 8 ký tự",
    confirmPasswordLabel: "Xác nhận mật khẩu",
    confirmPasswordPlaceholder: "Nhập lại mật khẩu mới",
    buttonLabel: "Đặt lại mật khẩu",
    buttonLoading: "Đang xử lý...",
    invalidToken: "Token không hợp lệ hoặc đã hết hạn.",
    requestNewLink: "Yêu cầu link mới",
    successTitle: "Đặt lại thành công",
    successDesc: "Mật khẩu của bạn đã được thay đổi. Bạn có thể đăng nhập bằng mật khẩu mới.",
    signIn: "Đăng nhập ngay",
  },
  en: {
    title: "Reset your password",
    desc: "Enter your new password below to reset your account password.",
    newPasswordLabel: "New password",
    newPasswordPlaceholder: "Minimum 8 characters",
    confirmPasswordLabel: "Confirm password",
    confirmPasswordPlaceholder: "Re-enter your new password",
    buttonLabel: "Reset password",
    buttonLoading: "Processing...",
    invalidToken: "Invalid or expired verification token.",
    requestNewLink: "Request a new link",
    successTitle: "Reset successful",
    successDesc:
      "Your password has been successfully updated. You can now sign in with your new password.",
    signIn: "Sign in now",
  },
};

function ResetPasswordForm() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [validationError, setValidationError] = useState("");

  // Detect current locale from path
  const currentLocale: SupportedLocale = pathname
    ? ((SUPPORTED_LOCALES.find(
        (l) => pathname.startsWith(`/${l}/`) || pathname === `/${l}`,
      ) as SupportedLocale) ?? DEFAULT_LOCALE)
    : DEFAULT_LOCALE;

  const text = translations[currentLocale];

  const resetMutation = trpc.customer.auth.resetPassword.useMutation();

  const handleClose = () => router.push(`/${currentLocale}/auth/login`);

  if (!token) {
    return (
      <AuthCard icon={<Lock className="w-4.5 h-4.5" />} onClose={handleClose} showSupport>
        <div className="text-center flex flex-col items-center gap-3 py-4 select-none">
          <p className="text-rose-500 font-bold text-sm">{text.invalidToken}</p>
          <NextLink
            href={`/${currentLocale}/auth/forgot-password`}
            className="mt-2 text-cyan-500 font-bold text-sm hover:underline"
          >
            {text.requestNewLink}
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
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">{text.successTitle}</h1>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 max-w-[280px] leading-relaxed">
            {text.successDesc}
          </p>
        </div>

        <NextLink
          href={`/${currentLocale}/auth/login`}
          className="flex w-full items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 h-11 text-sm font-semibold shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 text-center mt-3"
        >
          {text.signIn}
        </NextLink>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={text.title}
      description={text.desc}
      icon={<Lock className="w-4.5 h-4.5" />}
      onClose={handleClose}
      showSupport
    >
      {/* Error banner */}
      {(validationError || resetMutation.error) && (
        <div className="rounded-xl border border-rose-100 dark:border-rose-950/50 bg-rose-50 dark:bg-rose-950/20 px-4 py-3 text-xs font-semibold text-rose-600 dark:text-rose-400">
          {validationError || resetMutation.error?.message}
        </div>
      )}

      {/* Reset Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setValidationError("");
          if (password.length < 8) {
            setValidationError(
              currentLocale === "vi"
                ? "Mật khẩu phải có ít nhất 8 ký tự"
                : "Password must be at least 8 characters",
            );
            return;
          }
          if (password !== confirmPassword) {
            setValidationError(
              currentLocale === "vi" ? "Mật khẩu xác nhận không khớp" : "Passwords do not match",
            );
            return;
          }
          resetMutation.mutate({ token, password });
        }}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1.5">
          <Label
            htmlFor="reset-password"
            className="text-xs font-bold text-slate-600 dark:text-slate-300"
          >
            {text.newPasswordLabel}
          </Label>
          <Input
            id="reset-password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={text.newPasswordPlaceholder}
            className="w-full bg-background/50 dark:bg-slate-900/30"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label
            htmlFor="reset-confirm"
            className="text-xs font-bold text-slate-600 dark:text-slate-300"
          >
            {text.confirmPasswordLabel}
          </Label>
          <Input
            id="reset-confirm"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder={text.confirmPasswordPlaceholder}
            className="w-full bg-background/50 dark:bg-slate-900/30"
          />
        </div>

        <Button type="submit" disabled={resetMutation.isPending} className="w-full mt-2" size="lg">
          {resetMutation.isPending && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
          )}
          {resetMutation.isPending ? text.buttonLoading : text.buttonLabel}
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
