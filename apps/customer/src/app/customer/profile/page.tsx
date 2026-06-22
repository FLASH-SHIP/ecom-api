"use client";

import { getAccessToken } from "@customer/lib/auth";
import { trpc } from "@customer/lib/trpc";
import { AlertCircle, AtSign, CheckCircle } from "lucide-react";
import NextLink from "next/link";
import { useEffect, useState } from "react";

export default function CustomerProfilePage() {
  const [token] = useState<string | null>(() => getAccessToken());

  const { data: profile, isLoading } = trpc.customer.auth.me.useQuery(
    { accessToken: token ?? "" },
    { enabled: !!token },
  );
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [description, setDescription] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setUsername(profile.username ?? "");
      setName(profile.name ?? "");
      setPhone(profile.phone ?? "");
      setDob(profile.dob ? (new Date(profile.dob).toISOString().split("T")[0] ?? "") : "");
      setGender(profile.gender ?? "");
      setDescription(profile.description ?? "");
    }
  }, [profile]);

  const updateMutation = trpc.customer.auth.updateProfile.useMutation({
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <p className="text-center text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <h1 className="text-2xl font-bold">Chưa đăng nhập</h1>
        <NextLink href="/auth/login" className="mt-4 inline-block text-primary hover:underline">
          Đăng nhập
        </NextLink>
      </div>
    );
  }

  const canChangeUsername = (profile.usernameChangeCount ?? 0) < 1;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Hồ sơ cá nhân</h1>
        <NextLink href="/customer/dashboard" className="text-sm text-primary hover:underline">
          ← Dashboard
        </NextLink>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          updateMutation.mutate({
            accessToken: token ?? "",
            username: username !== profile.username ? username : undefined,
            name: name || undefined,
            phone: phone || undefined,
            dob: dob || null,
            gender: (gender as "male" | "female" | "other") || null,
            description: description || null,
          });
        }}
        className="space-y-6 rounded-xl border border-border bg-card p-6"
      >
        {/* Email (read-only) */}
        <div>
          <label htmlFor="profile-email" className="mb-1 block text-sm font-medium">
            Email
          </label>
          <input
            id="profile-email"
            type="email"
            disabled
            value={profile.email}
            className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground"
          />
          <p className="mt-1 text-xs text-muted-foreground">Email không thể thay đổi</p>
        </div>

        {/* Username */}
        <div>
          <label
            htmlFor="profile-username"
            className="mb-1 flex items-center gap-2 text-sm font-medium"
          >
            <AtSign className="h-4 w-4" />
            Username
          </label>
          <input
            id="profile-username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            disabled={!canChangeUsername}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm disabled:bg-muted disabled:text-muted-foreground"
            placeholder="username"
          />
          {canChangeUsername ? (
            <p className="mt-1 flex items-center gap-1 text-xs text-amber-600">
              <AlertCircle className="h-3 w-3" />
              Bạn có thể đổi username 1 lần duy nhất
            </p>
          ) : (
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              Đã sử dụng quyền đổi username. Liên hệ admin để thay đổi.
            </p>
          )}
        </div>

        {/* Full Name */}
        <div>
          <label htmlFor="profile-name" className="mb-1 block text-sm font-medium">
            Họ và tên
          </label>
          <input
            id="profile-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            placeholder="Nguyễn Văn An"
          />
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="profile-phone" className="mb-1 block text-sm font-medium">
            Số điện thoại
          </label>
          <input
            id="profile-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            placeholder="0123 456 789"
          />
        </div>

        {/* DOB + Gender */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="profile-dob" className="mb-1 block text-sm font-medium">
              Ngày sinh
            </label>
            <input
              id="profile-dob"
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="profile-gender" className="mb-1 block text-sm font-medium">
              Giới tính
            </label>
            <select
              id="profile-gender"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">-- Chọn --</option>
              <option value="male">Nam</option>
              <option value="female">Nữ</option>
              <option value="other">Khác</option>
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="profile-description" className="mb-1 block text-sm font-medium">
            Giới thiệu bản thân
          </label>
          <textarea
            id="profile-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
            rows={3}
            className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm"
            placeholder="Viết vài dòng về bạn..."
          />
        </div>

        {updateMutation.error && (
          <p className="text-sm text-destructive">{updateMutation.error.message}</p>
        )}

        {saved && (
          <p className="flex items-center gap-1 text-sm font-medium text-emerald-600">
            <CheckCircle className="h-4 w-4" />
            Đã lưu thành công!
          </p>
        )}

        <button
          type="submit"
          disabled={updateMutation.isPending}
          className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
        >
          {updateMutation.isPending ? "Đang lưu..." : "Lưu thay đổi"}
        </button>
      </form>
    </div>
  );
}
