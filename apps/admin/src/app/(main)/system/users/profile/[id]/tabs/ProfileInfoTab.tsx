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

/** Split "Nguyễn Văn An" → { firstName: "Nguyễn Văn", lastName: "An" } */
function splitName(name: string | null): { firstName: string; lastName: string } {
  if (!name) return { firstName: "", lastName: "" };
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: "", lastName: parts[0] };
  const lastName = parts[parts.length - 1];
  const firstName = parts.slice(0, -1).join(" ");
  return { firstName, lastName };
}

export function ProfileInfoTab({ userId, targetUser }: ProfileInfoTabProps) {
  const t = useTranslations("users.profile");
  const tc = useTranslations("users");
  const utils = trpc.useUtils();

  const split = splitName(targetUser.name ?? null);
  const [firstName, setFirstName] = useState(split.firstName);
  const [lastName, setLastName] = useState(split.lastName);
  const [username, setUsername] = useState(targetUser.username ?? "");
  const [phone, setPhone] = useState(targetUser.phone ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Sync form fields when targetUser refetches (e.g. after save + cache invalidation)
  useEffect(() => {
    const s = splitName(targetUser.name ?? null);
    setFirstName(s.firstName);
    setLastName(s.lastName);
  }, [targetUser.name]);

  useEffect(() => {
    setUsername(targetUser.username ?? "");
  }, [targetUser.username]);
  useEffect(() => {
    setPhone(targetUser.phone ?? "");
  }, [targetUser.phone]);

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
    if (!lastName.trim()) {
      setError(t("nameRequired"));
      return;
    }
    const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
    updateProfile.mutate({
      userId,
      name: fullName,
      username: username.trim() || undefined,
      phone: phone.trim() || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <h3 className="mb-6 text-lg font-semibold">{t("tabInfo")}</h3>

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
        {/* Họ */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="profile-first-name">{t("firstName")}</Label>
          <Input
            id="profile-first-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </div>

        {/* Tên (required) */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="profile-last-name">{t("lastName")}</Label>
          <Input
            id="profile-last-name"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className={cn(!lastName.trim() && error && "border-destructive")}
          />
        </div>

        {/* Tên đăng nhập */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="profile-username">{tc("fields.username")}</Label>
          <Input
            id="profile-username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            minLength={3}
            maxLength={50}
          />
        </div>

        {/* Email (readonly) */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="profile-email">{tc("fields.email")}</Label>
          <Input id="profile-email" value={targetUser.email ?? ""} disabled />
          <p className="text-xs text-muted-foreground">{t("emailReadonly")}</p>
        </div>

        {/* Điện thoại */}
        <div className="flex flex-col gap-1.5">
          <PhoneInput
            id="profile-phone"
            value={phone}
            onChange={setPhone}
            label={tc("fields.phone")}
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
