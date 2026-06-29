"use client";

import { PhoneInput } from "@admin/components/ui/PhoneInput";
import { trpc } from "@admin/lib/trpc";
import { Button } from "@ecom/ui/components/button";
import { Input } from "@ecom/ui/components/input";
import { Label } from "@ecom/ui/components/label";
import { cn } from "@ecom/ui/lib/utils";
import { AlertCircle, CheckCircle2, Loader2, Save, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

interface TargetUser {
  id?: number;
  email?: string;
  name?: string | null;
  phone?: string | null;
  username?: string | null;
  locale?: string | null;
  avatarUrl?: string | null;
}

interface ProfileInfoTabProps {
  userId: number;
  targetUser: TargetUser;
}

export function ProfileInfoTab({ userId, targetUser }: ProfileInfoTabProps) {
  const t = useTranslations("users.profile");
  const tc = useTranslations("users");
  const utils = trpc.useUtils();

  const [name, setName] = useState(targetUser.name ?? "");
  const [username, setUsername] = useState(targetUser.username ?? "");
  const [phone, setPhone] = useState(targetUser.phone ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Sync form fields when targetUser refetches (e.g. after save + cache invalidation)
  useEffect(() => {
    setName(targetUser.name ?? "");
  }, [targetUser.name]);

  useEffect(() => {
    setUsername(targetUser.username ?? "");
  }, [targetUser.username]);
  useEffect(() => {
    setPhone(targetUser.phone ?? "");
  }, [targetUser.phone]);

  // Auto-hide success alert
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const updateProfile = trpc.viewer.auth.updateProfile.useMutation({
    onSuccess: () => {
      setSuccess(true);
      setError(null);
      void utils.viewer.auth.me.invalidate();
      void utils.viewer.auth.getUserProfile.invalidate({ userId });
    },
    onError: (err) => {
      setError(err.message);
      setSuccess(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(tc("validation.nameRequired") || "Please enter your name");
      return;
    }
    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setError(tc("validation.usernameRequired") || "Please enter username");
      return;
    }
    if (cleanUsername.length < 3) {
      setError(tc("validation.usernameMin") || "Username must be at least 3 characters");
      return;
    }
    if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUsername)) {
      setError(tc("validation.usernameInvalid") || "Username format is invalid");
      return;
    }

    updateProfile.mutate({
      userId,
      name: name.trim(),
      username: cleanUsername,
      phone: phone.trim() || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      {error && (
        <div className="mb-4 flex items-center justify-between rounded-md border border-destructive/30 bg-red-50 px-4 py-3 text-sm text-destructive dark:bg-red-950">
          <span className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            {error}
          </span>
          <button type="button" onClick={() => setError(null)}>
            <X className="size-4" />
          </button>
        </div>
      )}
      {success && (
        <div className="mb-4 flex items-center justify-between rounded-md border border-emerald-500/30 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0" />
            {t("updateSuccess")}
          </span>
          <button type="button" onClick={() => setSuccess(false)}>
            <X className="size-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Họ tên */}
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="profile-name">
            {t("fullName")} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="profile-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={updateProfile.isPending}
            className={cn(!name.trim() && error && "border-destructive")}
            placeholder={t("fullNamePlaceholder")}
          />
        </div>

        {/* Tên đăng nhập */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="profile-username">
            {tc("fields.username")} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="profile-username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={updateProfile.isPending}
            minLength={3}
            maxLength={50}
            placeholder={t("usernamePlaceholder")}
          />
        </div>

        {/* Email (readonly) */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="profile-email">{tc("fields.email")}</Label>
          <Input
            id="profile-email"
            value={targetUser.email ?? ""}
            disabled
            placeholder={t("emailPlaceholder")}
          />
          <p className="text-xs text-muted-foreground">{t("emailReadonly")}</p>
        </div>

        {/* Điện thoại */}
        <div className="flex flex-col gap-1.5">
          <PhoneInput
            id="profile-phone"
            value={phone}
            onChange={setPhone}
            disabled={updateProfile.isPending}
            label={tc("fields.phone")}
            placeholder={t("phonePlaceholder")}
          />
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <Button type="submit" disabled={updateProfile.isPending} id="profile-save-btn">
          {updateProfile.isPending ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Save className="mr-2 size-4" />
          )}
          {tc("actions.save")}
        </Button>
      </div>
    </form>
  );
}
