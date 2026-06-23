"use client";

import { Button } from "@ecom/ui/components/button";
import { Input } from "@ecom/ui/components/input";
import { Label } from "@ecom/ui/components/label";
import { Eye, EyeOff } from "lucide-react";
import NextLink from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { AuthCard } from "../../../components/auth/AuthCard";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type SupportedLocale } from "../../../lib/i18n";
import { trpc } from "../../../lib/trpc";

const translations = {
  vi: {
    title: "Đăng ký",
    nameLabel: "Họ và tên",
    namePlaceholder: "Nguyễn Văn An",
    emailLabel: "Email",
    emailPlaceholder: "your@email.com",
    passwordLabel: "Mật khẩu",
    passwordPlaceholder: "Tối thiểu 8 ký tự",
    confirmPasswordLabel: "Xác nhận mật khẩu",
    confirmPasswordPlaceholder: "Nhập lại mật khẩu",
    signUp: "Đăng ký",
    signUpLoading: "Đang đăng ký...",
    alreadyHaveAccount: "Đã có tài khoản?",
    signIn: "Đăng nhập ngay",
  },
  en: {
    title: "Sign up",
    nameLabel: "Full Name",
    namePlaceholder: "John Doe",
    emailLabel: "Email",
    emailPlaceholder: "your@email.com",
    passwordLabel: "Password",
    passwordPlaceholder: "Minimum 8 characters",
    confirmPasswordLabel: "Confirm Password",
    confirmPasswordPlaceholder: "Re-enter your password",
    signUp: "Sign up",
    signUpLoading: "Signing up...",
    alreadyHaveAccount: "Already have an account?",
    signIn: "Sign in",
  },
};

export default function RegisterPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [validationError, setValidationError] = useState("");

  // Detect current locale from path
  const currentLocale: SupportedLocale = pathname
    ? ((SUPPORTED_LOCALES.find(
        (l) => pathname.startsWith(`/${l}/`) || pathname === `/${l}`,
      ) as SupportedLocale) ?? DEFAULT_LOCALE)
    : DEFAULT_LOCALE;

  const text = translations[currentLocale];

  const registerMutation = trpc.customer.auth.register.useMutation({
    onSuccess: async () => {
      try {
        await signIn("credentials", {
          redirect: false,
          identifier: email,
          password,
        });
        router.push(`/${currentLocale}/customer/dashboard`);
      } catch (err) {
        console.error("Auto sign in failed:", err);
        router.push(`/${currentLocale}/auth/login`);
      }
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError("");

    if (password !== confirmPassword) {
      setValidationError(
        currentLocale === "vi" ? "Mật khẩu xác nhận không khớp" : "Passwords do not match",
      );
      return;
    }
    if (password.length < 8) {
      setValidationError(
        currentLocale === "vi"
          ? "Mật khẩu phải có ít nhất 8 ký tự"
          : "Password must be at least 8 characters",
      );
      return;
    }

    registerMutation.mutate({
      email,
      password,
      name: name || undefined,
    });
  }

  const error = validationError || registerMutation.error?.message;

  return (
    <AuthCard showLogo showLanguageSelector showSocials showSupport>
      {/* Title */}
      <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-1 select-none">
        {text.title}
      </h1>

      {/* Error display */}
      {error && (
        <div className="rounded-xl border border-rose-100 dark:border-rose-950/50 bg-rose-50 dark:bg-rose-950/20 px-4 py-3 text-xs font-semibold text-rose-600 dark:text-rose-400">
          {error}
        </div>
      )}

      {/* Register Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Họ và tên */}
        <div className="flex flex-col gap-1.5">
          <Label
            htmlFor="register-name"
            className="text-xs font-bold text-slate-600 dark:text-slate-300"
          >
            {text.nameLabel}
          </Label>
          <Input
            id="register-name"
            type="text"
            required
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={text.namePlaceholder}
            className="w-full bg-background/50 dark:bg-slate-900/30"
          />
        </div>

        {/* Email */}
        <div className="flex flex-col gap-1.5">
          <Label
            htmlFor="register-email"
            className="text-xs font-bold text-slate-600 dark:text-slate-300"
          >
            {text.emailLabel}
          </Label>
          <Input
            id="register-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={text.emailPlaceholder}
            className="w-full bg-background/50 dark:bg-slate-900/30"
          />
        </div>

        {/* Password */}
        <div className="flex flex-col gap-1.5">
          <Label
            htmlFor="register-password"
            className="text-xs font-bold text-slate-600 dark:text-slate-300"
          >
            {text.passwordLabel}
          </Label>
          <div className="relative">
            <Input
              id="register-password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={text.passwordPlaceholder}
              className="w-full bg-background/50 dark:bg-slate-900/30 pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              aria-label="toggle password visibility"
            >
              {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div className="flex flex-col gap-1.5">
          <Label
            htmlFor="register-confirm-password"
            className="text-xs font-bold text-slate-600 dark:text-slate-300"
          >
            {text.confirmPasswordLabel}
          </Label>
          <div className="relative">
            <Input
              id="register-confirm-password"
              type={showConfirm ? "text" : "password"}
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={text.confirmPasswordPlaceholder}
              className="w-full bg-background/50 dark:bg-slate-900/30 pr-11"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((s) => !s)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              aria-label="toggle confirm password visibility"
            >
              {showConfirm ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
            </button>
          </div>
        </div>

        {/* Submit button */}
        <Button
          type="submit"
          disabled={registerMutation.isPending}
          className="w-full mt-2"
          size="lg"
        >
          {registerMutation.isPending && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
          )}
          {registerMutation.isPending ? text.signUpLoading : text.signUp}
        </Button>
      </form>

      {/* Footer Info */}
      <p className="text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
        {text.alreadyHaveAccount}{" "}
        <NextLink
          href={`/${currentLocale}/auth/login`}
          className="font-bold text-cyan-500 hover:underline transition-colors"
        >
          {text.signIn}
        </NextLink>
      </p>
    </AuthCard>
  );
}
