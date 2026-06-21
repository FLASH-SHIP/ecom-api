"use client";

import { CheckCircle, Lock } from "lucide-react";
import NextLink from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { trpc } from "../../../lib/trpc";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [validationError, setValidationError] = useState("");

  const resetMutation = trpc.customer.auth.resetPassword.useMutation();

  if (!token) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-destructive">Token không hợp lệ hoặc đã hết hạn.</p>
        <NextLink
          href="/auth/forgot-password"
          className="mt-4 inline-block text-primary hover:underline"
        >
          Yêu cầu link mới
        </NextLink>
      </div>
    );
  }

  if (resetMutation.isSuccess) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="rounded-2xl border border-border p-8">
          <CheckCircle className="mx-auto mb-4 h-12 w-12 text-emerald-500" />
          <h1 className="mb-2 text-xl font-bold">Đặt lại mật khẩu thành công</h1>
          <p className="mb-6 text-sm text-muted-foreground">
            Bạn có thể đăng nhập bằng mật khẩu mới.
          </p>
          <NextLink
            href="/auth/login"
            className="inline-block rounded-lg bg-primary px-6 py-2.5 font-semibold text-primary-foreground"
          >
            Đăng nhập
          </NextLink>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <div className="rounded-2xl border border-border p-8">
        <div className="mb-8 text-center">
          <Lock className="mx-auto mb-4 h-12 w-12 text-primary" />
          <h1 className="mb-1 text-2xl font-extrabold">Đặt lại mật khẩu</h1>
          <p className="text-sm text-muted-foreground">Nhập mật khẩu mới cho tài khoản</p>
        </div>

        {(validationError || resetMutation.error) && (
          <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {validationError || resetMutation.error?.message}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setValidationError("");
            if (password.length < 8) {
              setValidationError("Mật khẩu phải có ít nhất 8 ký tự");
              return;
            }
            if (password !== confirmPassword) {
              setValidationError("Mật khẩu xác nhận không khớp");
              return;
            }
            resetMutation.mutate({ token, password });
          }}
          className="flex flex-col gap-5"
        >
          <div>
            <label htmlFor="reset-password" className="mb-1.5 block text-sm font-medium">
              Mật khẩu mới
            </label>
            <input
              id="reset-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tối thiểu 8 ký tự"
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label htmlFor="reset-confirm" className="mb-1.5 block text-sm font-medium">
              Xác nhận mật khẩu
            </label>
            <input
              id="reset-confirm"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu"
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <button
            type="submit"
            disabled={resetMutation.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground disabled:opacity-60"
          >
            {resetMutation.isPending ? "Đang xử lý..." : "Đặt lại mật khẩu"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={<div className="py-16 text-center text-sm text-muted-foreground">Loading...</div>}
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
