"use client";

import { Button } from "@ecom/ui/components/button";
import { Input } from "@ecom/ui/components/input";
import { Label } from "@ecom/ui/components/label";
import { Lock } from "lucide-react";
import NextLink from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { AuthCard } from "../../../components/auth/AuthCard";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type SupportedLocale } from "../../../lib/i18n";
import { trpc } from "../../../lib/trpc";

const translations = {
  vi: {
    title: "Đặt lại mật khẩu",
    desc: "Chúng tôi sẽ gửi liên kết đặt lại mật khẩu đến email đã đăng ký của bạn.",
    emailLabel: "Email",
    emailPlaceholder: "Nhập email của bạn",
    buttonLabel: "Đặt lại mật khẩu",
    buttonLoading: "Đang gửi...",
    backToLogin: "Quay lại đăng nhập",
    checkEmailTitle: "Kiểm tra email",
    checkEmailDesc:
      "Nếu email của bạn tồn tại trong hệ thống, chúng tôi đã gửi link đặt lại mật khẩu.",
  },
  en: {
    title: "Reset your password",
    desc: "We will send the OTP link to your email registered with us.",
    emailLabel: "Email",
    emailPlaceholder: "Enter your email",
    buttonLabel: "Reset password",
    buttonLoading: "Sending...",
    backToLogin: "Back to sign in",
    checkEmailTitle: "Check your email",
    checkEmailDesc: "If your email exists in the system, we have sent a reset password link.",
  },
};

export default function ForgotPasswordPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // Detect current locale from path
  const currentLocale: SupportedLocale = pathname
    ? ((SUPPORTED_LOCALES.find(
        (l) => pathname.startsWith(`/${l}/`) || pathname === `/${l}`,
      ) as SupportedLocale) ?? DEFAULT_LOCALE)
    : DEFAULT_LOCALE;

  const text = translations[currentLocale];

  const forgotMutation = trpc.customer.auth.forgotPassword.useMutation({
    onSuccess: () => setSubmitted(true),
  });

  const handleClose = () => router.push(`/${currentLocale}/auth/login`);

  if (submitted) {
    return (
      <AuthCard icon={<Lock className="w-4.5 h-4.5" />} onClose={handleClose} showSupport>
        <div className="text-center flex flex-col items-center gap-3 select-none">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            {text.checkEmailTitle}
          </h1>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 max-w-[280px] leading-relaxed">
            {text.checkEmailDesc}
          </p>
        </div>

        <NextLink
          href={`/${currentLocale}/auth/login`}
          className="flex w-full items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 h-11 text-sm font-semibold shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 text-center mt-3"
        >
          {text.backToLogin}
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
      {forgotMutation.error && (
        <div className="rounded-xl border border-rose-100 dark:border-rose-950/50 bg-rose-50 dark:bg-rose-950/20 px-4 py-3 text-xs font-semibold text-rose-600 dark:text-rose-400">
          {forgotMutation.error.message}
        </div>
      )}

      {/* Email form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          forgotMutation.mutate({ email });
        }}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1.5">
          <Label
            htmlFor="forgot-email"
            className="text-xs font-bold text-slate-600 dark:text-slate-300"
          >
            {text.emailLabel}
          </Label>
          <Input
            id="forgot-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={text.emailPlaceholder}
            className="w-full bg-background/50 dark:bg-slate-900/30"
          />
        </div>

        <Button type="submit" disabled={forgotMutation.isPending} className="w-full mt-2" size="lg">
          {forgotMutation.isPending && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
          )}
          {forgotMutation.isPending ? text.buttonLoading : text.buttonLabel}
        </Button>
      </form>
    </AuthCard>
  );
}
