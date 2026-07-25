"use client";

import { DataTable } from "@admin/components/data-table";
import { useServerTable } from "@admin/components/data-table/hooks/useServerTable";
import type {
  DataTableServerParams,
  FilterFieldDef,
  RowAction,
} from "@admin/components/data-table/types";
import { trpc } from "@admin/lib/trpc";
import type { OrderStatus } from "@ecom/prisma";
import { Badge } from "@ecom/ui/components/badge";
import { keepPreviousData } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Eye, ShoppingBag } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

interface OrderRow extends Record<string, unknown> {
  id: string;
  orderCode: string;
  customerId: string;
  status: OrderStatus;
  labelStatus: string;
  shippingMethod: string;
  shippingOrigin: string;
  sellerOrderId: string | null;
  trackingNumber: string | null;
  receiverName: string;
  receiverPhone: string | null;
  receiverCity: string;
  receiverState: string;
  receiverCountry: string;
  receiverZipCode: string;
  receiverAddress1: string;
  declaredWeight: number;
  baseShippingFee: unknown;
  surchargeFee: unknown;
  totalFee: unknown;
  createdAt: string | Date;
  customer?: {
    name: string | null;
    email: string;
    username: string;
  } | null;
}

const getStatusBadge = (status: string, t: (key: string) => string) => {
  switch (status) {
    case "LABEL_CREATED":
      return <Badge variant="secondary">{t(`status.${status}`)}</Badge>;
    case "PENDING_LABEL":
      return <Badge variant="warning">{t(`status.${status}`)}</Badge>;
    case "PACKAGE_RECEIVED":
      return (
        <Badge variant="default" className="bg-[#0F798C] text-white border-none">
          {t(`status.${status}`)}
        </Badge>
      );
    case "ON_THE_WAY":
      return (
        <Badge variant="default" className="bg-blue-500 text-white border-none">
          {t(`status.${status}`)}
        </Badge>
      );
    case "PICK_UP":
      return (
        <Badge variant="default" className="bg-amber-500 text-white border-none">
          {t(`status.${status}`)}
        </Badge>
      );
    case "DELIVERY":
      return <Badge variant="success">{t(`status.${status}`)}</Badge>;
    default:
      return <Badge variant="default">{t(`status.${status}`)}</Badge>;
  }
};

function toQueryInput(params: DataTableServerParams) {
  const { search, filters, sort, page, pageSize } = params;

  const statusFilter = filters.find((f) => f.fieldKey === "status" && f.operator === "equals");
  const customerIdFilter = filters.find(
    (f) => f.fieldKey === "customerId" && f.operator === "equals",
  );

  return {
    page,
    perPage: pageSize,
    search: search.trim() || undefined,
    status: statusFilter ? (statusFilter.value as OrderStatus) : undefined,
    customerId: customerIdFilter ? String(customerIdFilter.value) : undefined,
    sortBy:
      sort.direction && ["id", "createdAt", "orderCode", "status"].includes(sort.key)
        ? (sort.key as "id" | "createdAt" | "orderCode" | "status")
        : "createdAt",
    sortOrder: sort.direction ?? "desc",
  };
}

export default function AdminOrdersPage() {
  const router = useRouter();
  const t = useTranslations("orders");

  const { queryInput, onServerChange, tableKey, initialState } = useServerTable({
    tableId: "orders",
    defaultSort: { key: "createdAt", direction: "desc" },
    defaultPageSize: 10,
    toQueryInput,
  });

  const { data, isLoading, isFetching, refetch } = trpc.viewer.orders.list.useQuery(queryInput, {
    placeholderData: keepPreviousData,
  });

  const rows = (data?.data ?? []) as OrderRow[];
  const serverTotalCount = data?.meta.total ?? 0;

  const columns: ColumnDef<OrderRow, unknown>[] = useMemo(
    () => [
      {
        accessorKey: "orderCode",
        header: t("orderId"),
        cell: ({ row }) => (
          <span className="font-semibold text-foreground">{row.original.orderCode}</span>
        ),
      },
      {
        accessorKey: "createdAt",
        header: t("createdAt"),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {format(new Date(row.original.createdAt), "dd/MM/yyyy HH:mm")}
          </span>
        ),
      },
      {
        accessorKey: "customerId",
        header: t("customer"),
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-semibold text-foreground">
              {row.original.customer?.name ||
                row.original.customer?.username ||
                `Customer #${row.original.customerId}`}
            </span>
            <span className="text-xs text-muted-foreground">{row.original.customer?.email}</span>
          </div>
        ),
      },
      {
        accessorKey: "receiverName",
        header: t("receiverAndCountry"),
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-semibold text-foreground">{row.original.receiverName}</span>
            <span className="text-xs text-muted-foreground">
              {row.original.receiverCity}, {row.original.receiverCountry}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "declaredWeight",
        header: t("weightGr"),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.original.declaredWeight}</span>
        ),
      },
      {
        accessorKey: "totalFee",
        header: t("totalFee"),
        cell: ({ row }) => {
          const base = Number(row.original.baseShippingFee || 0);
          const surcharge = Number(row.original.surchargeFee || 0);
          return (
            <span className="font-semibold text-foreground">${(base + surcharge).toFixed(2)}</span>
          );
        },
      },
      {
        accessorKey: "status",
        header: t("statusLabel"),
        cell: ({ row }) => getStatusBadge(row.original.status, t),
      },
    ],
    [t],
  );

  const filterFields: FilterFieldDef[] = useMemo(
    () => [
      {
        key: "status",
        label: t("statusLabel"),
        type: "select",
        operators: [{ value: "equals", label: "equals" }],
        options: [
          { value: "LABEL_CREATED", label: t("status.LABEL_CREATED") },
          { value: "PENDING_LABEL", label: t("status.PENDING_LABEL") },
          { value: "PACKAGE_RECEIVED", label: t("status.PACKAGE_RECEIVED") },
          { value: "ON_THE_WAY", label: t("status.ON_THE_WAY") },
          { value: "PICK_UP", label: t("status.PICK_UP") },
          { value: "DELIVERY", label: t("status.DELIVERY") },
        ],
      },
      {
        key: "customerId",
        label: t("customerId"),
        type: "text",
        operators: [{ value: "equals", label: "equals" }],
      },
    ],
    [t],
  );

  const rowActions: RowAction<OrderRow>[] = useMemo(
    () => [
      {
        key: "view",
        tooltip: t("viewDetail"),
        icon: <Eye size={16} />,
        color: "primary",
        onClick: (row) => router.push(`/orders/${row.id}`),
      },
    ],
    [router, t],
  );

  return (
    <DataTable<OrderRow>
      tableKey={tableKey}
      defaultPageSize={initialState.pageSize}
      defaultPage={initialState.page}
      data={rows}
      columns={columns}
      rowActions={rowActions}
      filterFields={filterFields}
      isLoading={isLoading}
      isFetching={isFetching}
      onServerChange={onServerChange}
      rowCount={serverTotalCount}
      pageTitle={t("manageOrders")}
      onRefresh={() => refetch()}
      emptyState={
        <div className="py-8 text-center animate-fade-in">
          <ShoppingBag size={48} className="mx-auto mb-3 text-muted-foreground/40" />
          <p className="mb-1 text-muted-foreground font-medium">{t("noOrders")}</p>
          <p className="text-sm text-muted-foreground/60">{t("noOrdersDesc")}</p>
        </div>
      }
    />
  );
}
