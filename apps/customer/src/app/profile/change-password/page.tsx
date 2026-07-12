"use client";

import { translate } from "@ecom/i18n";
import { useI18n } from "@ecom/shared/@i18n";
import { Input } from "@ecom/ui/components/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useToast } from "../../../components/toast-provider";
import { trpc } from "../../../lib/trpc";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại."),
    newPassword: z
      .string()
      .min(8, "Mật khẩu phải chứa ít nhất 8 ký tự.")
      .refine((val) => /[A-Z]/.test(val), "Mật khẩu phải chứa ít nhất 1 chữ hoa.")
      .refine((val) => /[a-z]/.test(val), "Mật khẩu phải chứa ít nhất 1 chữ thường.")
      .refine((val) => /[0-9]/.test(val), "Mật khẩu phải chứa ít nhất 1 chữ số.")
      .refine((val) => /[^A-Za-z0-9]/.test(val), "Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt."),
    confirmPassword: z.string().min(1, "Vui lòng xác nhận mật khẩu mới."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp.",
    path: ["confirmPassword"],
  });

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: password change validation complexity
export default function ChangePasswordPage() {
  const { languageId: currentLocale } = useI18n();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const changePasswordMutation = trpc.customer.auth.changePassword.useMutation({
    onSuccess: () => {
      toast(translate("customerProfile.passwordUpdateSuccess", currentLocale), "success");
      reset();
    },
    onError: (err) => {
      toast(err.message || "An error occurred", "error");
    },
  });

  const isPending = changePasswordMutation.isPending;

  const newPassword = watch("newPassword", "");
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(newPassword);
  const isPasswordValid =
    hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecialChar;

  const onSubmit = (data: ChangePasswordFormValues) => {
    changePasswordMutation.mutate({
      oldPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
  };

  return (
    <form autoComplete="off" onSubmit={handleSubmit(onSubmit)} className="space-y-6 w-full">
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
          autoComplete="new-password"
          {...register("currentPassword")}
          placeholder={translate("customerProfile.currentPasswordPlaceholder", currentLocale)}
        />
        {errors.currentPassword && (
          <p className="text-xs text-destructive mt-1">{errors.currentPassword.message}</p>
        )}
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
          autoComplete="new-password"
          {...register("newPassword")}
          placeholder={translate("customerProfile.newPasswordPlaceholder", currentLocale)}
        />
        {errors.newPassword && (
          <p className="text-xs text-destructive mt-1">{errors.newPassword.message}</p>
        )}

        {/* Password Rules Checklist */}
        <div className="mt-3 space-y-1.5 border border-border/40 rounded-xl p-3 bg-muted/20 select-none">
          <div className="flex items-center gap-2 text-xs">
            {hasMinLength ? (
              <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            ) : (
              <X className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
            )}
            <span
              className={hasMinLength ? "text-emerald-600 font-semibold" : "text-muted-foreground"}
            >
              {translate("customerProfile.ruleMinLength", currentLocale)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {hasUppercase ? (
              <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            ) : (
              <X className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
            )}
            <span
              className={hasUppercase ? "text-emerald-600 font-semibold" : "text-muted-foreground"}
            >
              {translate("customerProfile.ruleUppercase", currentLocale)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {hasLowercase ? (
              <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            ) : (
              <X className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
            )}
            <span
              className={hasLowercase ? "text-emerald-600 font-semibold" : "text-muted-foreground"}
            >
              {translate("customerProfile.ruleLowercase", currentLocale)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {hasNumber ? (
              <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            ) : (
              <X className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
            )}
            <span
              className={hasNumber ? "text-emerald-600 font-semibold" : "text-muted-foreground"}
            >
              {translate("customerProfile.ruleNumber", currentLocale)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {hasSpecialChar ? (
              <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            ) : (
              <X className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
            )}
            <span
              className={
                hasSpecialChar ? "text-emerald-600 font-semibold" : "text-muted-foreground"
              }
            >
              {translate("customerProfile.ruleSpecialChar", currentLocale)}
            </span>
          </div>
        </div>
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
          autoComplete="new-password"
          {...register("confirmPassword")}
          placeholder={translate("customerProfile.confirmPasswordPlaceholder", currentLocale)}
        />
        {errors.confirmPassword && (
          <p className="text-xs text-destructive mt-1">{errors.confirmPassword.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending || !isPasswordValid}
        className="flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
      >
        {isPending && (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {isPending
          ? translate("customerProfile.saving", currentLocale)
          : translate("customerProfile.updatePasswordBtn", currentLocale)}
      </button>
    </form>
  );
}
