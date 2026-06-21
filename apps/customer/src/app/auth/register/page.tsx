"use client";

import { Eye, EyeOff, UserPlus } from "lucide-react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { setTokens } from "../../../lib/auth";
import { trpc } from "../../../lib/trpc";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [validationError, setValidationError] = useState("");

  const registerMutation = trpc.customer.auth.register.useMutation({
    onSuccess: (data) => {
      setTokens(data.accessToken, data.refreshToken);
      router.push("/customer/dashboard");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError("");

    if (password !== confirmPassword) {
      setValidationError("Mật khẩu xác nhận không khớp");
      return;
    }
    if (password.length < 8) {
      setValidationError("Mật khẩu phải có ít nhất 8 ký tự");
      return;
    }

    if (username && !/^[a-z0-9_.]{3,30}$/.test(username)) {
      setValidationError("Username chỉ gồm chữ thường, số, dấu chấm và gạch dưới (3-30 ký tự)");
      return;
    }

    registerMutation.mutate({
      email,
      password,
      username: username || undefined,
      name: name || undefined,
    });
  }

  const error = validationError || registerMutation.error?.message;

  return (
    <div className="mx-auto max-w-lg px-4 py-12 md:py-20">
      <div className="rounded-2xl border border-border p-8 md:p-12">
        {/* Icon + Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#2563EB] to-[#7C3AED]">
            <UserPlus className="h-6 w-6 text-white" />
          </div>
          <h1 className="mb-1 text-2xl font-extrabold">Đăng ký</h1>
          <p className="text-sm text-muted-foreground">Tạo tài khoản để bắt đầu trải nghiệm</p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Full Name */}
          <div>
            <label htmlFor="register-name" className="mb-1.5 block text-sm font-medium">
              Họ và tên
            </label>
            <input
              id="register-name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nguyễn Văn An"
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label htmlFor="register-username" className="mb-1.5 block text-sm font-medium">
              Username <span className="text-muted-foreground">(tùy chọn)</span>
            </label>
            <input
              id="register-username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="Để trống sẽ tự tạo từ email"
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Chữ thường, số, dấu chấm và gạch dưới (3-30 ký tự)
            </p>
          </div>

          <div>
            <label htmlFor="register-email" className="mb-1.5 block text-sm font-medium">
              Email
            </label>
            <input
              id="register-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label htmlFor="register-password" className="mb-1.5 block text-sm font-medium">
              Mật khẩu
            </label>
            <div className="relative">
              <input
                id="register-password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tối thiểu 8 ký tự"
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 pr-10 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                aria-label="toggle password visibility"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Mật khẩu phải có ít nhất 8 ký tự</p>
          </div>

          <div>
            <label htmlFor="register-confirm-password" className="mb-1.5 block text-sm font-medium">
              Xác nhận mật khẩu
            </label>
            <div className="relative">
              <input
                id="register-confirm-password"
                type={showConfirm ? "text" : "password"}
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu"
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 pr-10 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                aria-label="toggle confirm password visibility"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={registerMutation.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#2563EB] to-[#7C3AED] px-6 py-3 font-semibold text-white transition-transform hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60 disabled:hover:translate-y-0"
          >
            {registerMutation.isPending && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            )}
            {registerMutation.isPending ? "Đang đăng ký..." : "Tạo tài khoản"}
          </button>
        </form>

        <hr className="my-6 border-border" />

        <p className="text-center text-sm text-muted-foreground">
          Đã có tài khoản?{" "}
          <NextLink href="/auth/login" className="font-semibold text-primary hover:underline">
            Đăng nhập
          </NextLink>
        </p>
      </div>
    </div>
  );
}
