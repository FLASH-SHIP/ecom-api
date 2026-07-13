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
import { Switch } from "@ecom/ui/components/switch";
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
  name: z.string().min(1).max(200),
  email: z.string().email().min(1),
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
  changePassword: z.boolean().optional(),
  username: z.string().max(30).optional(),
  phone: z.string().max(20).optional(),
  dob: z.string().optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  description: z.string().max(1000).optional(),
  groupId: z.number().int().positive().nullable().optional(),
});

type FormValues = z.infer<typeof _schemaShape>;

const defaultValues: FormValues = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  changePassword: false,
  username: "",
  phone: "",
  dob: "",
  gender: undefined,
  description: "",
  groupId: null,
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface CustomerFormDrawerProps {
  customerId?: string | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: form drawer contains custom validations and both edit/create routes
export function CustomerFormDrawer({
  customerId,
  open,
  onClose,
  onSaved,
}: CustomerFormDrawerProps) {
  const t = useTranslations("customers");
  const tUsers = useTranslations("users");
  const tCommon = useTranslations("common");
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const isEdit = customerId !== undefined && customerId !== null;

  const { data: customerData, isLoading: isCustomerLoading } = trpc.viewer.customers.get.useQuery(
    { id: customerId ?? "" },
    { enabled: open && isEdit },
  );

  const { data: customerGroups } = trpc.viewer.customerGroups.listAll.useQuery(undefined, {
    enabled: open,
  });

  // ── Schema built inside component to access t() and isEdit ──────────────────
  const schema = z
    .object({
      name: z.string().min(1, t("validation.nameRequired")).max(200),
      email: z.string().min(1, t("validation.emailRequired")).email(t("validation.emailInvalid")),
      password: z.string().optional(),
      confirmPassword: z.string().optional(),
      changePassword: z.boolean().optional(),
      username: z.string().max(30).optional(),
      phone: z.string().max(20).optional(),
      dob: z.string().optional(),
      gender: z.enum(["male", "female", "other"]).optional(),
      description: z.string().max(1000).optional(),
      groupId: z.number().int().positive().nullable().optional(),
    })
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: superRefine contains conditional password check complexity
    .superRefine((data, ctx) => {
      if (!isEdit) {
        if (!data.password) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t("validation.passwordRequired"),
            path: ["password"],
          });
        } else if (data.password.length < 8) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t("validation.passwordMin"),
            path: ["password"],
          });
        }

        if (data.password !== data.confirmPassword) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t("validation.passwordMismatch"),
            path: ["confirmPassword"],
          });
        }
      } else {
        if (data.changePassword) {
          if (!data.password) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: t("validation.passwordRequired"),
              path: ["password"],
            });
          } else if (data.password.length < 8) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: t("validation.passwordMin"),
              path: ["password"],
            });
          }

          if (!data.confirmPassword) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: t("validation.confirmPasswordRequired"),
              path: ["confirmPassword"],
            });
          } else if (data.password !== data.confirmPassword) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: t("validation.passwordMismatch"),
              path: ["confirmPassword"],
            });
          }
        }
      }
    });

  const { control, handleSubmit, formState, reset, setValue, clearErrors, watch } =
    useForm<FormValues>({
      mode: "onChange",
      defaultValues,
      resolver: zodResolver(schema),
    });

  const changePasswordToggle = watch("changePassword") ?? false;

  const { isSubmitting } = formState;

  // Reset form when drawer opens or data is loaded
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: resets nested form properties conditionally depending on create/edit mode
  useEffect(() => {
    if (open) {
      if (isEdit) {
        if (customerData) {
          let dobStr = "";
          if (customerData.dob) {
            const dateVal = new Date(customerData.dob);
            if (!Number.isNaN(dateVal.getTime())) {
              dobStr = dateVal.toISOString().split("T")[0] ?? "";
            }
          }

          reset({
            name: customerData.name ?? "",
            email: customerData.email,
            username: customerData.username ?? "",
            phone: customerData.phone ?? "",
            dob: dobStr,
            gender: (customerData.gender as "male" | "female" | "other" | undefined) || undefined,
            description: customerData.description ?? "",
            password: "",
            confirmPassword: "",
            changePassword: false,
            groupId: customerData.groupId ?? null,
          });
        }
      } else {
        reset(defaultValues);
      }
      setShowPassword(false);
      setShowConfirmPassword(false);
    }
  }, [open, isEdit, customerData, reset]);

  const utils = trpc.useUtils();

  const createMut = trpc.viewer.customers.create.useMutation({
    onSuccess: () => {
      utils.viewer.customers.list.invalidate();
      toast(tCommon("successCreated"), "success");
      onSaved();
    },
    onError: (err) => {
      toast(err.message, "error");
    },
  });

  const updateMut = trpc.viewer.customers.update.useMutation({
    onSuccess: () => {
      utils.viewer.customers.list.invalidate();
      utils.viewer.customers.get.invalidate({ id: customerId ?? "" });
      toast(tCommon("successUpdated"), "success");
      onSaved();
    },
    onError: (err) => {
      toast(err.message, "error");
    },
  });

  const setPasswordMut = trpc.viewer.customers.setPassword.useMutation({
    onSuccess: () => {
      utils.viewer.customers.get.invalidate({ id: customerId ?? "" });
    },
    onError: (err) => {
      toast(err.message, "error");
    },
  });

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: onSubmit calls create/update and optionally setPassword mutations
  async function onSubmit(data: FormValues) {
    if (isEdit) {
      if (customerId === null || customerId === undefined) return;
      try {
        await updateMut.mutateAsync({
          id: customerId,
          username: data.username?.trim() || undefined,
          name: data.name?.trim() || undefined,
          phone: data.phone || undefined,
          dob: data.dob || null,
          gender: data.gender || null,
          description: data.description?.trim() || null,
          groupId: data.groupId || null,
        });

        if (data.changePassword && data.password) {
          await setPasswordMut.mutateAsync({
            id: customerId,
            password: data.password,
          });
        }
      } catch {
        // Mutation error handled in callback hooks
      }
    } else {
      createMut.mutate({
        email: data.email,
        username: data.username?.trim() || undefined,
        name: data.name?.trim() || undefined,
        phone: data.phone || undefined,
        dob: data.dob || undefined,
        gender: data.gender,
        description: data.description?.trim() || undefined,
        password: data.password || undefined,
        groupId: data.groupId || undefined,
      });
    }
  }

  const isMutPending = createMut.isPending || updateMut.isPending || setPasswordMut.isPending;
  const anyError = createMut.error || updateMut.error || setPasswordMut.error;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-[520px]">
        {/* Header */}
        <SheetHeader className="border-b border-border px-6 py-4">
          <SheetTitle>{isEdit ? t("drawer.editTitle") : t("drawer.createTitle")}</SheetTitle>
        </SheetHeader>

        {isEdit && isCustomerLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
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
                    <Label htmlFor="customer-name">
                      {t("form.nameLabel")} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      {...field}
                      id="customer-name"
                      placeholder={t("form.namePlaceholder")}
                      required
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
                      disabled={isEdit}
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
                      disabled={field.disabled}
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
              {/* Customer Group */}
              <Controller
                name="groupId"
                control={control}
                render={({ field, fieldState }) => (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="customer-group">Nhóm khách hàng</Label>
                    <Select
                      value={field.value ? String(field.value) : "none"}
                      onValueChange={(val) => field.onChange(val === "none" ? null : Number(val))}
                    >
                      <SelectTrigger
                        id="customer-group"
                        className={cn(fieldState.error && "border-destructive")}
                        disabled={field.disabled}
                      >
                        <SelectValue placeholder="Chọn nhóm khách hàng..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Không phân nhóm</SelectItem>
                        {customerGroups?.map((group) => (
                          <SelectItem key={group.id} value={String(group.id)}>
                            {group.name} ({group.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                        disabled={field.disabled}
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
              {isEdit && (
                <Controller
                  name="changePassword"
                  control={control}
                  render={({ field }) => (
                    <div className="flex items-center gap-2 py-1">
                      <Switch
                        id="change-password-toggle"
                        checked={field.value}
                        onCheckedChange={(checked) => {
                          field.onChange(checked);
                          if (!checked) {
                            setValue("password", "");
                            setValue("confirmPassword", "");
                            clearErrors(["password", "confirmPassword"]);
                          }
                        }}
                      />
                      <Label
                        htmlFor="change-password-toggle"
                        className="cursor-pointer font-medium"
                      >
                        {t("form.changePasswordToggle")}
                      </Label>
                    </div>
                  )}
                />
              )}
              {(!isEdit || changePasswordToggle) && (
                <>
                  {/* Password */}
                  <Controller
                    name="password"
                    control={control}
                    render={({ field, fieldState }) => (
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="customer-password">
                          {isEdit ? tUsers("newPassword") : t("form.passwordLabel")}{" "}
                          <span className="text-destructive">*</span>
                        </Label>
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
                            {showPassword ? (
                              <EyeOff className="size-4" />
                            ) : (
                              <Eye className="size-4" />
                            )}
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
                          {t("form.confirmPasswordLabel")}{" "}
                          <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative">
                          <Input
                            {...field}
                            id="customer-confirm-password"
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder={t("form.confirmPasswordLabel")}
                            className="pr-10"
                            aria-invalid={!!fieldState.error}
                          />
                          <button
                            type="button"
                            tabIndex={-1}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            onClick={() => setShowConfirmPassword((v) => !v)}
                            aria-label={
                              showConfirmPassword
                                ? tUsers("profile.hidePassword")
                                : tUsers("profile.showPassword")
                            }
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="size-4" />
                            ) : (
                              <Eye className="size-4" />
                            )}
                          </button>
                        </div>
                        {fieldState.error && (
                          <p className="text-xs text-destructive">{fieldState.error.message}</p>
                        )}
                      </div>
                    )}
                  />
                </>
              )}
              {/* Server error */}
              {anyError && (
                <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-red-50 px-4 py-3 text-sm text-destructive dark:bg-red-950">
                  <AlertCircle className="size-4 shrink-0" />
                  {anyError.message}
                </div>
              )}
            </PerfectScroll>

            {/* Footer */}
            <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
              <Button type="button" variant="ghost" onClick={onClose}>
                {tCommon("cancel")}
              </Button>
              <Button id="customer-form-save" type="submit" disabled={isSubmitting || isMutPending}>
                {isMutPending ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Save className="mr-2 size-4" />
                )}
                {isEdit
                  ? isMutPending
                    ? t("drawer.saving")
                    : t("drawer.save")
                  : isMutPending
                    ? t("form.creating")
                    : t("form.create")}
              </Button>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
