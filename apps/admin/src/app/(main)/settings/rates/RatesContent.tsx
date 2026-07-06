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
import { formatDate } from "@admin/utils/dateFormat";
import type { ContentStatus, ShippingMethod } from "@ecom/prisma";
import { Badge } from "@ecom/ui/components/badge";
import { Button } from "@ecom/ui/components/button";
import { keepPreviousData } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";

type RateCardRow = {
  id: number;
  code: string;
  name: string;
  status: ContentStatus;
  shippingMethod: ShippingMethod;
  country: string;
  origin: string | null;
  currency: string;
  weightStep: number;
  minWeight: number;
  maxWeight: number;
  startDate: string | null;
  endDate: string | null;
  groups: string[];
  createdAt: string;
};

function toQueryInput(params: DataTableServerParams) {
  const { search, filters, sort, page, pageSize } = params;

  const idFilter = filters.find((f) => f.fieldKey === "id");
  const codeFilter = filters.find((f) => f.fieldKey === "code");
  const statusFilter = filters.find((f) => f.fieldKey === "status");
  const shippingMethodFilter = filters.find((f) => f.fieldKey === "shippingMethod");
  const originFilter = filters.find((f) => f.fieldKey === "origin");
  const countryFilter = filters.find((f) => f.fieldKey === "country");
  const nameFilter = filters.find((f) => f.fieldKey === "name");
  const startDateFilter = filters.find((f) => f.fieldKey === "startDate");
  const endDateFilter = filters.find((f) => f.fieldKey === "endDate");
  const groupsFilter = filters.find((f) => f.fieldKey === "groups");

  return {
    page,
    perPage: pageSize,
    search: search.trim() || undefined,
    sortBy: sort.direction
      ? (sort.key as
          | "id"
          | "code"
          | "name"
          | "status"
          | "createdAt"
          | "updatedAt"
          | "startDate"
          | "endDate")
      : "createdAt",
    sortOrder: (sort.direction as "asc" | "desc") || "desc",
    id: idFilter?.value ? Number(idFilter.value) : undefined,
    code: codeFilter?.value || undefined,
    status: statusFilter?.value ? (statusFilter.value as ContentStatus) : undefined,
    shippingMethod: shippingMethodFilter?.value
      ? (shippingMethodFilter.value as ShippingMethod)
      : undefined,
    origin: originFilter?.value || undefined,
    country: countryFilter?.value || undefined,
    name: nameFilter?.value || undefined,
    startDate: startDateFilter?.value ? new Date(startDateFilter.value) : undefined,
    endDate: endDateFilter?.value ? new Date(endDateFilter.value) : undefined,
    customerGroupId: groupsFilter?.value ? Number(groupsFilter.value) : undefined,
  };
}

export default function RatesContent() {
  const t = useTranslations("settings");
  const router = useRouter();
  const { toast } = useToast();
  const { askConfirm, dialogProps: confirmDialogProps } = useConfirm();
  const utils = trpc.useUtils();

  const { queryInput, onServerChange, tableKey, initialState } = useServerTable({
    tableId: "rate-cards",
    defaultSort: { key: "createdAt", direction: "desc" },
    defaultPageSize: 25,
    toQueryInput,
  });

  // Queries
  const {
    data: result,
    isLoading,
    isFetching,
  } = trpc.viewer.rateCards.list.useQuery(queryInput, {
    placeholderData: keepPreviousData,
    retry: false,
  });

  // Load customer groups for filter options
  const { data: groupsData } = trpc.viewer.customerGroups.listAll.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });

  const customerGroupOptions = useMemo(() => {
    if (!groupsData) return [];
    return groupsData.map((g) => ({
      value: String(g.id),
      label: g.name,
    }));
  }, [groupsData]);

  const deleteMut = trpc.viewer.rateCards.delete.useMutation({
    onSuccess: () => {
      toast(t("rates.toastDeleteSuccess"), "success");
      utils.viewer.rateCards.list.invalidate();
    },
    onError: (err) => toast(err.message, "error"),
  });

  const duplicateMut = trpc.viewer.rateCards.duplicate.useMutation({
    onSuccess: (newCard) => {
      toast(t("rates.toastDuplicateSuccess", { code: newCard.code }), "success");
      utils.viewer.rateCards.list.invalidate();
    },
    onError: (err) => toast(err.message, "error"),
  });

  const openCreate = () => {
    router.push("/settings/rates/new");
  };

  const openEdit = useCallback(
    (id: number) => {
      router.push(`/settings/rates/${id}/edit`);
    },
    [router],
  );

  // Columns layout
  const columns: ColumnDef<RateCardRow>[] = useMemo(
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
        header: t("rates.colCode"),
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
        header: t("rates.colName"),
        cell: ({ row }) => <span className="font-medium text-foreground">{row.original.name}</span>,
      },
      {
        accessorKey: "shippingMethod",
        header: t("rates.colShippingMethod"),
        size: 100,
        enableSorting: false,
        cell: ({ row }) => (
          <Badge variant={row.original.shippingMethod === "EXPRESS" ? "default" : "secondary"}>
            {row.original.shippingMethod}
          </Badge>
        ),
      },
      {
        accessorKey: "groups",
        header: t("rates.colCustomerGroups"),
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1 max-w-[180px]">
            {row.original.groups.length > 0 ? (
              row.original.groups.map((g) => (
                <Badge key={g} variant="outline" className="text-[11px] bg-muted/30">
                  {g}
                </Badge>
              ))
            ) : (
              <span className="text-xs text-muted-foreground italic">{t("rates.allOrigins")}</span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "startDate",
        header: t("rates.colStartDate"),
        size: 130,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.startDate ? formatDate(row.original.startDate) : "∞"}
          </span>
        ),
      },
      {
        accessorKey: "endDate",
        header: t("rates.colEndDate"),
        size: 130,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.endDate ? formatDate(row.original.endDate) : "∞"}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: t("rates.colStatus"),
        size: 100,
        cell: ({ row }) => {
          const s = row.original.status;
          let label: string = s;
          let variant: "default" | "secondary" | "destructive" | "outline" = "outline";
          if (s === "PUBLISHED") {
            variant = "default";
            label = t("rates.statusPublished");
          } else if (s === "DRAFT") {
            label = t("rates.statusDraft");
          } else if (s === "ARCHIVED") {
            variant = "destructive";
            label = t("rates.statusArchived");
          }
          return <Badge variant={variant}>{label}</Badge>;
        },
      },
    ],
    [openEdit, t],
  );

  const rowActions: RowAction<RateCardRow>[] = useMemo(
    () => [
      {
        key: "edit",
        tooltip: t("rates.actionEdit"),
        icon: <Pencil size={15} />,
        color: "success",
        onClick: (row) => openEdit(row.id),
      },
      {
        key: "duplicate",
        tooltip: t("rates.actionDuplicate"),
        icon: <Copy size={15} />,
        color: "info",
        onClick: (row) => {
          askConfirm({
            title: t("rates.actionDuplicate"),
            confirmLabel: t("rates.actionDuplicate"),
            confirmColor: "primary",
            message: t("rates.confirmDuplicate", { code: row.code }),
            onConfirm: () => duplicateMut.mutate({ id: row.id }),
          });
        },
      },
      {
        key: "delete",
        tooltip: t("rates.actionDelete"),
        icon: <Trash2 size={15} />,
        color: "error",
        onClick: (row) => {
          askConfirm({
            message: t("rates.confirmDelete", { code: row.code }),
            onConfirm: () => deleteMut.mutate({ id: row.id }),
          });
        },
      },
    ],
    [openEdit, askConfirm, deleteMut, duplicateMut, t],
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
        label: t("rates.lblCode"),
        type: "text",
        operators: [
          { value: "equals", label: "equals" },
          { value: "contains", label: "contains" },
        ],
      },
      {
        key: "name",
        label: t("rates.lblName"),
        type: "text",
        operators: [
          { value: "equals", label: "equals" },
          { value: "contains", label: "contains" },
        ],
      },
      {
        key: "shippingMethod",
        label: t("rates.lblShippingMethod"),
        type: "select",
        operators: [{ value: "equals", label: "equals" }],
        options: [
          { value: "EXPRESS", label: "EXPRESS" },
          { value: "EPACKET", label: "EPACKET" },
        ],
      },
      {
        key: "startDate",
        label: t("rates.lblStartDate"),
        type: "date",
        operators: [
          { value: "greaterThanOrEqual", label: "sau hoặc bằng" },
          { value: "lessThanOrEqual", label: "trước hoặc bằng" },
        ],
      },
      {
        key: "endDate",
        label: t("rates.lblEndDate"),
        type: "date",
        operators: [
          { value: "greaterThanOrEqual", label: "sau hoặc bằng" },
          { value: "lessThanOrEqual", label: "trước hoặc bằng" },
        ],
      },
      {
        key: "groups",
        label: t("rates.colCustomerGroups"),
        type: "select",
        operators: [{ value: "equals", label: "equals" }],
        options: customerGroupOptions,
      },
      {
        key: "status",
        label: t("rates.lblStatus"),
        type: "select",
        operators: [{ value: "equals", label: "equals" }],
        options: [
          { value: "DRAFT", label: "DRAFT" },
          { value: "PUBLISHED", label: "PUBLISHED" },
          { value: "ARCHIVED", label: "ARCHIVED" },
        ],
      },
    ],
    [customerGroupOptions, t],
  );

  const rows: RateCardRow[] = useMemo(() => {
    if (!result?.data) return [];
    return result.data.map((item) => ({
      id: item.id,
      code: item.code,
      name: item.name,
      status: item.status,
      shippingMethod: item.shippingMethod,
      country: item.country,
      origin: item.origin,
      currency: item.currency,
      weightStep: Number(item.weightStep),
      minWeight: Number(item.minWeight),
      maxWeight: Number(item.maxWeight),
      startDate: item.startDate ? new Date(item.startDate).toISOString() : null,
      endDate: item.endDate ? new Date(item.endDate).toISOString() : null,
      groups: item.groups.map((g) => g.customerGroup.code),
      createdAt: new Date(item.createdAt).toISOString(),
    }));
  }, [result]);

  return (
    <>
      {/* Main Grid Table */}
      <DataTable<RateCardRow>
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
        pageTitle={t("rates.listTitle")}
        filterFields={filterFields}
        onRefresh={() => utils.viewer.rateCards.list.invalidate()}
        headerActions={
          <Button size="sm" className="bg-primary" onClick={openCreate}>
            <Plus className="mr-1.5 size-4" />
            {t("rates.btnAddRateCard")}
          </Button>
        }
        emptyState={
          <div className="py-12 text-center">
            <p className="mb-2 font-medium text-muted-foreground">{t("rates.noRatesFound")}</p>
            <p className="mb-6 text-sm text-muted-foreground/60">{t("rates.noRatesFoundDesc")}</p>
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-1.5 size-4" />
              {t("rates.btnAddRateCard")}
            </Button>
          </div>
        }
      />

      <ConfirmDialog {...confirmDialogProps} />
    </>
  );
}
