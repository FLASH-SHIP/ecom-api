"use client";

import { DataTablePagination } from "@admin/components/DataTablePagination";
import { ConfirmDialog } from "@admin/components/ui/ConfirmDialog";
import { useConfirm } from "@admin/components/ui/useConfirm";
import { useDebounce } from "@admin/lib/hooks/useDebounce";
import { trpc } from "@admin/lib/trpc";
import { formatDate } from "@admin/utils/dateFormat";
import { Badge } from "@ecom/ui/components/badge";
import { Button } from "@ecom/ui/components/button";
import { Card } from "@ecom/ui/components/card";
import { Input } from "@ecom/ui/components/input";
import { Label } from "@ecom/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ecom/ui/components/select";
import { Skeleton } from "@ecom/ui/components/skeleton";
import { cn } from "@ecom/ui/lib/utils";
import { AlertCircle, Pencil, Plus, Trash2, User, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Fragment, useState } from "react";

const STATUS_KEYS = ["ALL", "ACTIVE", "SUSPENDED", "BANNED"] as const;

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: "border-emerald-200 bg-emerald-100 text-emerald-800",
  SUSPENDED: "border-amber-200 bg-amber-100 text-amber-800",
  BANNED: "border-red-200 bg-red-100 text-red-800",
};

export default function SystemUsersPage() {
  const t = useTranslations("users");
  const { askConfirm, dialogProps: confirmDialogProps } = useConfirm();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);

  const debouncedSearch = useDebounce(search, 300);

  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRoleIds, setNewRoleIds] = useState<string[]>([]);

  const [changePwdUserId, setChangePwdUserId] = useState<number | null>(null);
  const [newPwd, setNewPwd] = useState("");

  const { data, isLoading } = trpc.viewer.users.list.useQuery({
    search: debouncedSearch || undefined,
    status: (statusFilter as "ACTIVE" | "SUSPENDED" | "BANNED") || undefined,
    page,
    perPage: 20,
  });

  const { data: roles } = trpc.viewer.roles.list.useQuery();
  const { data: editUser } = trpc.viewer.users.get.useQuery(
    // biome-ignore lint/style/noNonNullAssertion: tRPC enabled-guard — query disabled when editingUserId is null
    { id: editingUserId! },
    { enabled: !!editingUserId },
  );

  const utils = trpc.useUtils();

  const createMutation = trpc.viewer.users.create.useMutation({
    onSuccess: () => {
      utils.viewer.users.list.invalidate();
      resetCreateForm();
    },
  });

  const deleteMutation = trpc.viewer.users.remove.useMutation({
    onSuccess: () => {
      utils.viewer.users.list.invalidate();
      setEditingUserId(null);
    },
  });

  const syncRolesMutation = trpc.viewer.users.syncRoles.useMutation({
    onSuccess: () => {
      utils.viewer.users.list.invalidate();
      utils.viewer.users.get.invalidate();
    },
  });

  const updateMutation = trpc.viewer.users.update.useMutation({
    onSuccess: () => {
      utils.viewer.users.list.invalidate();
      utils.viewer.users.get.invalidate();
    },
  });

  const changePasswordMutation = trpc.viewer.users.changePassword.useMutation({
    onSuccess: () => {
      setChangePwdUserId(null);
      setNewPwd("");
    },
  });

  function resetCreateForm() {
    setShowCreate(false);
    setNewEmail("");
    setNewName("");
    setNewPassword("");
    setNewRoleIds([]);
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail.trim() || !newPassword.trim()) return;
    createMutation.mutate({
      email: newEmail.trim(),
      name: newName.trim() || undefined,
      password: newPassword,
      roleIds: newRoleIds.length > 0 ? newRoleIds : undefined,
    });
  }

  function toggleUserRole(userId: number, roleId: string, currentRoleIds: string[]) {
    const newIds = currentRoleIds.includes(roleId)
      ? currentRoleIds.filter((id) => id !== roleId)
      : [...currentRoleIds, roleId];
    syncRolesMutation.mutate({ userId, roleIds: newIds });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{t("title")}</h1>
          <div className="mt-1 flex items-center gap-2">
            <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
            {data?.meta && (
              <Badge variant="outline" className="text-xs">
                {t("accountsCount", { count: data.meta.total })}
              </Badge>
            )}
          </div>
        </div>
        <Button
          variant={showCreate ? "outline" : "default"}
          onClick={() => setShowCreate(!showCreate)}
        >
          {showCreate ? <X className="mr-2 size-4" /> : <Plus className="mr-2 size-4" />}
          {showCreate ? t("actions.close") : t("addUser")}
        </Button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <Card className="p-6">
          <p className="mb-4 font-semibold">{t("newUser")}</p>
          <form onSubmit={handleCreate}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="user-email">Email *</Label>
                <Input
                  id="user-email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="user-name">{t("fields.fullName")}</Label>
                <Input
                  id="user-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="user-password">{t("fields.password")}</Label>
                <Input
                  id="user-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {roles?.map((role) => (
                  <button
                    key={role.id}
                    type="button"
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
                      newRoleIds.includes(role.id)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:bg-muted",
                    )}
                    onClick={() => {
                      setNewRoleIds((prev) =>
                        prev.includes(role.id)
                          ? prev.filter((id) => id !== role.id)
                          : [...prev, role.id],
                      );
                    }}
                  >
                    {role.displayName ?? role.name}
                  </button>
                ))}
              </div>
            </div>
            {createMutation.error && (
              <div className="mt-3 flex items-center gap-2 rounded-md border border-destructive/30 bg-red-50 px-4 py-3 text-sm text-destructive dark:bg-red-950">
                <AlertCircle className="size-4 shrink-0" />
                {createMutation.error.message}
              </div>
            )}
            <Button
              type="submit"
              size="sm"
              disabled={createMutation.isPending || !newEmail.trim() || !newPassword.trim()}
              className="mt-4"
            >
              {createMutation.isPending ? t("creating") : t("createUser")}
            </Button>
          </form>
        </Card>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Input
          id="users-search"
          placeholder={t("searchPlaceholder")}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-full sm:w-[300px]"
        />
        <Select
          value={statusFilter || "ALL"}
          onValueChange={(v) => {
            setStatusFilter(v === "ALL" ? "" : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={t("statusFilter")} />
          </SelectTrigger>
          <SelectContent>
            {STATUS_KEYS.map((key) => (
              <SelectItem key={key} value={key}>
                {key === "ALL" ? t("allStatuses") : t(`status.${key}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  {t("title")}
                </th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground sm:table-cell">
                  {t("fields.role")}
                </th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell">
                  {t("fields.status")}
                </th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground lg:table-cell">
                  {t("fields.lastLogin")}
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  {t("fields.actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: skeleton loading array — items have no stable IDs
                  <tr key={i} className="border-b border-border">
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-[200px]" />
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <Skeleton className="h-4 w-[100px]" />
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <Skeleton className="h-4 w-[80px]" />
                    </td>
                    <td className="hidden px-4 py-3 lg:table-cell">
                      <Skeleton className="h-4 w-[100px]" />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Skeleton className="h-4 w-[80px] ml-auto" />
                    </td>
                  </tr>
                ))
              ) : !data?.data.length ? (
                <tr>
                  <td colSpan={5}>
                    <div className="flex flex-col items-center gap-2 py-8">
                      <User size={48} className="text-muted-foreground/40" />
                      <p className="text-sm text-muted-foreground">{t("noUsersTitle")}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: user table row with inline edit panel, change password, and role assignment — intentionally co-located
                data.data.map((user) => {
                  const userRoleIds = user.roles.map((r) => r.role.id);
                  return (
                    <Fragment key={user.id}>
                      <tr className="border-b border-border hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {user.avatarUrl ? (
                              // biome-ignore lint/performance/noImgElement: dynamic avatar URL
                              <img
                                src={user.avatarUrl}
                                alt={user.name ?? user.email}
                                className="size-8 shrink-0 rounded-full object-cover"
                              />
                            ) : (
                              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                                {(user.name ?? user.email).charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{user.name ?? "—"}</p>
                              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="hidden px-4 py-3 sm:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {user.roles.map((r) => (
                              <span
                                key={r.role.id}
                                className="inline-block rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-xs font-medium text-primary"
                              >
                                {r.role.displayName ?? r.role.name}
                              </span>
                            ))}
                            {user.roles.length === 0 && (
                              <span className="text-xs text-muted-foreground/50">
                                {t("noRole")}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="hidden px-4 py-3 md:table-cell">
                          <span
                            className={cn(
                              "inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium",
                              STATUS_BADGE[user.status] ??
                                "border-neutral-200 bg-neutral-100 text-neutral-600",
                            )}
                          >
                            {user.status ? t(`status.${user.status}`) : user.status}
                          </span>
                        </td>
                        <td className="hidden px-4 py-3 lg:table-cell">
                          <span className="text-sm text-muted-foreground">
                            {formatDate(user.createdAt)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
                              aria-label={
                                editingUserId === user.id ? t("actions.close") : t("actions.edit")
                              }
                              title={
                                editingUserId === user.id ? t("actions.close") : t("actions.edit")
                              }
                              onClick={() =>
                                setEditingUserId(editingUserId === user.id ? null : user.id)
                              }
                            >
                              {editingUserId === user.id ? <X size={16} /> : <Pencil size={16} />}
                            </button>
                            <button
                              type="button"
                              className="rounded-md p-1.5 text-destructive hover:bg-destructive/10"
                              aria-label={t("actions.delete")}
                              title={t("actions.delete")}
                              onClick={() => {
                                askConfirm({
                                  message: t("actions.deleteConfirm", { email: user.email }),
                                  onConfirm: () => deleteMutation.mutate({ id: user.id }),
                                });
                              }}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Inline edit panel */}
                      {editingUserId === user.id && editUser && (
                        <tr key={`edit-${user.id}`}>
                          <td colSpan={5} className="bg-muted/30 px-4 py-3">
                            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                              <div className="flex flex-col gap-1.5">
                                <Label htmlFor={`edit-name-${user.id}`}>
                                  {t("fields.fullName")}
                                </Label>
                                <Input
                                  id={`edit-name-${user.id}`}
                                  defaultValue={editUser.name ?? ""}
                                  onBlur={(e) => {
                                    if (e.target.value !== (editUser.name ?? "")) {
                                      updateMutation.mutate({
                                        id: user.id,
                                        name: e.target.value || undefined,
                                      });
                                    }
                                  }}
                                />
                              </div>
                              <div className="flex flex-col gap-1.5">
                                <Label htmlFor={`edit-username-${user.id}`}>
                                  {t("fields.username")}
                                </Label>
                                <Input
                                  id={`edit-username-${user.id}`}
                                  defaultValue={editUser.username ?? ""}
                                  onBlur={(e) => {
                                    if (e.target.value !== (editUser.username ?? "")) {
                                      updateMutation.mutate({
                                        id: user.id,
                                        username: e.target.value || undefined,
                                      });
                                    }
                                  }}
                                />
                              </div>
                              <div className="flex flex-col gap-1.5">
                                <Label>{t("fields.status")}</Label>
                                <Select
                                  defaultValue={editUser.status}
                                  onValueChange={(v) =>
                                    updateMutation.mutate({
                                      id: user.id,
                                      status: v as "ACTIVE" | "SUSPENDED" | "BANNED",
                                    })
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="ACTIVE">{t("status.ACTIVE")}</SelectItem>
                                    <SelectItem value="SUSPENDED">
                                      {t("status.SUSPENDED")}
                                    </SelectItem>
                                    <SelectItem value="BANNED">{t("status.BANNED")}</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            {/* Change password */}
                            <div className="mb-4">
                              {changePwdUserId === user.id ? (
                                <div className="flex items-center gap-2">
                                  <Input
                                    id={`change-pwd-${user.id}`}
                                    type="password"
                                    placeholder={t("fields.newPasswordLabel")}
                                    value={newPwd}
                                    onChange={(e) => setNewPwd(e.target.value)}
                                    className="w-[280px]"
                                    minLength={8}
                                  />
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      if (newPwd.length >= 8) {
                                        changePasswordMutation.mutate({
                                          userId: user.id,
                                          newPassword: newPwd,
                                        });
                                      }
                                    }}
                                    disabled={newPwd.length < 8 || changePasswordMutation.isPending}
                                  >
                                    {changePasswordMutation.isPending
                                      ? t("actions.saving")
                                      : t("actions.save")}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setChangePwdUserId(null);
                                      setNewPwd("");
                                    }}
                                  >
                                    {t("actions.cancel")}
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setChangePwdUserId(user.id)}
                                >
                                  {t("changePassword")}
                                </Button>
                              )}
                            </div>

                            {/* Role assignment */}
                            <p className="mb-2 text-xs text-muted-foreground">{t("fields.role")}</p>
                            <div className="flex flex-wrap gap-2">
                              {roles?.map((role) => (
                                <button
                                  key={role.id}
                                  type="button"
                                  className={cn(
                                    "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
                                    userRoleIds.includes(role.id)
                                      ? "border-primary bg-primary text-primary-foreground"
                                      : "border-border bg-background text-muted-foreground hover:bg-muted",
                                  )}
                                  onClick={() => toggleUserRole(user.id, role.id, userRoleIds)}
                                >
                                  {role.displayName ?? role.name}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <DataTablePagination
          page={page}
          totalPages={data?.meta.totalPages ?? 1}
          onChange={setPage}
          total={data?.meta.total}
        />
      </Card>
      <ConfirmDialog {...confirmDialogProps} />
    </div>
  );
}
