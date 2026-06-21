"use client";

import { AtSign, FileText, LayoutDashboard, Mail, User } from "lucide-react";
import NextLink from "next/link";
import { useState } from "react";
import { getAccessToken } from "../../../lib/auth";
import { trpc } from "../../../lib/trpc";

const QUICK_LINKS = [
  {
    href: "/customer/profile",
    icon: User,
    title: "Hồ sơ cá nhân",
    desc: "Cập nhật thông tin của bạn",
    color: "text-primary",
  },
  {
    href: "/blog",
    icon: FileText,
    title: "Blog",
    desc: "Đọc bài viết mới nhất",
    color: "text-violet-600",
  },
];

export default function CustomerDashboardPage() {
  const [token] = useState<string | null>(() => getAccessToken());

  const { data: profile, isLoading } = trpc.customer.auth.me.useQuery(
    { accessToken: token ?? "" },
    { enabled: !!token },
  );

  if (!token) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="mx-auto max-w-md rounded-lg border border-blue-200 bg-blue-50 px-6 py-4 text-sm text-blue-800">
          Vui lòng{" "}
          <NextLink href="/auth/login" className="font-semibold underline">
            đăng nhập
          </NextLink>{" "}
          để xem trang này.
        </div>
      </div>
    );
  }

  if (isLoading || token === null) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <div className="mb-2 h-12 w-[280px] animate-pulse rounded bg-muted" />
        <div className="mb-8 h-5 w-[200px] animate-pulse rounded bg-muted" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-[100px] animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <LayoutDashboard className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
        <h2 className="mb-2 text-xl font-bold">Chưa đăng nhập</h2>
        <p className="mb-6 text-sm text-muted-foreground">Vui lòng đăng nhập để xem trang này.</p>
        <NextLink
          href="/auth/login"
          className="inline-block rounded-lg bg-primary px-6 py-2.5 font-semibold text-primary-foreground"
        >
          Đăng nhập
        </NextLink>
      </div>
    );
  }

  const displayName = profile.name ?? profile.email ?? "Khách hàng";

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:py-16">
      {/* Welcome */}
      <div className="mb-10 flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#2563EB] to-[#7C3AED] text-2xl font-bold text-white">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-extrabold">Xin chào, {displayName}!</h1>
          <p className="text-sm text-muted-foreground">
            <AtSign className="mr-1 inline h-3.5 w-3.5" />
            {profile.username}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border p-4">
          <div className="mb-1 flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Email</span>
          </div>
          <p className="break-all font-semibold">{profile.email}</p>
          {profile.emailVerified ? (
            <span className="mt-1 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
              Đã xác minh
            </span>
          ) : (
            <span className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
              Chưa xác minh
            </span>
          )}
        </div>

        <div className="rounded-xl border border-border p-4">
          <p className="mb-1 text-sm text-muted-foreground">Trạng thái</p>
          <span
            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              profile.status === "ACTIVE"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {profile.status === "ACTIVE" ? "Hoạt động" : profile.status}
          </span>
        </div>

        <div className="rounded-xl border border-border p-4">
          <p className="mb-1 text-sm text-muted-foreground">Ngày tham gia</p>
          <p className="font-semibold">
            {new Date(profile.createdAt).toLocaleDateString("vi-VN", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      <hr className="mb-8 border-border" />

      {/* Quick Links */}
      <h2 className="mb-4 text-lg font-bold">Truy cập nhanh</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {QUICK_LINKS.map((link) => {
          const Icon = link.icon;
          return (
            <NextLink
              key={link.href}
              href={link.href}
              className="group flex items-center gap-4 rounded-xl border border-border p-5 transition-colors hover:bg-muted/50"
            >
              <Icon className={`h-8 w-8 ${link.color}`} />
              <div>
                <p className="font-bold group-hover:text-primary">{link.title}</p>
                <p className="text-sm text-muted-foreground">{link.desc}</p>
              </div>
            </NextLink>
          );
        })}
      </div>
    </div>
  );
}
