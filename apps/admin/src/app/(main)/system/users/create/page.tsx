"use client";

import { PageShell } from "@admin/components/layout/PageShell";
import { useToast } from "@admin/components/toast-provider";
import { PhoneInput } from "@admin/components/ui/PhoneInput";
import { trpc } from "@admin/lib/trpc";
import { Button } from "@ecom/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@ecom/ui/components/card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@ecom/ui/components/dropdown-menu";
import { Input } from "@ecom/ui/components/input";
import { Label } from "@ecom/ui/components/label";
import { cn } from "@ecom/ui/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowLeft, ChevronDown, Loader2, Save, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { Control, UseFormSetValue } from "react-hook-form";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

interface FormValues {
  name: string;
  email: string;
  username: string;
  phone?: string;
  password: string;
  confirmPassword: string;
  roleIds?: string[];
}

const getValidationSchema = (t: (key: string) => string) =>
  z
    .object({
      name: z.string().min(1, t("validation.nameRequired")).max(100),
      email: z.string().min(1, t("validation.emailRequired")).email(t("validation.emailInvalid")),
      username: z
        .string()
        .min(3, t("profile.usernameMin"))
        .max(50)
        .regex(/^[a-zA-Z0-9_.-]+$/, t("profile.usernameInvalid")),
      phone: z
        .string()
        .max(20)
        .regex(/^\+?[0-9\s\-().]{7,20}$/, t("profile.phoneInvalid"))
        .or(z.literal(""))
        .optional(),
      password: z.string().min(8, t("profile.passwordMinLength")).max(100),
      confirmPassword: z.string().min(8, t("profile.passwordMinLength")).max(100),
      roleIds: z.array(z.string()).optional(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("profile.passwordMismatch"),
      path: ["confirmPassword"],
    });

function getRedirectUrl(submitAction: "save" | "save-edit", id?: number): string {
  if (submitAction === "save-edit" && id) {
    return `/system/users/profile/${id}`;
  }
  return "/system/users";
}

interface UserFieldsCardProps {
  control: Control<FormValues>;
  t: (key: string) => string;
  isFormDisabled: boolean;
}

function UserFieldsCard({ control, t, isFormDisabled }: UserFieldsCardProps) {
  return (
    <Card className="rounded-lg">
      <CardHeader className="border-b border-border px-6 py-4">
        <CardTitle className="text-base font-semibold">{t("newUser")}</CardTitle>
      </CardHeader>
      <CardContent className="p-6 flex flex-col gap-5">
        {/* 1. Họ tên */}
        <Controller
          name="name"
          control={control}
          render={({ field, fieldState }) => (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="user-name">
                {t("fields.fullName")} <span className="text-destructive">*</span>
              </Label>
              <Input
                {...field}
                id="user-name"
                required
                disabled={isFormDisabled}
                placeholder="Nhập họ tên"
                aria-invalid={!!fieldState.error}
              />
              {fieldState.error && (
                <p className="text-xs text-destructive">{fieldState.error.message}</p>
              )}
            </div>
          )}
        />

        {/* 2. Tên đăng nhập & E-mail */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Controller
            name="username"
            control={control}
            render={({ field, fieldState }) => (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="user-username">
                  {t("fields.username")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  {...field}
                  id="user-username"
                  required
                  disabled={isFormDisabled}
                  placeholder="Nhập tên đăng nhập"
                  onChange={(e) => field.onChange(e.target.value.toLowerCase().trim())}
                  aria-invalid={!!fieldState.error}
                />
                {fieldState.error && (
                  <p className="text-xs text-destructive">{fieldState.error.message}</p>
                )}
              </div>
            )}
          />

          <Controller
            name="email"
            control={control}
            render={({ field, fieldState }) => (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="user-email">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  {...field}
                  id="user-email"
                  type="email"
                  required
                  disabled={isFormDisabled}
                  placeholder="Nhập email"
                  aria-invalid={!!fieldState.error}
                />
                {fieldState.error && (
                  <p className="text-xs text-destructive">{fieldState.error.message}</p>
                )}
              </div>
            )}
          />
        </div>

        {/* 3. Điện thoại */}
        <Controller
          name="phone"
          control={control}
          render={({ field, fieldState }) => (
            <div className="flex flex-col gap-1.5">
              <PhoneInput
                id="user-phone"
                value={field.value ?? ""}
                onChange={field.onChange}
                disabled={isFormDisabled}
                label={t("fields.phone")}
                placeholder="Nhập số điện thoại"
              />
              {fieldState.error && (
                <p className="text-xs text-destructive">{fieldState.error.message}</p>
              )}
            </div>
          )}
        />

        {/* 4. Mật khẩu & Nhập lại mật khẩu */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Controller
            name="password"
            control={control}
            render={({ field, fieldState }) => (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="user-password">
                  {t("fields.password")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  {...field}
                  id="user-password"
                  type="password"
                  required
                  disabled={isFormDisabled}
                  placeholder="Nhập mật khẩu (tối thiểu 8 ký tự)"
                  showPasswordLabel={t("profile.showPassword")}
                  hidePasswordLabel={t("profile.hidePassword")}
                  aria-invalid={!!fieldState.error}
                />
                {fieldState.error && (
                  <p className="text-xs text-destructive">{fieldState.error.message}</p>
                )}
              </div>
            )}
          />

          <Controller
            name="confirmPassword"
            control={control}
            render={({ field, fieldState }) => (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="user-confirm-password">
                  {t("confirmPassword")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  {...field}
                  id="user-confirm-password"
                  type="password"
                  required
                  disabled={isFormDisabled}
                  placeholder="Nhập lại mật khẩu"
                  showPasswordLabel={t("profile.showPassword")}
                  hidePasswordLabel={t("profile.hidePassword")}
                  aria-invalid={!!fieldState.error}
                />
                {fieldState.error && (
                  <p className="text-xs text-destructive">{fieldState.error.message}</p>
                )}
              </div>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}

interface UserRolesCardProps {
  roles?: Array<{ id?: string; name?: string; displayName?: string | null }>;
  isLoading: boolean;
  selectedRoleIds: string[];
  isFormDisabled: boolean;
  setValue: UseFormSetValue<FormValues>;
  t: (key: string) => string;
}

function UserRolesCard({
  roles,
  isLoading,
  selectedRoleIds,
  isFormDisabled,
  setValue,
  t,
}: UserRolesCardProps) {
  return (
    <Card className="rounded-lg">
      <CardHeader className="border-b border-border px-4 py-3">
        <CardTitle className="text-sm font-semibold">{t("fields.role")}</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild disabled={isFormDisabled}>
              <div
                role="combobox"
                aria-expanded="false"
                tabIndex={isFormDisabled ? -1 : 0}
                className={cn(
                  "w-full flex justify-between items-center border border-border rounded-md px-3 py-1.5 min-h-9 text-sm bg-background cursor-pointer select-none text-foreground hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-ring",
                  isFormDisabled && "pointer-events-none opacity-50 bg-muted cursor-not-allowed",
                )}
              >
                <div className="flex flex-wrap gap-1.5 items-center mr-2">
                  {selectedRoleIds.length > 0 ? (
                    roles
                      ?.filter((r) => r.id && selectedRoleIds.includes(r.id))
                      .map((role) => (
                        <span
                          key={role.id || ""}
                          className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs font-medium text-foreground border border-border"
                        >
                          {role.displayName ?? role.name}
                          {!isFormDisabled && (
                            <button
                              type="button"
                              className="rounded-full p-0.5 hover:bg-neutral-200 dark:hover:bg-neutral-800 text-muted-foreground hover:text-foreground"
                              onPointerDown={(e) => {
                                e.stopPropagation();
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                setValue(
                                  "roleIds",
                                  selectedRoleIds.filter((id) => id !== (role.id || "")),
                                );
                              }}
                            >
                              <X className="size-3" />
                            </button>
                          )}
                        </span>
                      ))
                  ) : (
                    <span className="text-muted-foreground">
                      {t("fields.role") || "Chọn vai trò"}
                    </span>
                  )}
                </div>
                <ChevronDown className="size-4 shrink-0 opacity-50" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="start">
              {roles?.map((role) => {
                if (!role.id) return null;
                const checked = selectedRoleIds.includes(role.id);
                return (
                  <DropdownMenuCheckboxItem
                    key={role.id}
                    checked={checked}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setValue("roleIds", [...selectedRoleIds, role.id || ""]);
                      } else {
                        setValue(
                          "roleIds",
                          selectedRoleIds.filter((id) => id !== (role.id || "")),
                        );
                      }
                    }}
                  >
                    {role.displayName ?? role.name}
                  </DropdownMenuCheckboxItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardContent>
    </Card>
  );
}

export default function CreateUserPage() {
  const t = useTranslations("users");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { toast } = useToast();

  const [submitAction, setSubmitAction] = useState<"save" | "save-edit">("save");

  // Fetch roles
  const { data: roles, isLoading: isRolesLoading } = trpc.viewer.roles.list.useQuery(undefined, {
    staleTime: 60_000,
  });

  const schema = getValidationSchema(t);

  const { control, handleSubmit, formState, watch, setValue } = useForm<FormValues>({
    mode: "onChange",
    defaultValues: {
      name: "",
      email: "",
      username: "",
      phone: "",
      password: "",
      confirmPassword: "",
      roleIds: [],
    },
    resolver: zodResolver(schema),
  });

  const { isSubmitting } = formState;
  const selectedRoleIds = watch("roleIds") || [];

  const createMut = trpc.viewer.users.create.useMutation({
    onSuccess: (data) => {
      toast(tCommon("successCreated") ?? "Created successfully", "success");
      router.push(getRedirectUrl(submitAction, data?.id));
    },
    onError: (err) => {
      toast(err.message, "error");
    },
  });

  const onSubmit = (data: FormValues) => {
    createMut.mutate({
      email: data.email.trim(),
      name: data.name.trim(),
      username: data.username.trim(),
      phone: data.phone?.trim() || undefined,
      password: data.password,
      roleIds: data.roleIds?.length ? data.roleIds : undefined,
    });
  };

  const isPending = createMut.isPending;
  const isSaveEditPending = isSubmitting || (isPending && submitAction === "save-edit");
  const isSavePending = isSubmitting || (isPending && submitAction === "save");
  const isFormDisabled = isSubmitting || isPending;

  return (
    <PageShell
      title={t("newUser")}
      headerActions={
        <Button variant="outline" size="sm" onClick={() => router.push("/system/users")}>
          <ArrowLeft className="mr-2 size-4" />
          {tCommon("back") ?? "Quay lại"}
        </Button>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Form Fields */}
          <div className="flex flex-col gap-6 lg:col-span-2">
            <UserFieldsCard control={control} t={t} isFormDisabled={isFormDisabled} />

            {createMut.error && (
              <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-red-50 px-4 py-3 text-sm text-destructive dark:bg-red-950">
                <AlertCircle className="size-4 shrink-0" />
                {createMut.error.message}
              </div>
            )}
          </div>

          {/* Right Sidebar Columns */}
          <div className="flex flex-col gap-6">
            {/* Card 1: Publish */}
            <Card className="rounded-lg">
              <CardHeader className="border-b border-border px-4 py-3">
                <CardTitle className="text-sm font-semibold">
                  {tCommon("publish") ?? "Đăng"}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 flex flex-col gap-3">
                <Button
                  type="submit"
                  variant="outline"
                  onClick={() => setSubmitAction("save-edit")}
                  disabled={isSaveEditPending}
                  id="user-create-save-edit-btn"
                  className="w-full flex justify-center items-center"
                >
                  {isSaveEditPending && submitAction === "save-edit" ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 size-4" />
                  )}
                  <span className="truncate">{t("saveAndEdit") ?? "Lưu & chỉnh sửa"}</span>
                </Button>

                <Button
                  type="submit"
                  onClick={() => setSubmitAction("save")}
                  disabled={isSavePending}
                  id="user-create-save-btn"
                  className="w-full flex justify-center items-center"
                >
                  {isSavePending && submitAction === "save" ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 size-4" />
                  )}
                  <span className="truncate">{t("actions.save") ?? "Lưu"}</span>
                </Button>
              </CardContent>
            </Card>

            {/* Card 2: Roles */}
            <UserRolesCard
              roles={roles}
              isLoading={isRolesLoading}
              selectedRoleIds={selectedRoleIds}
              isFormDisabled={isFormDisabled}
              setValue={setValue}
              t={t}
            />
          </div>
        </div>
      </form>
    </PageShell>
  );
}
