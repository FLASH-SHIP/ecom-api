"use client";

import { DataTable } from "@admin/components/data-table";
import { CopyCell } from "@admin/components/data-table/CopyCell";
import { useServerTable } from "@admin/components/data-table/hooks/useServerTable";
import type { DataTableServerParams } from "@admin/components/data-table/types";
import ModuleI18nProvider from "@admin/components/i18n/ModuleI18nProvider";
import { trpc } from "@admin/lib/trpc";
import { formatDate } from "@admin/utils/dateFormat";
import { cn } from "@ecom/ui/lib/utils";
import { keepPreviousData } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { AlertCircle, ClipboardList } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

type VerificationCodeRow = {
  id: number;
  email: string;
  code: string;
  status: string;
  expiresAt: string;
  createdAt: string;
};

const STATUS_BADGE_CONFIG: Record<string, string> = {
  PENDING: "bg-amber-500 text-white",
  VERIFIED: "bg-emerald-500 text-white",
  EXPIRED: "bg-red-500 text-white",
};

function toQueryInput(params: DataTableServerParams) {
  const { search, page, pageSize } = params;

  return {
    page,
    perPage: pageSize,
    search: search.trim() || undefined,
  };
}

function VerificationCodesContent() {
  const t = useTranslations("customers");
  const tCommon = useTranslations("common");

  const { queryInput, onServerChange, tableKey, initialState } = useServerTable({
    tableId: "verification_codes",
    defaultPageSize: 25,
    toQueryInput,
  });

  const {
    data,
    isLoading,
    isFetching,
    error: listError,
    refetch,
  } = trpc.viewer.customers.verificationCodesList.useQuery(queryInput, {
    placeholderData: keepPreviousData,
    retry: false,
  });

  const rows = (data?.items ?? []) as VerificationCodeRow[];
  const serverTotalCount = data?.total ?? 0;

  const columns: ColumnDef<VerificationCodeRow>[] = useMemo(
    () => [
      {
        accessorKey: "id",
        header: "ID",
        size: 80,
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.id}</span>,
      },
      {
        accessorKey: "email",
        header: t("fields.email"),
        size: 250,
        cell: ({ row }) => (
          <CopyCell value={row.original.email}>
            <span className="text-sm font-medium text-foreground">{row.original.email}</span>
          </CopyCell>
        ),
      },
      {
        accessorKey: "code",
        header: tCommon("verificationCodes") || "Lịch sử gửi mã",
        size: 150,
        cell: ({ row }) => (
          <CopyCell value={row.original.code}>
            <span className="text-sm font-mono font-bold text-primary">{row.original.code}</span>
          </CopyCell>
        ),
      },
      {
        accessorKey: "status",
        header: t("fields.status"),
        size: 150,
        cell: ({ row }) => {
          const status = row.original.status;
          const colorClass = STATUS_BADGE_CONFIG[status] ?? "bg-neutral-400 text-white";
          return (
            <span
              className={cn(
                "inline-block min-w-[90px] rounded-full px-3 py-0.5 text-center text-xs font-semibold uppercase",
                colorClass,
              )}
            >
              {status}
            </span>
          );
        },
      },
      {
        accessorKey: "expiresAt",
        header: "Hạn dùng",
        size: 180,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {formatDate(row.original.expiresAt)}
          </span>
        ),
      },
      {
        accessorKey: "createdAt",
        header: tCommon("createdAt"),
        size: 180,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {formatDate(row.original.createdAt)}
          </span>
        ),
      },
    ],
    [t, tCommon],
  );

  return (
    <>
      {listError && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-red-50 px-4 py-3 text-sm text-destructive dark:bg-red-950">
          <AlertCircle className="size-4 shrink-0" />
          {listError.message}
        </div>
      )}

      <DataTable<VerificationCodeRow>
        tableKey={tableKey}
        defaultPageSize={initialState.pageSize}
        defaultPage={initialState.page}
        data={rows}
        columns={columns}
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
        pageTitle={tCommon("nav.verificationCodes") || "Lịch sử gửi mã"}
        onRefresh={() => refetch()}
        emptyState={
          <div className="py-12 text-center">
            <ClipboardList size={48} className="mx-auto mb-3 text-muted-foreground/40" />
            <p className="mb-1 text-muted-foreground">Không tìm thấy mã xác minh nào</p>
            <p className="text-sm text-muted-foreground/60">
              Lịch sử gửi mã OTP đăng ký của khách hàng sẽ xuất hiện ở đây.
            </p>
          </div>
        }
      />
    </>
  );
}

export default function VerificationCodesPage() {
  return (
    <ModuleI18nProvider namespaces={["customers", "users"]}>
      <VerificationCodesContent />
    </ModuleI18nProvider>
  );
}
