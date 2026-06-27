"use client";

import type { BulkActionConfig, RowAction } from "@admin/components/data-table";
import { DataTable } from "@admin/components/data-table";
import { CopyCell } from "@admin/components/data-table/CopyCell";
import { useServerTable } from "@admin/components/data-table/hooks/useServerTable";
import type { DataTableServerParams, FilterFieldDef } from "@admin/components/data-table/types";
import Error403Page from "@admin/components/errors/Error403Page";
import { useToast } from "@admin/components/toast-provider";
import { ConfirmDialog } from "@admin/components/ui/ConfirmDialog";
import { useConfirm } from "@admin/components/ui/useConfirm";
import { trpc } from "@admin/lib/trpc";
import { formatDate } from "@admin/utils/dateFormat";
import { Permissions } from "@ecom/lib/permissions";
import { Badge } from "@ecom/ui/components/badge";
import { Button } from "@ecom/ui/components/button";
import { Checkbox } from "@ecom/ui/components/checkbox";
import { Input } from "@ecom/ui/components/input";
import { Popover, PopoverContent, PopoverTrigger } from "@ecom/ui/components/popover";
import { cn } from "@ecom/ui/lib/utils";
import { keepPreviousData } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import {
  AlertCircle,
  Edit2,
  Key,
  Loader2,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";

type UserRole = {
  role: {
    id: string;
    name: string;
    displayName: string | null;
  };
};

type UserRow = {
  id: number;
  email: string;
  username: string | null;
  name: string | null;
  phone: string | null;
  status: string;
  createdAt: string;
  avatarUrl: string | null;
  roles: UserRole[];
};

const STATUS_BADGE_CONFIG: Record<string, string> = {
  ACTIVE: "bg-emerald-500 text-white",
  SUSPENDED: "bg-amber-500 text-white",
  BANNED: "bg-red-500 text-white",
};

function toQueryInput(params: DataTableServerParams) {
  const { search, filters, page, pageSize } = params;

  // Extract status filter from standard filters array
  const statusFilter = filters.find((f) => f.fieldKey === "status");
  const status = statusFilter?.value as "ACTIVE" | "SUSPENDED" | "BANNED" | undefined;

  return {
    page,
    perPage: pageSize,
    search: search.trim() || undefined,
    status: status || undefined,
  };
}

export default function SystemUsersPage() {
  const t = useTranslations("users");
  const tCommon = useTranslations("common");
  const { toast } = useToast();
  const router = useRouter();
  const { askConfirm, dialogProps: confirmDialogProps } = useConfirm();
  const isBulkRef = useRef(false);

  const { queryInput, onServerChange, tableKey, initialState } = useServerTable({
    tableId: "system-users",
    defaultSort: { key: "createdAt", direction: "desc" },
    defaultPageSize: 25,
    toQueryInput,
  });

  const utils = trpc.useUtils();

  // Queries
  const { data: me } = trpc.viewer.auth.me.useQuery(undefined, {
    staleTime: 30_000,
  });

  const { data: allRoles } = trpc.viewer.roles.list.useQuery(undefined, {
    staleTime: 300_000,
  });

  const {
    data,
    isLoading,
    isFetching,
    error: listError,
    refetch,
  } = trpc.viewer.users.list.useQuery(queryInput, {
    placeholderData: keepPreviousData,
    retry: false,
  });

  // Mutations
  const deleteMut = trpc.viewer.users.remove.useMutation({
    onSuccess: () => {
      utils.viewer.users.list.invalidate();
      if (!isBulkRef.current) {
        toast(tCommon("success") ?? "Deleted successfully", "success");
      }
    },
    onError: (err) => {
      if (!isBulkRef.current) {
        toast(err.message, "error");
      }
    },
  });

  const toggleSuperAdminMut = trpc.viewer.users.toggleSuperAdmin.useMutation({
    onSuccess: () => {
      utils.viewer.users.list.invalidate();
      toast(tCommon("success") ?? "Updated successfully", "success");
    },
    onError: (err) => {
      toast(err.message, "error");
    },
  });

  const rows = (data?.data ?? []) as UserRow[];
  const serverTotalCount = data?.meta.total ?? 0;

  // Permissions
  const canCreate = me?.permissions.includes(Permissions.USERS_CREATE) ?? false;
  const canUpdate = me?.permissions.includes(Permissions.USERS_UPDATE) ?? false;
  const canDelete = me?.permissions.includes(Permissions.USERS_DELETE) ?? false;

  // Column definitions
  const columns: ColumnDef<UserRow, unknown>[] = useMemo(
    () => [
      {
        accessorKey: "id",
        header: "ID",
        size: 60,
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.id}</span>,
      },
      {
        accessorKey: "name",
        header: t("fields.fullName"),
        size: 250,
        minSize: 200,
        cell: ({ row }) => {
          const u = row.original;
          return (
            <div className="flex items-center gap-3">
              {u.avatarUrl ? (
                // biome-ignore lint/performance/noImgElement: user avatar display
                <img
                  src={u.avatarUrl}
                  alt={u.name ?? u.email}
                  className="size-8 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                  {(u.name ?? u.email).charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <button
                  type="button"
                  className="cursor-pointer bg-transparent p-0 text-left text-sm font-medium text-foreground hover:text-primary whitespace-nowrap"
                  onClick={() => router.push(`/system/users/profile/${u.id}`)}
                >
                  {u.name || "—"}
                </button>
                <p className="truncate text-xs text-muted-foreground">{u.email}</p>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "username",
        header: t("fields.username"),
        size: 150,
        cell: ({ row }) => {
          const username = row.original.username;
          if (!username) return <span className="text-sm text-muted-foreground">—</span>;
          return (
            <CopyCell value={username}>
              <span className="text-sm text-muted-foreground">@{username}</span>
            </CopyCell>
          );
        },
      },
      {
        accessorKey: "phone",
        header: t("fields.phone"),
        size: 150,
        cell: ({ row }) => {
          const phone = row.original.phone;
          if (!phone) return <span className="text-sm text-muted-foreground">—</span>;
          return (
            <CopyCell value={phone}>
              <span className="text-sm text-muted-foreground">{phone}</span>
            </CopyCell>
          );
        },
      },
      {
        accessorKey: "roles",
        header: t("fields.role"),
        size: 200,
        cell: ({ row }) => (
          <UserRolesPopoverCell
            user={row.original}
            allRoles={allRoles}
            canUpdate={canUpdate}
            t={t}
          />
        ),
      },
      {
        id: "isSuperAdmin",
        header: t("isSuperAdmin"),
        size: 130,
        cell: ({ row }) => {
          const isSuper = row.original.roles?.some((r) => r.role.name === "admin");
          return (
            <span
              className={cn(
                "inline-block rounded-full px-2.5 py-0.5 text-center text-xs font-semibold",
                isSuper
                  ? "bg-emerald-500 text-white"
                  : "bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
              )}
            >
              {isSuper ? (tCommon("yes") ?? "Có") : (tCommon("no") ?? "Không")}
            </span>
          );
        },
      },
      {
        accessorKey: "status",
        header: t("fields.status"),
        size: 130,
        cell: ({ row }) => {
          const status = row.original.status;
          const colorClass = STATUS_BADGE_CONFIG[status] ?? "bg-neutral-400 text-white";
          return (
            <span
              className={cn(
                "inline-block min-w-[85px] rounded-full px-2.5 py-0.5 text-center text-xs font-semibold",
                colorClass,
              )}
            >
              {t(`status.${status}`)}
            </span>
          );
        },
      },
      {
        accessorKey: "createdAt",
        header: tCommon("createdAt"),
        size: 150,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {formatDate(row.original.createdAt)}
          </span>
        ),
      },
    ],
    [t, tCommon, router, allRoles, canUpdate],
  );

  // Filter fields (Botble-style)
  const filterFields: FilterFieldDef[] = useMemo(
    () => [
      {
        key: "status",
        label: t("fields.status"),
        type: "select",
        operators: [{ value: "equals", label: "equals" }],
        options: [
          { value: "ACTIVE", label: t("status.ACTIVE") },
          { value: "SUSPENDED", label: t("status.SUSPENDED") },
          { value: "BANNED", label: t("status.BANNED") },
        ],
      },
    ],
    [t],
  );

  // Row actions (inline menus)
  const rowActions: RowAction<UserRow>[] = useMemo(
    () => [
      {
        key: "toggle-super",
        tooltip: t("actions.grantSuperAdmin"),
        icon: <Key size={16} />,
        color: "warning",
        hidden: (row) => row.id === me?.id || !canUpdate,
        disabled: () => toggleSuperAdminMut.isPending,
        onClick: (row) => {
          const isSuper = row.roles?.some((r) => r.role.name === "admin");
          const msg = t("confirmToggleSuperAdmin");
          askConfirm({
            message: msg,
            onConfirm: () => {
              toggleSuperAdminMut.mutate({
                userId: row.id,
                isSuperAdmin: !isSuper,
              });
            },
          });
        },
      },
      {
        key: "edit",
        tooltip: tCommon("edit"),
        icon: <Pencil size={16} />,
        color: "primary",
        hidden: () => !canUpdate,
        onClick: (row) => router.push(`/system/users/profile/${row.id}`),
      },
      {
        key: "delete",
        tooltip: tCommon("delete"),
        icon: <Trash2 size={16} />,
        color: "error",
        hidden: (row) => row.id === me?.id || !canDelete,
        onClick: (row) => {
          askConfirm({
            message: t("actions.deleteConfirm", { email: row.email }),
            onConfirm: () => deleteMut.mutate({ id: row.id }),
          });
        },
      },
    ],
    [t, tCommon, askConfirm, deleteMut, toggleSuperAdminMut, me, canUpdate, canDelete, router],
  );

  // Dynamic tooltip for toggle-super based on user status
  const rowActionsWithDynamicTooltips = useMemo(() => {
    return rowActions.map((action) => {
      if (action.key === "toggle-super") {
        return {
          ...action,
          tooltip: (row: UserRow) => {
            const isSuper = row.roles?.some((r) => r.role.name === "admin");
            return isSuper ? t("actions.revokeSuperAdmin") : t("actions.grantSuperAdmin");
          },
        };
      }
      return action;
    });
  }, [rowActions, t]);

  // Bulk actions
  const bulkActionConfig: BulkActionConfig<UserRow> = useMemo(
    () => ({
      onBulkDelete: canDelete
        ? (selected, clearSelection) => {
            askConfirm({
              message:
                tCommon("confirmDeleteMultiple") ??
                "Are you sure you want to delete selected users?",
              onConfirm: async () => {
                isBulkRef.current = true;
                try {
                  const filtered = selected.filter((u) => u.id !== me?.id);
                  await Promise.all(filtered.map((u) => deleteMut.mutateAsync({ id: u.id })));
                  toast(tCommon("success") ?? "Deleted", "success");
                  clearSelection();
                } catch {
                  toast(tCommon("error") ?? "Error occurred", "error");
                } finally {
                  isBulkRef.current = false;
                }
              },
            });
          }
        : undefined,
    }),
    [deleteMut, tCommon, askConfirm, toast, me, canDelete],
  );

  if (listError?.data?.code === "FORBIDDEN") {
    return <Error403Page />;
  }

  return (
    <>
      {listError && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-destructive/30 bg-red-50 px-4 py-3 text-sm text-destructive dark:bg-red-950">
          <AlertCircle className="size-4 shrink-0" />
          {listError.message}
        </div>
      )}

      <DataTable<UserRow>
        tableKey={tableKey}
        defaultPageSize={initialState.pageSize}
        defaultPage={initialState.page}
        data={rows}
        columns={columns}
        rowActions={rowActionsWithDynamicTooltips}
        bulkActionConfig={bulkActionConfig}
        filterFields={filterFields}
        isLoading={isLoading}
        isFetching={isFetching}
        onServerChange={(params) =>
          onServerChange({
            search: params.search,
            filters: params.filters,
            sort: params.sort,
            page: params.page,
            pageSize: params.pageSize,
          })
        }
        rowCount={serverTotalCount}
        pageTitle={t("title")}
        onRefresh={() => refetch()}
        headerActions={
          canCreate ? (
            <Button id="create-user" size="sm" onClick={() => router.push("/system/users/create")}>
              <Plus className="mr-2 size-4" />
              {t("addUser")}
            </Button>
          ) : undefined
        }
        emptyState={
          <div className="py-8 text-center">
            <Users size={48} className="mx-auto mb-3 text-muted-foreground/40" />
            <p className="mb-1 text-muted-foreground">{t("noUsersTitle")}</p>
            {canCreate && (
              <Button
                id="create-user-empty"
                size="sm"
                className="mt-4"
                onClick={() => router.push("/system/users/create")}
              >
                <Plus className="mr-2 size-4" />
                {t("addUser")}
              </Button>
            )}
          </div>
        }
      />

      <ConfirmDialog {...confirmDialogProps} />
    </>
  );
}

interface UserRolesPopoverCellProps {
  user: UserRow;
  allRoles: Array<{ id?: string; name?: string; displayName?: string | null }> | undefined;
  canUpdate: boolean;
  t: (key: string) => string;
}

function UserRolesPopoverCell({ user, allRoles, canUpdate, t }: UserRolesPopoverCellProps) {
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const utils = trpc.useUtils();
  const { toast } = useToast();

  const userRoles = user.roles ?? [];

  const filteredRoles = useMemo(() => {
    if (!allRoles) return [];
    const q = searchQuery.toLowerCase().trim();
    if (!q) return allRoles;
    return allRoles.filter((role) => {
      const name = role.name?.toLowerCase() ?? "";
      const displayName = role.displayName?.toLowerCase() ?? "";
      return name.includes(q) || displayName.includes(q);
    });
  }, [allRoles, searchQuery]);

  // Sync state when popover opens or user roles change
  useEffect(() => {
    if (open) {
      setSelectedIds((user.roles ?? []).map((ur) => ur.role.id));
    } else {
      setSearchQuery("");
    }
  }, [open, user.roles]);

  const syncRolesMut = trpc.viewer.users.syncRoles.useMutation({
    onSuccess: () => {
      toast(t("rolesUpdated") || "Roles updated successfully!", "success");
      setOpen(false);
      void utils.viewer.users.list.invalidate();
    },
    onError: (err) => {
      toast(err.message, "error");
    },
  });

  const handleToggle = (roleId: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, roleId]);
    } else {
      setSelectedIds((prev) => prev.filter((id) => id !== roleId));
    }
  };

  const handleSave = () => {
    syncRolesMut.mutate({
      userId: user.id,
      roleIds: selectedIds,
    });
  };

  if (!canUpdate) {
    return (
      <div className="flex flex-wrap gap-1">
        {userRoles.map((ur) => (
          <Badge key={ur.role.id} variant="outline" className="text-xs">
            {ur.role.displayName ?? ur.role.name}
          </Badge>
        ))}
        {userRoles.length === 0 && (
          <span className="text-xs text-muted-foreground/50">{t("noRole")}</span>
        )}
      </div>
    );
  }

  const isPending = syncRolesMut.isPending;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="group flex flex-wrap gap-1 items-center cursor-pointer p-0.5 hover:bg-accent/40 rounded transition-all text-left w-full border border-dashed border-transparent hover:border-border min-h-6"
        >
          {userRoles.map((ur) => (
            <Badge
              key={ur.role.id}
              variant="outline"
              className="text-xs border-primary/20 bg-primary/5 text-primary group-hover:border-primary/45"
            >
              {ur.role.displayName ?? ur.role.name}
            </Badge>
          ))}
          {userRoles.length === 0 && (
            <span className="text-xs text-blue-600 dark:text-blue-400 underline decoration-dotted decoration-blue-600/40 hover:decoration-blue-600 px-1 py-0.5">
              {t("assignRoles") || "Gán vai trò"}
            </span>
          )}
          {userRoles.length > 0 && (
            <Edit2 className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="space-y-3">
          <div className="font-semibold text-sm border-b pb-1.5 border-border">
            {t("assignRoles") || "Thay đổi vai trò"}
          </div>
          {allRoles && allRoles.length > 5 && (
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
              <Input
                placeholder={t("searchRoles") || "Tìm kiếm vai trò..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs bg-muted/30 focus:bg-background border-border"
              />
            </div>
          )}
          <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
            {filteredRoles.map((role) => {
              if (!role.id) return null;
              const isChecked = selectedIds.includes(role.id);
              return (
                <div key={role.id} className="flex items-center space-x-2.5 py-0.5">
                  <Checkbox
                    id={`popover-role-${user.id}-${role.id}`}
                    checked={isChecked}
                    onCheckedChange={(checked) => handleToggle(role.id, !!checked)}
                    disabled={isPending}
                  />
                  <label
                    htmlFor={`popover-role-${user.id}-${role.id}`}
                    className="text-sm font-medium leading-none cursor-pointer select-none text-foreground"
                  >
                    {role.displayName ?? role.name}
                  </label>
                </div>
              );
            })}
            {filteredRoles.length === 0 && (
              <div className="text-xs text-muted-foreground text-center py-2">{t("noRole")}</div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={isPending}
              className="h-7 px-2.5 text-xs rounded-md"
            >
              Huỷ
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isPending}
              className="h-7 px-2.5 text-xs rounded-md"
            >
              {isPending ? (
                <Loader2 className="size-3 animate-spin mr-1" />
              ) : (
                <Save className="size-3 mr-1" />
              )}
              Lưu
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
