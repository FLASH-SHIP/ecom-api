"use client";

import { trpc } from "@admin/lib/trpc";
import { Button } from "@ecom/ui/components/button";
import { Input } from "@ecom/ui/components/input";
import { Label } from "@ecom/ui/components/label";
import { cn } from "@ecom/ui/lib/utils";
import { AlertCircle, CheckCircle2, Loader2, Save, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

interface ChangePasswordTabProps {
  userId: string;
  /** True when the logged-in viewer is viewing their own profile */
  isSelf: boolean;
  /** True when viewer has USERS_UPDATE permission */
  isAdmin: boolean;
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  required,
  error,
  placeholder,
  showPasswordLabel,
  hidePasswordLabel,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  error?: string;
  placeholder?: string;
  showPasswordLabel?: string;
  hidePasswordLabel?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <Input
        id={id}
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        showPasswordLabel={showPasswordLabel}
        hidePasswordLabel={hidePasswordLabel}
        disabled={disabled}
        className={cn(error && "border-destructive")}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function ChangePasswordTab({ userId, isSelf, isAdmin }: ChangePasswordTabProps) {
  const t = useTranslations("users.profile");
  const tc = useTranslations("users");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Auto-hide success alert
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const changePassword = trpc.viewer.auth.changePasswordSelf.useMutation({
    onSuccess: () => {
      setSuccess(true);
      setError(null);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setFieldErrors({});
    },
    onError: (err) => {
      setError(err.message);
      setSuccess(false);
    },
  });

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (isSelf && !currentPassword) errs.currentPassword = t("currentPasswordRequired");
    if (!newPassword) errs.newPassword = t("newPasswordRequired");
    else if (newPassword.length < 8) errs.newPassword = t("passwordMinLength");
    if (!confirmPassword) errs.confirmPassword = t("confirmPasswordRequired");
    else if (newPassword !== confirmPassword) errs.confirmPassword = t("passwordMismatch");
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    changePassword.mutate({
      userId,
      currentPassword: isSelf ? currentPassword : undefined,
      newPassword,
      confirmPassword,
    });
  };

  // Only self or admin with USERS_UPDATE can use this tab
  if (!isSelf && !isAdmin) {
    return (
      <div className="py-8 text-center">
        <p className="text-muted-foreground">{t("noPermission")}</p>
      </div>
    );
  }

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
            {t("passwordUpdateSuccess")}
          </span>
          <button type="button" onClick={() => setSuccess(false)}>
            <X className="size-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Current password — only shown when viewing own profile */}
        {isSelf && (
          <div className="sm:col-span-2">
            <PasswordField
              id="current-password"
              label={tc("currentPassword")}
              value={currentPassword}
              onChange={setCurrentPassword}
              required
              disabled={changePassword.isPending}
              placeholder="Nhập mật khẩu hiện tại"
              showPasswordLabel={t("showPassword")}
              hidePasswordLabel={t("hidePassword")}
              error={fieldErrors.currentPassword}
            />
          </div>
        )}

        {/* New password */}
        <PasswordField
          id="new-password"
          label={tc("newPassword")}
          value={newPassword}
          onChange={setNewPassword}
          required
          disabled={changePassword.isPending}
          placeholder="Nhập mật khẩu mới (tối thiểu 8 ký tự)"
          showPasswordLabel={t("showPassword")}
          hidePasswordLabel={t("hidePassword")}
          error={fieldErrors.newPassword}
        />

        {/* Confirm password */}
        <PasswordField
          id="confirm-password"
          label={tc("confirmPassword")}
          value={confirmPassword}
          onChange={setConfirmPassword}
          required
          disabled={changePassword.isPending}
          placeholder="Nhập lại mật khẩu mới"
          showPasswordLabel={t("showPassword")}
          hidePasswordLabel={t("hidePassword")}
          error={fieldErrors.confirmPassword}
        />
      </div>

      <div className="mt-6 flex justify-end">
        <Button type="submit" disabled={changePassword.isPending} id="change-password-save-btn">
          {changePassword.isPending ? (
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
