"use client";

import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "@customer/lib/i18n";
import { translate } from "@ecom/i18n";
import { Button } from "@ecom/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@ecom/ui/components/dialog";
import { Input } from "@ecom/ui/components/input";
import { Label } from "@ecom/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ecom/ui/components/select";
import { AtSign, FileText, LayoutDashboard, Mail, User } from "lucide-react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
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
  const pathname = usePathname();
  const { status } = useSession();

  const currentLocale =
    SUPPORTED_LOCALES.find((l) => pathname.startsWith(`/${l}/`) || pathname === `/${l}`) ??
    DEFAULT_LOCALE;

  const getLocalizedHref = (href: string) => {
    return `/${currentLocale}${href === "/" ? "" : href}`;
  };

  const {
    data: profile,
    isLoading: isLoadingProfile,
    refetch,
  } = trpc.customer.auth.me.useQuery(undefined, {
    enabled: status === "authenticated",
  });

  const isLoading = status === "loading" || isLoadingProfile;

  // Enforce profile modal states
  const [showModal, setShowModal] = useState(false);
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      const hasMissingInfo = !profile.name || !profile.phone;
      setShowModal(hasMissingInfo);

      // Pre-fill form values
      setUsername(profile.username ?? "");
      setName(profile.name ?? "");
      setPhone(profile.phone ?? "");
      setDob(profile.dob ? (new Date(profile.dob).toISOString().split("T")[0] ?? "") : "");
      setGender(profile.gender ?? "");
    }
  }, [profile]);

  const updateProfileMutation = trpc.customer.auth.updateProfile.useMutation({
    onSuccess: () => {
      setFormError(null);
      refetch();
    },
    onError: (err) => {
      setFormError(err.message);
    },
  });

  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError(translate("profileModal.nameRequired", currentLocale));
      return;
    }
    if (!phone.trim()) {
      setFormError(translate("profileModal.phoneRequired", currentLocale));
      return;
    }

    const usernameToSend =
      username !== profile?.username && username.trim() !== "" ? username : undefined;

    updateProfileMutation.mutate({
      username: usernameToSend,
      name: name.trim(),
      phone: phone.trim(),
      dob: dob || null,
      gender: (gender as "male" | "female" | "other") || null,
    });
  };

  if (status === "unauthenticated") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="mx-auto max-w-md rounded-lg border border-blue-200 bg-blue-50 px-6 py-4 text-sm text-blue-800">
          {translate("customerDashboard.pleaseLogin", currentLocale)}
          <div className="mt-2">
            <NextLink href={getLocalizedHref("/auth/login")} className="font-semibold underline">
              {translate("customerDashboard.login", currentLocale)}
            </NextLink>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
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
        <h2 className="mb-2 text-xl font-bold">
          {translate("customerDashboard.notLoggedIn", currentLocale)}
        </h2>
        <p className="mb-6 text-sm text-muted-foreground">
          {translate("customerDashboard.pleaseLogin", currentLocale)}
        </p>
        <NextLink
          href={getLocalizedHref("/auth/login")}
          className="inline-block rounded-lg bg-primary px-6 py-2.5 font-semibold text-primary-foreground"
        >
          {translate("customerDashboard.login", currentLocale)}
        </NextLink>
      </div>
    );
  }

  const displayName =
    profile.name ?? profile.email ?? translate("customerDashboard.customerFallback", currentLocale);
  const canChangeUsername = (profile.usernameChangeCount ?? 0) < 1;

  const welcomeMessage = translate("customerDashboard.welcome", currentLocale).replace(
    "{name}",
    displayName,
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:py-16">
      {/* Welcome */}
      <div className="mb-10 flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#2563EB] to-[#7C3AED] text-2xl font-bold text-white">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-extrabold">{welcomeMessage}</h1>
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
              {translate("customerDashboard.verified", currentLocale)}
            </span>
          ) : (
            <span className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
              {translate("customerDashboard.unverified", currentLocale)}
            </span>
          )}
        </div>

        <div className="rounded-xl border border-border p-4">
          <p className="mb-1 text-sm text-muted-foreground">
            {translate("customerDashboard.status", currentLocale)}
          </p>
          <span
            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              profile.status === "ACTIVE"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {profile.status === "ACTIVE"
              ? translate("customerDashboard.statusActive", currentLocale)
              : profile.status}
          </span>
        </div>

        <div className="rounded-xl border border-border p-4">
          <p className="mb-1 text-sm text-muted-foreground">
            {translate("customerDashboard.joinedDate", currentLocale)}
          </p>
          <p className="font-semibold">
            {new Date(profile.createdAt).toLocaleDateString(
              currentLocale === "vi" ? "vi-VN" : "en-US",
              {
                year: "numeric",
                month: "long",
                day: "numeric",
              },
            )}
          </p>
        </div>
      </div>

      <hr className="mb-8 border-border" />

      {/* Quick Links */}
      <h2 className="mb-4 text-lg font-bold">
        {translate("customerDashboard.quickLinks", currentLocale)}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {QUICK_LINKS.map((link) => {
          const Icon = link.icon;
          return (
            <NextLink
              key={link.href}
              href={getLocalizedHref(link.href)}
              className="group flex items-center gap-4 rounded-xl border border-border p-5 transition-colors hover:bg-muted/50"
            >
              <Icon className={`h-8 w-8 ${link.color}`} />
              <div>
                <p className="font-bold group-hover:text-primary">
                  {link.href === "/customer/profile"
                    ? translate("customerDashboard.profileTitle", currentLocale)
                    : translate("customerDashboard.blogTitle", currentLocale)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {link.href === "/customer/profile"
                    ? translate("customerDashboard.profileDesc", currentLocale)
                    : translate("customerDashboard.blogDesc", currentLocale)}
                </p>
              </div>
            </NextLink>
          );
        })}
      </div>

      {/* Profile completion modal dialog */}
      <Dialog open={showModal}>
        <DialogContent
          className="[&>button]:hidden max-w-md w-[95%] rounded-3xl p-6 md:p-8"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl font-bold text-slate-900 dark:text-white leading-none">
              {translate("profileModal.title", currentLocale)}
            </DialogTitle>
            <DialogDescription className="text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400 mt-2">
              {translate("profileModal.desc", currentLocale)}
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="rounded-xl border border-rose-100 dark:border-rose-950/50 bg-rose-50 dark:bg-rose-950/20 px-4 py-3 text-xs font-semibold text-rose-600 dark:text-rose-400">
              {formError}
            </div>
          )}

          <form onSubmit={handleModalSubmit} className="flex flex-col gap-4 mt-2">
            {/* Username */}
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="modal-username"
                className="text-xs font-bold text-slate-600 dark:text-slate-300"
              >
                {translate("profileModal.usernameLabel", currentLocale)}
              </Label>
              <Input
                id="modal-username"
                type="text"
                disabled={!canChangeUsername}
                value={username}
                onChange={(e) =>
                  setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ""))
                }
                placeholder={translate("profileModal.usernamePlaceholder", currentLocale)}
                className="w-full bg-background/50 dark:bg-slate-900/30"
              />
            </div>

            {/* Họ và tên */}
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="modal-name"
                className="text-xs font-bold text-slate-600 dark:text-slate-300"
              >
                {translate("profileModal.nameLabel", currentLocale)} *
              </Label>
              <Input
                id="modal-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={translate("profileModal.namePlaceholder", currentLocale)}
                className="w-full bg-background/50 dark:bg-slate-900/30"
              />
            </div>

            {/* Số điện thoại */}
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="modal-phone"
                className="text-xs font-bold text-slate-600 dark:text-slate-300"
              >
                {translate("profileModal.phoneLabel", currentLocale)} *
              </Label>
              <Input
                id="modal-phone"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={translate("profileModal.phonePlaceholder", currentLocale)}
                className="w-full bg-background/50 dark:bg-slate-900/30"
              />
            </div>

            {/* DOB & Gender (Optional) */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="modal-dob"
                  className="text-xs font-bold text-slate-600 dark:text-slate-300"
                >
                  {translate("profileModal.dobLabel", currentLocale)}
                </Label>
                <Input
                  id="modal-dob"
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full bg-background/50 dark:bg-slate-900/30"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="modal-gender"
                  className="text-xs font-bold text-slate-600 dark:text-slate-300"
                >
                  {translate("profileModal.genderLabel", currentLocale)}
                </Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger className="w-full bg-background/50 dark:bg-slate-900/30 border-input">
                    <SelectValue
                      placeholder={translate("profileModal.genderPlaceholder", currentLocale)}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">
                      {translate("customerProfile.genderMale", currentLocale)}
                    </SelectItem>
                    <SelectItem value="female">
                      {translate("customerProfile.genderFemale", currentLocale)}
                    </SelectItem>
                    <SelectItem value="other">
                      {translate("customerProfile.genderOther", currentLocale)}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={updateProfileMutation.isPending || !name.trim() || !phone.trim()}
              className="w-full mt-4"
              size="lg"
            >
              {updateProfileMutation.isPending && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
              )}
              {updateProfileMutation.isPending
                ? translate("profileModal.submitting", currentLocale)
                : translate("profileModal.submit", currentLocale)}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
