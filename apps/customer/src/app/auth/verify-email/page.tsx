"use client";

import { CheckCircle, Loader2, XCircle } from "lucide-react";
import NextLink from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { trpc } from "../../../lib/trpc";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const verifyMutation = trpc.customer.auth.verifyEmail.useMutation();

  if (!token) {
    return (
      <div className="text-center">
        <XCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
        <h1 className="mb-2 text-xl font-bold">Token không hợp lệ</h1>
        <p className="text-sm text-muted-foreground">
          Vui lòng kiểm tra lại link xác minh trong email.
        </p>
      </div>
    );
  }

  if (verifyMutation.isIdle) {
    verifyMutation.mutate({ token });
  }

  if (verifyMutation.isPending) {
    return (
      <div className="text-center">
        <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-primary" />
        <h1 className="text-xl font-bold">Đang xác minh email...</h1>
      </div>
    );
  }

  if (verifyMutation.isError) {
    return (
      <div className="text-center">
        <XCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
        <h1 className="mb-2 text-xl font-bold">Xác minh thất bại</h1>
        <p className="mb-6 text-sm text-muted-foreground">{verifyMutation.error.message}</p>
        <NextLink href="/auth/login" className="text-primary hover:underline">
          Quay lại đăng nhập
        </NextLink>
      </div>
    );
  }

  return (
    <div className="text-center">
      <CheckCircle className="mx-auto mb-4 h-12 w-12 text-emerald-500" />
      <h1 className="mb-2 text-xl font-bold">Email đã được xác minh!</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Tài khoản của bạn đã được xác minh thành công.
      </p>
      <NextLink
        href="/customer/dashboard"
        className="inline-block rounded-lg bg-primary px-6 py-2.5 font-semibold text-primary-foreground"
      >
        Đi đến Dashboard
      </NextLink>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <div className="rounded-2xl border border-border p-8">
        <Suspense
          fallback={
            <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>
          }
        >
          <VerifyEmailContent />
        </Suspense>
      </div>
    </div>
  );
}
