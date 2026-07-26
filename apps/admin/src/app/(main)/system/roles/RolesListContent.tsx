"use client";

import type { RowAction } from "@admin/components/data-table";
import { DataTable } from "@admin/components/data-table";
import { useRequirePermission } from "@admin/components/layout/PermissionGuard";
import PageBreadcrumb from "@admin/components/PageBreadcrumb";
import { ConfirmDialog } from "@admin/components/ui/ConfirmDialog";
import { useConfirm } from "@admin/components/ui/useConfirm";
import { trpc } from "@admin/lib/trpc";
import { Permissions } from "@ecom/lib/permissions";
import { Badge } from "@ecom/ui/components/badge";
import { Button } from "@ecom/ui/components/button";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Edit, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

type RoleRow = {
  id: number;
  name: string;
  displayName: string | null;
  description: string | null;
  createdAt: string;
  _count?: {
    permissions: number;
    users: number;
  };
};

export default function RolesListContent() {
  const t = useTranslations("roles");
  const { hasPermission: canCreate } = useRequirePermission([Permissions.ROLES_CREATE]);
  const { hasPermission: canUpdate } = useRequirePermission([Permissions.ROLES_UPDATE]);
  const { hasPermission: canDelete } = useRequirePermission([Permissions.ROLES_DELETE]);

  const router = useRouter();
  const { askConfirm, dialogProps: confirmDialogProps } = useConfirm();

  const utils = trpc.useUtils();
  const { data: roles, isLoading, isFetching, refetch } = trpc.viewer.roles.list.useQuery();

  const deleteMutation = trpc.viewer.roles.remove.useMutation({
    onSuccess: () => {
      utils.viewer.roles.list.invalidate();
    },
  });

  const columns: ColumnDef<RoleRow, unknown>[] = useMemo(
    () => [
      {
        accessorKey: "name",
        header: t("fields.name"),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            {canUpdate ? (
              <Link
                href={`/system/roles/edit/${row.original.id}`}
                className="font-medium text-foreground hover:text-primary transition-colors text-sm"
              >
                {row.original.displayName ?? row.original.name}
              </Link>
            ) : (
              <span className="font-medium text-foreground text-sm">
                {row.original.displayName ?? row.original.name}
              </span>
            )}
            {row.original.name === "admin" && (
              <Badge
                variant="outline"
                className="text-[10px] bg-primary/5 text-primary border-primary/20"
              >
                system
              </Badge>
            )}
          </div>
        ),
      },
      {
        accessorKey: "description",
        header: t("fields.description"),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.original.description ?? "—"}</span>
        ),
      },
      {
        id: "permissions",
        header: t("fields.permissionCount"),
        cell: ({ row }) =>
          canUpdate ? (
            <Link href={`/system/roles/edit/${row.original.id}`}>
              <Badge
                variant="secondary"
                className="font-mono text-xs hover:bg-secondary/80 hover:text-primary cursor-pointer transition-colors"
              >
                {row.original._count?.permissions ?? 0} quyền
              </Badge>
            </Link>
          ) : (
            <Badge variant="secondary" className="font-mono text-xs">
              {row.original._count?.permissions ?? 0} quyền
            </Badge>
          ),
      },
      {
        id: "users",
        header: "Người dùng",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original._count?.users ?? 0} thành viên
          </span>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Ngày tạo",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.createdAt
              ? format(new Date(row.original.createdAt), "dd-MM-yyyy HH:mm")
              : "—"}
          </span>
        ),
      },
    ],
    [t, canUpdate],
  );

  const rowActions: RowAction<RoleRow>[] = useMemo(() => {
    const actions: RowAction<RoleRow>[] = [];
    if (canUpdate) {
      actions.push({
        key: "edit",
        tooltip: t("editRole"),
        icon: <Edit size={16} />,
        color: "success",
        onClick: (row) => router.push(`/system/roles/edit/${row.id}`),
      });
    }
    if (canDelete) {
      actions.push({
        key: "delete",
        tooltip: t("deleteRole"),
        icon: <Trash2 size={16} />,
        color: "error",
        hidden: (row) => row.name === "admin",
        onClick: (row) => {
          askConfirm({
            message: t("deleteConfirm", { name: row.displayName ?? row.name }),
            onConfirm: () => {
              deleteMutation.mutate({ id: row.id });
            },
          });
        },
      });
    }
    return actions;
  }, [t, deleteMutation, askConfirm, router, canUpdate, canDelete]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col">
        <PageBreadcrumb className="mb-3" />
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">{t("title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>
          {canCreate && (
            <div className="flex items-center gap-3">
              <Button size="sm" onClick={() => router.push("/system/roles/create")} className="h-9">
                <Plus className="mr-2 size-4" />
                {t("newRole")}
              </Button>
            </div>
          )}
        </div>
      </div>

      <DataTable<RoleRow>
        data={(roles ?? []) as RoleRow[]}
        columns={columns}
        rowActions={rowActions}
        isLoading={isLoading}
        isFetching={isFetching}
        onRefresh={() => refetch()}
      />

      <ConfirmDialog {...confirmDialogProps} />
    </div>
  );
}
