"use client";

import { translate } from "@ecom/i18n";
import { useI18n } from "@ecom/shared/@i18n";
import { Input } from "@ecom/ui/components/input";
import { CheckCircle } from "lucide-react";
import { useState } from "react";

export default function ChangePasswordPage() {
  const { languageId: currentLocale } = useI18n();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  return (
    <form
      // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Simple onSubmit handler for UI preview validation.
      onSubmit={(e) => {
        e.preventDefault();
        setPasswordError(null);
        setPasswordSuccess(false);

        if (!currentPassword || !newPassword || !confirmPassword) {
          setPasswordError(
            currentLocale === "vi"
              ? "Vui lòng nhập đầy đủ các trường yêu cầu"
              : "Please fill in all required fields",
          );
          return;
        }

        if (newPassword.length < 6) {
          setPasswordError(
            currentLocale === "vi"
              ? "Mật khẩu mới phải có tối thiểu 6 ký tự"
              : "New password must be at least 6 characters long",
          );
          return;
        }

        if (newPassword !== confirmPassword) {
          setPasswordError(
            currentLocale === "vi"
              ? "Mật khẩu mới và xác nhận mật khẩu không trùng khớp"
              : "New password and confirmation do not match",
          );
          return;
        }

        setPasswordSaving(true);
        setTimeout(() => {
          setPasswordSaving(false);
          setPasswordSuccess(true);
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
        }, 1000);
      }}
      className="space-y-6 w-full"
    >
      <h2 className="text-lg font-bold text-foreground">
        {translate("customerProfile.changePasswordTitle", currentLocale)}
      </h2>

      {/* Current Password */}
      <div>
        <label
          htmlFor="current-password"
          className="mb-1.5 block text-sm font-medium text-foreground"
        >
          {translate("customerProfile.currentPasswordLabel", currentLocale)}
          <span className="text-destructive ml-0.5">*</span>
        </label>
        <Input
          id="current-password"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder={translate("customerProfile.currentPasswordPlaceholder", currentLocale)}
        />
      </div>

      {/* New Password */}
      <div>
        <label htmlFor="new-password" className="mb-1.5 block text-sm font-medium text-foreground">
          {translate("customerProfile.newPasswordLabel", currentLocale)}
          <span className="text-destructive ml-0.5">*</span>
        </label>
        <Input
          id="new-password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder={translate("customerProfile.newPasswordPlaceholder", currentLocale)}
        />
      </div>

      {/* Confirm Password */}
      <div>
        <label
          htmlFor="confirm-password"
          className="mb-1.5 block text-sm font-medium text-foreground"
        >
          {translate("customerProfile.confirmPasswordLabel", currentLocale)}
          <span className="text-destructive ml-0.5">*</span>
        </label>
        <Input
          id="confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder={translate("customerProfile.confirmPasswordPlaceholder", currentLocale)}
        />
      </div>

      {passwordError && <p className="text-sm text-destructive font-medium">{passwordError}</p>}

      {passwordSuccess && (
        <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
          <CheckCircle className="h-4 w-4" />
          {currentLocale === "vi" ? "Đổi mật khẩu thành công!" : "Password updated successfully!"}
        </p>
      )}

      <button
        type="submit"
        disabled={passwordSaving}
        className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
      >
        {passwordSaving
          ? translate("customerProfile.saving", currentLocale)
          : translate("customerProfile.updatePasswordBtn", currentLocale)}
      </button>
    </form>
  );
}
