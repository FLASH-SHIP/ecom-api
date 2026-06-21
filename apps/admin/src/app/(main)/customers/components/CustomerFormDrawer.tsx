"use client";

import { useToast } from "@admin/components/toast-provider";
import { PhoneInput } from "@admin/components/ui/PhoneInput";
import { trpc } from "@admin/lib/trpc";
import { Button } from "@ecom/ui/components/button";
import { DatePicker } from "@ecom/ui/components/date-picker";
import { Input } from "@ecom/ui/components/input";
import { Label } from "@ecom/ui/components/label";
import { PerfectScroll } from "@ecom/ui/components/perfect-scroll";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ecom/ui/components/select";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@ecom/ui/components/sheet";
import { Textarea } from "@ecom/ui/components/textarea";
import { cn } from "@ecom/ui/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Eye, EyeOff, Loader2, Save } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

// ── Static schema for type inference only (no messages needed) ───────────────

const _schemaShape = z.object({
  name: z.string().max(200).optional(),
  email: z.string().email().min(1),
  password: z.string().min(1),
  confirmPassword: z.string().min(1),
  username: z.string().max(30).optional(),
  phone: z.string().max(20).optional(),
  dob: z.string().optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  description: z.string().max(1000).optional(),
});

type FormValues = z.infer<typeof _schemaShape>;

const defaultValues: FormValues = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  username: "",
  phone: "",
  dob: "",
  gender: undefined,
  description: "",
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface CustomerFormDrawerProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CustomerFormDrawer({ open, onClose, onSaved }: CustomerFormDrawerProps) {
  const t = useTranslations("customers");
  const tUsers = useTranslations("users");
  const tCommon = useTranslations("common");
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);

  // ── Schema built inside component to access t() ──────────────────────────
  const schema = z
    .object({
      name: z.string().max(200).optional(),
      email: z.string().min(1, t("validation.emailRequired")).email(t("validation.emailInvalid")),
      password: z
        .string()
        .min(1, t("validation.passwordRequired"))
        .min(8, t("validation.passwordMin")),
      confirmPassword: z.string().min(1, t("validation.confirmPasswordRequired")),
      username: z.string().max(30).optional(),
      phone: z.string().max(20).optional(),
      dob: z.string().optional(),
      gender: z.enum(["male", "female", "other"]).optional(),
      description: z.string().max(1000).optional(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("validation.passwordMismatch"),
      path: ["confirmPassword"],
    });

  const { control, handleSubmit, formState, reset } = useForm<FormValues>({
    mode: "onChange",
    defaultValues,
    resolver: zodResolver(schema),
  });

  const { isSubmitting } = formState;

  // Reset form when drawer opens
  useEffect(() => {
    if (open) {
      reset(defaultValues);
      setShowPassword(false);
    }
  }, [open, reset]);

  const utils = trpc.useUtils();

  const createMut = trpc.viewer.customers.create.useMutation({
    onSuccess: () => {
      utils.viewer.customers.list.invalidate();
      toast(tCommon("success") ?? "Created successfully", "success");
      onSaved();
    },
    onError: (err) => {
      toast(err.message, "error");
    },
  });

  async function onSubmit(data: FormValues) {
    createMut.mutate({
      email: data.email,
      username: data.username?.trim() || undefined,
      name: data.name?.trim() || undefined,
      phone: data.phone || undefined,
      dob: data.dob || undefined,
      gender: data.gender,
      description: data.description?.trim() || undefined,
      password: data.password || undefined,
    });
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-[520px]">
        {/* Header */}
        <SheetHeader className="border-b border-border px-6 py-4">
          <SheetTitle>{t("drawer.createTitle")}</SheetTitle>
        </SheetHeader>

        {/* Body */}
        <form
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <PerfectScroll className="flex flex-1 flex-col gap-5 px-6 py-6">
            {/* 1. Full Name */}
            <Controller
              name="name"
              control={control}
              render={({ field, fieldState }) => (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="customer-name">{t("form.nameLabel")}</Label>
                  <Input
                    {...field}
                    id="customer-name"
                    placeholder={t("form.namePlaceholder")}
                    aria-invalid={!!fieldState.error}
                  />
                  {fieldState.error && (
                    <p className="text-xs text-destructive">{fieldState.error.message}</p>
                  )}
                </div>
              )}
            />
            {/* 3. Email */}
            <Controller
              name="email"
              control={control}
              render={({ field, fieldState }) => (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="customer-email">
                    {t("form.emailLabel")} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    {...field}
                    id="customer-email"
                    type="email"
                    placeholder="email@example.com"
                    required
                    aria-invalid={!!fieldState.error}
                  />
                  {fieldState.error && (
                    <p className="text-xs text-destructive">{fieldState.error.message}</p>
                  )}
                </div>
              )}
            />
            {/* 5. Username */}
            <Controller
              name="username"
              control={control}
              render={({ field, fieldState }) => (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="customer-username">{tUsers("fields.username")}</Label>
                  <Input
                    {...field}
                    id="customer-username"
                    placeholder={tUsers("fields.username")}
                    aria-invalid={!!fieldState.error}
                    onChange={(e) => field.onChange(e.target.value.toLowerCase())}
                  />
                  {fieldState.error && (
                    <p className="text-xs text-destructive">{fieldState.error.message}</p>
                  )}
                </div>
              )}
            />
            {/* 6. Phone */}
            <Controller
              name="phone"
              control={control}
              render={({ field, fieldState }) => (
                <div className="flex flex-col gap-1.5">
                  <PhoneInput
                    id="customer-phone"
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    label={t("form.phoneLabel")}
                  />
                  {fieldState.error && (
                    <p className="text-xs text-destructive">{fieldState.error.message}</p>
                  )}
                </div>
              )}
            />
            {/* 7. Date of Birth */}
            <Controller
              name="dob"
              control={control}
              render={({ field, fieldState }) => (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="customer-dob">{t("form.dobLabel")}</Label>
                  <DatePicker
                    value={field.value ?? ""}
                    onChange={(val) => field.onChange(val)}
                    placeholder="dd/mm/yyyy"
                    disabled={field.disabled}
                  />
                  {fieldState.error && (
                    <p className="text-xs text-destructive">{fieldState.error.message}</p>
                  )}
                </div>
              )}
            />
            {/* 8. Gender */}
            <Controller
              name="gender"
              control={control}
              render={({ field, fieldState }) => (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="customer-gender">{t("form.genderLabel")}</Label>
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="customer-gender"
                      className={cn(fieldState.error && "border-destructive")}
                    >
                      <SelectValue placeholder={t("form.genderPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">{t("gender.male")}</SelectItem>
                      <SelectItem value="female">{t("gender.female")}</SelectItem>
                      <SelectItem value="other">{t("gender.other")}</SelectItem>
                    </SelectContent>
                  </Select>
                  {fieldState.error && (
                    <p className="text-xs text-destructive">{fieldState.error.message}</p>
                  )}
                </div>
              )}
            />
            {/* 9. Description */}
            <Controller
              name="description"
              control={control}
              render={({ field, fieldState }) => (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="customer-description">{t("form.descriptionLabel")}</Label>
                  <Textarea
                    {...field}
                    id="customer-description"
                    placeholder={t("form.descriptionPlaceholder")}
                    rows={3}
                    aria-invalid={!!fieldState.error}
                  />
                  {fieldState.error && (
                    <p className="text-xs text-destructive">{fieldState.error.message}</p>
                  )}
                </div>
              )}
            />
            {/* Password */}
            <Controller
              name="password"
              control={control}
              render={({ field, fieldState }) => (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="customer-password">{t("form.passwordLabel")}</Label>
                  <div className="relative">
                    <Input
                      {...field}
                      id="customer-password"
                      type={showPassword ? "text" : "password"}
                      placeholder={t("form.passwordPlaceholder")}
                      className="pr-10"
                      aria-invalid={!!fieldState.error}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={
                        showPassword
                          ? tUsers("profile.hidePassword")
                          : tUsers("profile.showPassword")
                      }
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  {fieldState.error && (
                    <p className="text-xs text-destructive">{fieldState.error.message}</p>
                  )}
                </div>
              )}
            />
            {/* Confirm Password */}
            <Controller
              name="confirmPassword"
              control={control}
              render={({ field, fieldState }) => (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="customer-confirm-password">
                    {t("form.confirmPasswordLabel")}
                  </Label>
                  <div className="relative">
                    <Input
                      {...field}
                      id="customer-confirm-password"
                      type={showPassword ? "text" : "password"}
                      placeholder={t("form.confirmPasswordLabel")}
                      className="pr-10"
                      aria-invalid={!!fieldState.error}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={
                        showPassword
                          ? tUsers("profile.hidePassword")
                          : tUsers("profile.showPassword")
                      }
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  {fieldState.error && (
                    <p className="text-xs text-destructive">{fieldState.error.message}</p>
                  )}
                </div>
              )}
            />
            {/* Server error */}
            {createMut.error && (
              <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-red-50 px-4 py-3 text-sm text-destructive dark:bg-red-950">
                <AlertCircle className="size-4 shrink-0" />
                {createMut.error.message}
              </div>
            )}
          </PerfectScroll>

          {/* Footer */}
          <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
            <Button type="button" variant="ghost" onClick={onClose}>
              {tCommon("cancel")}
            </Button>
            <Button
              id="customer-form-save"
              type="submit"
              disabled={isSubmitting || createMut.isPending}
            >
              {createMut.isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Save className="mr-2 size-4" />
              )}
              {createMut.isPending ? t("form.creating") : t("form.create")}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
