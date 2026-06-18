"use client";

import { trpc } from "@customer/lib/trpc";
import { useEffect, useState } from "react";

export default function MemberProfilePage() {
  // rerender-lazy-state-init: lazy initializer runs once on mount, avoids
  // the 2-cycle waterfall (render with null → effect → render with token → query)
  const [token] = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem("memberAccessToken") : null,
  );

  const { data: profile, isLoading } = trpc.member.auth.me.useQuery(
    { accessToken: token ?? "" },
    { enabled: !!token },
  );
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saved, setSaved] = useState(false);

  // rerender-derived-state-no-effect: sync form values when profile loads.
  // useEffect([profile]) is correct here — it runs after render, not during.
  useEffect(() => {
    if (profile) {
      setName(profile.name ?? "");
      setPhone(profile.phone ?? "");
    }
  }, [profile]);

  const updateMutation = trpc.member.auth.updateProfile.useMutation({
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <p className="text-center text-sm text-slate-500">Loading...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Chưa đăng nhập</h1>
        <a href="/auth/login" className="mt-4 inline-block text-blue-600 hover:underline">
          Đăng nhập
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Hồ sơ cá nhân</h1>
        <a href="/member/dashboard" className="text-sm text-blue-600 hover:underline">
          ← Dashboard
        </a>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          updateMutation.mutate({ accessToken: token ?? "", name, phone });
        }}
        className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
      >
        <div>
          <label
            htmlFor="email"
            className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            disabled
            value={profile.email}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800"
          />
          <p className="mt-1 text-xs text-slate-400">Email không thể thay đổi</p>
        </div>

        <div>
          <label
            htmlFor="name"
            className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Tên hiển thị
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            placeholder="Tên của bạn"
          />
        </div>

        <div>
          <label
            htmlFor="phone"
            className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Số điện thoại
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            placeholder="0123 456 789"
          />
        </div>

        {updateMutation.error && (
          <p className="text-sm text-red-600">{updateMutation.error.message}</p>
        )}

        {saved && (
          <p className="text-sm font-medium text-green-600 dark:text-green-400">
            ✓ Đã lưu thành công!
          </p>
        )}

        <button
          type="submit"
          disabled={updateMutation.isPending}
          className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          {updateMutation.isPending ? "Đang lưu..." : "Lưu thay đổi"}
        </button>
      </form>
    </div>
  );
}
