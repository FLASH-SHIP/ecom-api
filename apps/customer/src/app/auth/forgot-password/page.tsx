"use client";

import { Mail } from "lucide-react";
import NextLink from "next/link";
import { useState } from "react";
import { trpc } from "../../../lib/trpc";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const forgotMutation = trpc.customer.auth.forgotPassword.useMutation({
    onSuccess: () => setSubmitted(true),
  });

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="rounded-2xl border border-border p-8">
          <Mail className="mx-auto mb-4 h-12 w-12 text-primary" />
          <h1 className="mb-2 text-xl font-bold">Kiểm tra email</h1>
          <p className="mb-6 text-sm text-muted-foreground">
            Nếu email của bạn tồn tại trong hệ thống, chúng tôi đã gửi link đặt lại mật khẩu.
          </p>
          <NextLink href="/auth/login" className="text-sm text-primary hover:underline">
            ← Quay lại đăng nhập
          </NextLink>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <div className="rounded-2xl border border-border p-8">
        <div className="mb-8 text-center">
          <Mail className="mx-auto mb-4 h-12 w-12 text-primary" />
          <h1 className="mb-1 text-2xl font-extrabold">Quên mật khẩu</h1>
          <p className="text-sm text-muted-foreground">Nhập email để nhận link đặt lại mật khẩu</p>
        </div>

        {forgotMutation.error && (
          <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {forgotMutation.error.message}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            forgotMutation.mutate({ email });
          }}
          className="flex flex-col gap-5"
        >
          <div>
            <label htmlFor="forgot-email" className="mb-1.5 block text-sm font-medium">
              Email
            </label>
            <input
              id="forgot-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <button
            type="submit"
            disabled={forgotMutation.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-60"
          >
            {forgotMutation.isPending ? "Đang gửi..." : "Gửi link đặt lại"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <NextLink href="/auth/login" className="text-primary hover:underline">
            ← Quay lại đăng nhập
          </NextLink>
        </p>
      </div>
    </div>
  );
}
