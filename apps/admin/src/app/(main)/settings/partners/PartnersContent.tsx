"use client";

import type { RowAction } from "@admin/components/data-table";
import { DataTable } from "@admin/components/data-table";
import { CopyCell } from "@admin/components/data-table/CopyCell";
import { useServerTable } from "@admin/components/data-table/hooks/useServerTable";
import type { DataTableServerParams, FilterFieldDef } from "@admin/components/data-table/types";
import { useToast } from "@admin/components/toast-provider";
import { ConfirmDialog } from "@admin/components/ui/ConfirmDialog";
import { useConfirm } from "@admin/components/ui/useConfirm";
import { trpc } from "@admin/lib/trpc";
import { PartnerStatus } from "@ecom/types";
import { Badge } from "@ecom/ui/components/badge";
import { Button } from "@ecom/ui/components/button";
import { keepPreviousData } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";

type PartnerRow = {
  id: number;
  code: string;
  name: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  status: PartnerStatus;
  createdAt: string;
};

function toQueryInput(params: DataTableServerParams) {
  const { search, filters, sort, page, pageSize } = params;

  const idFilter = filters.find((f) => f.fieldKey === "id");
  const codeFilter = filters.find((f) => f.fieldKey === "code");
  const nameFilter = filters.find((f) => f.fieldKey === "name");
  const statusFilter = filters.find((f) => f.fieldKey === "status");

  return {
    page,
    perPage: pageSize,
    search: search.trim() || undefined,
    sortBy: sort.direction
      ? (sort.key as "id" | "code" | "name" | "status" | "createdAt" | "updatedAt")
      : "createdAt",
    sortOrder: (sort.direction as "asc" | "desc") || "desc",
    id: idFilter?.value ? Number(idFilter.value) : undefined,
    code: codeFilter?.value || undefined,
    name: nameFilter?.value || undefined,
    status: statusFilter?.value ? (statusFilter.value as PartnerStatus) : undefined,
  };
}

export default function PartnersContent() {
  const t = useTranslations("settings");
  const router = useRouter();
  const { toast } = useToast();
  const { askConfirm, dialogProps: confirmDialogProps } = useConfirm();
  const utils = trpc.useUtils();

  const { queryInput, onServerChange, tableKey, initialState } = useServerTable({
    tableId: "partners-master",
    defaultSort: { key: "createdAt", direction: "desc" },
    defaultPageSize: 25,
    toQueryInput,
  });

  const {
    data: result,
    isLoading,
    isFetching,
  } = trpc.viewer.partners.list.useQuery(queryInput, {
    placeholderData: keepPreviousData,
    retry: false,
  });

  const deleteMut = trpc.viewer.partners.delete.useMutation({
    onSuccess: () => {
      toast(t("partners.toastDeleteSuccess"), "success");
      utils.viewer.partners.list.invalidate();
    },
    onError: (err) => toast(err.message, "error"),
  });

  const openCreate = () => {
    router.push("/settings/partners/new");
  };

  const openEdit = useCallback(
    (id: number) => {
      router.push(`/settings/partners/${id}/edit`);
    },
    [router],
  );

  const columns: ColumnDef<PartnerRow>[] = useMemo(
    () => [
      {
        accessorKey: "id",
        header: "ID",
        size: 60,
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold">{row.original.id}</span>
        ),
      },
      {
        accessorKey: "code",
        header: t("partners.colCode"),
        cell: ({ row }) => (
          <CopyCell value={row.original.code}>
            <button
              type="button"
              className="cursor-pointer font-semibold text-primary hover:underline bg-transparent text-left"
              onClick={() => openEdit(row.original.id)}
            >
              {row.original.code}
            </button>
          </CopyCell>
        ),
      },
      {
        accessorKey: "name",
        header: t("partners.colName"),
        cell: ({ row }) => <span className="font-medium text-foreground">{row.original.name}</span>,
      },
      {
        accessorKey: "contactName",
        header: t("partners.colContactName"),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.original.contactName ?? "—"}</span>
        ),
      },
      {
        accessorKey: "contactEmail",
        header: t("partners.colContactEmail"),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.original.contactEmail ?? "—"}</span>
        ),
      },
      {
        accessorKey: "contactPhone",
        header: t("partners.colContactPhone"),
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">{row.original.contactPhone ?? "—"}</span>
        ),
      },
      {
        accessorKey: "status",
        header: t("partners.colStatus"),
        size: 100,
        cell: ({ row }) => {
          const isActive = row.original.status === PartnerStatus.ACTIVE;
          return (
            <Badge variant={isActive ? "default" : "outline"}>
              {isActive ? t("partners.statusActive") : t("partners.statusInactive")}
            </Badge>
          );
        },
      },
    ],
    [openEdit, t],
  );

  const rowActions: RowAction<PartnerRow>[] = useMemo(
    () => [
      {
        key: "edit",
        tooltip: t("partners.actionEdit"),
        icon: <Pencil size={15} />,
        color: "success",
        onClick: (row) => openEdit(row.id),
      },
      {
        key: "delete",
        tooltip: t("partners.actionDelete"),
        icon: <Trash2 size={15} />,
        color: "error",
        onClick: (row) => {
          askConfirm({
            message: t("partners.confirmDelete", { code: row.code }),
            onConfirm: () => deleteMut.mutate({ id: row.id }),
          });
        },
      },
    ],
    [openEdit, askConfirm, deleteMut, t],
  );

  const filterFields: FilterFieldDef[] = useMemo(
    () => [
      {
        key: "id",
        label: "ID",
        type: "number",
        operators: [{ value: "equals", label: "equals" }],
      },
      {
        key: "code",
        label: t("partners.lblCode"),
        type: "text",
        operators: [
          { value: "equals", label: "equals" },
          { value: "contains", label: "contains" },
        ],
      },
      {
        key: "name",
        label: t("partners.lblName"),
        type: "text",
        operators: [
          { value: "equals", label: "equals" },
          { value: "contains", label: "contains" },
        ],
      },
      {
        key: "status",
        label: t("partners.lblStatus"),
        type: "select",
        operators: [{ value: "equals", label: "equals" }],
        options: [
          { value: "ACTIVE", label: t("partners.statusActive") },
          { value: "INACTIVE", label: t("partners.statusInactive") },
        ],
      },
    ],
    [t],
  );

  const rows: PartnerRow[] = useMemo(() => {
    if (!result?.data) return [];
    return result.data.map((item) => ({
      id: item.id,
      code: item.code,
      name: item.name,
      contactName: item.contactName,
      contactEmail: item.contactEmail,
      contactPhone: item.contactPhone,
      status: item.status,
      createdAt: new Date(item.createdAt).toISOString(),
    }));
  }, [result]);

  return (
    <>
      <DataTable<PartnerRow>
        tableKey={tableKey}
        defaultPageSize={initialState.pageSize}
        defaultPage={initialState.page}
        data={rows}
        columns={columns}
        rowActions={rowActions}
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
        rowCount={result?.meta?.total ?? 0}
        pageTitle={t("partners.listTitle")}
        filterFields={filterFields}
        onRefresh={() => utils.viewer.partners.list.invalidate()}
        headerActions={
          <Button size="sm" className="bg-primary" onClick={openCreate}>
            <Plus className="mr-1.5 size-4" />
            {t("partners.btnAddPartner")}
          </Button>
        }
        emptyState={
          <div className="py-12 text-center">
            <p className="mb-2 font-medium text-muted-foreground">
              {t("partners.noPartnersFound")}
            </p>
            <p className="mb-6 text-sm text-muted-foreground/60">
              {t("partners.noPartnersFoundDesc")}
            </p>
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-1.5 size-4" />
              {t("partners.btnAddPartner")}
            </Button>
          </div>
        }
      />

      <ConfirmDialog {...confirmDialogProps} />
    </>
  );
}
