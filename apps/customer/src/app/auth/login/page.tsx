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

const translations = {
  vi: {
    emailUsername: "Email/ Username",
    emailUsernamePlaceholder: "email@example.com hoặc username",
    password: "Mật khẩu",
    passwordPlaceholder: "••••••••",
    forgotPassword: "Quên mật khẩu?",
    signIn: "Đăng nhập",
    signInLoading: "Đang đăng nhập...",
    dontHaveAccount: "Chưa có tài khoản?",
    signUp: "Đăng ký ngay",
  },
  en: {
    emailUsername: "Email/ Username",
    emailUsernamePlaceholder: "email@example.com or username",
    password: "Password",
    passwordPlaceholder: "••••••••",
    forgotPassword: "Forgot password?",
    signIn: "Sign in",
    signInLoading: "Signing in...",
    dontHaveAccount: "Don't have account?",
    signUp: "Sign up",
  },
};

export default function LoginPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Detect current locale from path
  const currentLocale: SupportedLocale = pathname
    ? ((SUPPORTED_LOCALES.find(
        (l) => pathname.startsWith(`/${l}/`) || pathname === `/${l}`,
      ) as SupportedLocale) ?? DEFAULT_LOCALE)
    : DEFAULT_LOCALE;

  const text = translations[currentLocale];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        redirect: false,
        identifier,
        password,
      });

      if (res?.error) {
        setError(
          currentLocale === "vi"
            ? "Tên đăng nhập hoặc mật khẩu không chính xác."
            : "Invalid username or password.",
        );
      } else {
        router.push(`/${currentLocale}/customer/dashboard`);
      }
    } catch (err) {
      console.error(err);
      setError(
        currentLocale === "vi"
          ? "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau."
          : "An unexpected error occurred. Please try again later.",
      );
    } finally {
      setLoading(false);
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
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Email or Username */}
        <div className="flex flex-col gap-1.5">
          <Label
            htmlFor="login-identifier"
            className="text-xs font-bold text-slate-600 dark:text-slate-300"
          >
            {text.emailUsername}
          </Label>
          <Input
            id="login-identifier"
            type="text"
            required
            autoComplete="username"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder={text.emailUsernamePlaceholder}
            className="w-full bg-background/50 dark:bg-slate-900/30"
          />
        </div>

        {/* Password */}
        <div className="flex flex-col gap-1.5">
          <Label
            htmlFor="login-password"
            className="text-xs font-bold text-slate-600 dark:text-slate-300"
          >
            {text.password}
          </Label>
          <div className="relative">
            <Input
              id="login-password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
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

        {/* Forgot password */}
        <div className="flex justify-end -mt-1.5">
          <NextLink
            href={`/${currentLocale}/auth/forgot-password`}
            className="text-xs font-bold text-cyan-500 hover:text-cyan-600 transition-colors"
          >
            {text.forgotPassword}
          </NextLink>
        </div>

        {/* Submit button */}
        <Button type="submit" disabled={loading} className="w-full mt-2" size="lg">
          {loading && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
          )}
          {loading ? text.signInLoading : text.signIn}
        </Button>
      </form>

      {/* Footer Info */}
      <p className="text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
        {text.dontHaveAccount}{" "}
        <NextLink
          href={`/${currentLocale}/auth/register`}
          className="font-bold text-cyan-500 hover:underline transition-colors"
        >
          {text.signUp}
        </NextLink>
      </p>
    </AuthCard>
  );
}
