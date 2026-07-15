"use client";

import { trpc } from "@customer/lib/trpc";
import { translate } from "@ecom/i18n";
import { useI18n } from "@ecom/shared/@i18n";
import { useTimezoneOffset } from "@ecom/shared/hooks/useTimezoneOffset";
import { Button } from "@ecom/ui/components/button";
import { Card } from "@ecom/ui/components/card";
import type { DataTableColumn } from "@ecom/ui/components/data-table";
import { DataTable } from "@ecom/ui/components/data-table";
import { DateRangePicker } from "@ecom/ui/components/date-range-picker";
import { Input } from "@ecom/ui/components/input";
import { cn } from "@ecom/ui/lib/utils";
import { AlertCircle, Download, Loader2, RefreshCw, Search } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "../../../../components/toast-provider";
import { SessionDetailModal } from "../components/SessionDetailModal";
import type { OrderImportError } from "../utils/import-parser";
import { exportErrorsToExcel } from "../utils/import-parser";

// -----------------------------------------------------------------
// Sub-component: Header Title & Reload Action
// -----------------------------------------------------------------
interface HistoryHeaderProps {
  title: string;
}

function HistoryHeader({ title }: HistoryHeaderProps) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">{title}</h1>
    </div>
  );
}

// -----------------------------------------------------------------
// Sub-component: Navigation Tabs
// -----------------------------------------------------------------
interface HistoryTabsProps {
  uploadText: string;
  historyText: string;
}

function HistoryTabs({ uploadText, historyText }: HistoryTabsProps) {
  return (
    <div className="bg-[#CCF2EB] dark:bg-teal-950/40 p-1 rounded-xl inline-flex gap-1 self-start mb-2 border border-transparent dark:border-teal-800/20">
      <Link
        href="/orders/import"
        className="px-6 py-2 font-bold text-sm transition-all rounded-lg text-[#0c6070] dark:text-teal-300 hover:bg-white/40 dark:hover:bg-teal-900/40 flex items-center gap-2 cursor-pointer"
      >
        {uploadText}
      </Link>
      <Link
        href="/orders/import/history"
        className="px-6 py-2 font-bold text-sm transition-all rounded-lg bg-white dark:bg-teal-900 text-[#0c6070] dark:text-teal-200 shadow-sm flex items-center gap-2 cursor-pointer"
      >
        {historyText}
      </Link>
    </div>
  );
}

// -----------------------------------------------------------------
// Sub-component: Unified Date Range Picker Popover
// -----------------------------------------------------------------
// Sub-component: History Filters Panel (Single-Row)
// -----------------------------------------------------------------
interface HistoryFiltersProps {
  search: string;
  setSearch: (val: string) => void;
  startDate: string;
  endDate: string;
  onDateRangeChange: (from: string, to: string) => void;
  onRefetch: () => void;
  isRefetching: boolean;
  currentLocale: string;
}

function HistoryFilters({
  search,
  setSearch,
  startDate,
  endDate,
  onDateRangeChange,
  onRefetch,
  isRefetching,
  currentLocale,
}: HistoryFiltersProps) {
  return (
    <div className="p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-transparent border-b border-border">
      <div className="relative w-full sm:w-[320px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          id="search-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={
            currentLocale === "vi"
              ? "Tìm theo tên file, sđt, người nhận..."
              : "Search by name / email / phone number"
          }
          className="pl-9 bg-card border border-border rounded-lg h-10 w-full focus-visible:ring-[#0F798C] focus-visible:border-[#0F798C]"
        />
      </div>

      <div className="flex items-center gap-2 self-end sm:self-auto">
        <DateRangePicker
          valueFrom={startDate}
          valueTo={endDate}
          onChange={onDateRangeChange}
          onClear={() => onDateRangeChange("", "")}
          placeholder={currentLocale === "vi" ? "Chọn khoảng ngày" : "Select date range"}
          className="h-10 w-full min-w-[240px] bg-card border border-border rounded-lg font-normal text-sm text-foreground hover:bg-accent/40 dark:hover:bg-accent/10 cursor-pointer animate-none"
        />
        <Button
          onClick={onRefetch}
          variant="outline"
          size="icon"
          className="h-10 w-10 border border-border rounded-lg bg-card hover:bg-accent/40 dark:hover:bg-accent/10 text-foreground flex items-center justify-center cursor-pointer shadow-none"
          disabled={isRefetching}
        >
          <RefreshCw
            className={cn("h-4 w-4 text-muted-foreground", isRefetching && "animate-spin")}
          />
        </Button>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------
// Sub-component: History Table Row & Table
// -----------------------------------------------------------------
interface HistorySession {
  id: string;
  fileName: string;
  fileSize: number | null;
  totalRows: number;
  successRows: number;
  failedRows: number;
  status: string;
  createdAt: Date;
}

// -----------------------------------------------------------------
// React Hook: Manages Filter State & URL Synchronization
// -----------------------------------------------------------------
function useHistoryFiltersState() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const page = Number(searchParams.get("page")) || 1;
  const searchVal = searchParams.get("search") || "";
  const startDateVal = searchParams.get("startDate") || "";
  const endDateVal = searchParams.get("endDate") || "";
  const perPage = Number(searchParams.get("perPage")) || 10;

  const [searchInput, setSearchInput] = useState(searchVal);
  const [startDateInput, setStartDateInput] = useState(startDateVal);
  const [endDateInput, setEndDateInput] = useState(endDateVal);

  useEffect(() => {
    setSearchInput(searchVal);
  }, [searchVal]);

  const updateUrlParams = useCallback(
    (newParams: Record<string, string | number | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, val] of Object.entries(newParams)) {
        if (val === null || val === "") {
          params.delete(key);
        } else {
          params.set(key, String(val));
        }
      }
      router.push(`/orders/import/history?${params.toString()}`);
    },
    [searchParams, router],
  );

  // Debounce search input typing to avoid database flooding
  useEffect(() => {
    if (searchInput === searchVal) return;
    const handler = setTimeout(() => {
      updateUrlParams({ search: searchInput, page: 1 });
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput, searchVal, updateUrlParams]);

  const handleDateRangeChange = useCallback(
    (from: string, to: string) => {
      setStartDateInput(from);
      setEndDateInput(to);
      updateUrlParams({
        startDate: from || null,
        endDate: to || null,
        page: 1,
      });
    },
    [updateUrlParams],
  );

  const handleResetFilters = useCallback(() => {
    setSearchInput("");
    setStartDateInput("");
    setEndDateInput("");
    router.push("/orders/import/history");
  }, [router]);

  return {
    page,
    searchVal,
    startDateVal,
    endDateVal,
    perPage,
    searchInput,
    setSearchInput,
    startDateInput,
    endDateInput,
    handleDateRangeChange,
    handleResetFilters,
    updateUrlParams,
  };
}

// -----------------------------------------------------------------
// Sub-component: Main History Page Orchestrator Content
// -----------------------------------------------------------------
function HistoryPageContent() {
  const { languageId: currentLocale } = useI18n();
  const { toast } = useToast();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [exportingId, setExportingId] = useState<string | null>(null);

  const clientTimezoneOffset = useTimezoneOffset();

  const t = useCallback(
    (key: string, variables?: Record<string, string | number>) => {
      let raw = translate(key, currentLocale);
      if (variables) {
        for (const [k, v] of Object.entries(variables)) {
          raw = raw.replace(`{${k}}`, String(v));
        }
      }
      return raw;
    },
    [currentLocale],
  );

  const {
    page,
    searchVal,
    startDateVal,
    endDateVal,
    perPage,
    searchInput,
    setSearchInput,
    startDateInput,
    endDateInput,
    handleDateRangeChange,
    updateUrlParams,
  } = useHistoryFiltersState();

  // tRPC Queries
  const {
    data: historyData,
    isLoading: historyLoading,
    isRefetching,
    refetch,
  } = trpc.customer.orders.listImportSessions.useQuery(
    {
      page,
      perPage,
      search: searchVal || undefined,
      startDate: startDateVal || undefined,
      endDate: endDateVal || undefined,
      timezoneOffset: clientTimezoneOffset,
    },
    { placeholderData: (prev) => prev },
  );

  const { data: sessionDetail, isLoading: detailLoading } =
    trpc.customer.orders.getImportSessionDetail.useQuery(
      { id: selectedSessionId ?? "" },
      { enabled: !!selectedSessionId },
    );

  const total = historyData?.total || 0;
  const _totalPages = Math.ceil(total / perPage);

  const trpcContext = trpc.useUtils();

  const handleSelectAll = (checked: boolean) => {
    if (checked && historyData?.items) {
      setSelectedIds(historyData.items.map((item) => item.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    }
  };

  const handleExportExcel = useCallback(
    async (sessionId: string, fileName: string) => {
      setExportingId(sessionId);
      try {
        const data = await trpcContext.client.customer.orders.getImportSessionDetail.query({
          id: sessionId,
        });
        const errors = (data?.errors as unknown as OrderImportError[]) || [];

        if (errors.length === 0) {
          toast(t("orders.import.toastNoErrors"), "info");
          return;
        }

        await exportErrorsToExcel(errors, fileName || "Order", sessionId, currentLocale);
        toast(t("orders.import.toastExportSuccess"), "success");
      } catch (_err) {
        toast(t("orders.import.toastExportError"), "error");
      } finally {
        setExportingId(null);
      }
    },
    [trpcContext, toast, currentLocale, t],
  );

  const renderActions = useCallback(
    (session: HistorySession) => {
      const isExporting = exportingId === session.id;
      return (
        <div className="flex items-center justify-end gap-2 pr-2">
          {session.failedRows > 0 && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedSessionId(session.id)}
                className="text-[#0F798C] hover:text-[#0c6070] dark:text-[#0F798C] dark:hover:text-cyan-400 hover:bg-[#CCF2EB]/20 dark:hover:bg-cyan-950/20 text-xs font-semibold cursor-pointer"
              >
                {t("orders.import.viewErrors")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={isExporting}
                onClick={() => handleExportExcel(session.id, session.fileName)}
                className="border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 cursor-pointer h-8 rounded-lg"
              >
                {isExporting ? (
                  <Loader2 className="h-3 w-3 animate-spin text-slate-500" />
                ) : (
                  <Download className="h-3 w-3 text-slate-500" />
                )}
                {t("orders.import.exportExcel")}
              </Button>
            </>
          )}
        </div>
      );
    },
    [exportingId, handleExportExcel, t],
  );

  const columns = useMemo<DataTableColumn<HistorySession>[]>(() => {
    return [
      {
        key: "fileName",
        header: t("orders.import.fileName"),
        headerClassName:
          "px-6 py-4 text-left font-bold text-xs uppercase tracking-wider text-[#0c6070] dark:text-teal-200",
        cellClassName:
          "px-6 py-4 font-semibold text-slate-700 dark:text-slate-200 max-w-[240px] truncate",
        render: (row) => row.fileName,
      },
      {
        key: "createdAt",
        header: t("orders.import.importDate"),
        headerClassName:
          "px-6 py-4 text-left font-bold text-xs uppercase tracking-wider text-[#0c6070] dark:text-teal-200",
        cellClassName: "px-6 py-4 text-xs text-slate-500 leading-normal",
        render: (row) => {
          const createdDate = new Date(row.createdAt);
          const dateStr = createdDate.toLocaleDateString(
            currentLocale === "vi" ? "vi-VN" : "en-US",
            {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            },
          );
          const timeStr = createdDate.toLocaleTimeString(
            currentLocale === "vi" ? "vi-VN" : "en-US",
            {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            },
          );
          return (
            <div>
              <div className="font-medium text-slate-700 dark:text-slate-200">{dateStr}</div>
              <div className="text-slate-400 mt-0.5">{timeStr}</div>
            </div>
          );
        },
      },
      {
        key: "totalRows",
        header: t("orders.import.totalRows"),
        headerClassName:
          "px-6 py-4 text-center font-bold text-xs uppercase tracking-wider text-[#0c6070] dark:text-teal-200",
        cellClassName: "px-6 py-4 text-center text-slate-700 dark:text-slate-200 font-medium",
        render: (row) => row.totalRows,
      },
      {
        key: "successRows",
        header: t("orders.import.success"),
        headerClassName:
          "px-6 py-4 text-center font-bold text-xs uppercase tracking-wider text-[#0c6070] dark:text-teal-200",
        cellClassName: "px-6 py-4 text-center font-bold text-emerald-600 dark:text-emerald-400",
        render: (row) => row.successRows,
      },
      {
        key: "failedRows",
        header: t("orders.import.failed"),
        headerClassName:
          "px-6 py-4 text-center font-bold text-xs uppercase tracking-wider text-[#0c6070] dark:text-teal-200",
        cellClassName: "px-6 py-4 text-center font-bold text-rose-600 dark:text-rose-400",
        render: (row) => row.failedRows,
      },
    ];
  }, [currentLocale, t]);

  const paginationProps = useMemo(() => {
    return {
      page,
      perPage,
      total,
      onPageChange: (p: number) => updateUrlParams({ page: p }),
      onPerPageChange: (limit: number) => updateUrlParams({ perPage: limit, page: 1 }),
      currentLocale,
    };
  }, [page, perPage, total, updateUrlParams, currentLocale]);

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      <HistoryHeader title={t("orders.importOrder")} />

      <HistoryTabs
        uploadText={t("orders.import.uploadTab")}
        historyText={t("orders.import.historyTab")}
      />

      <Card className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <HistoryFilters
          search={searchInput}
          setSearch={setSearchInput}
          startDate={startDateInput}
          endDate={endDateInput}
          onDateRangeChange={handleDateRangeChange}
          onRefetch={refetch}
          isRefetching={isRefetching}
          currentLocale={currentLocale}
        />

        <DataTable<HistorySession>
          columns={columns}
          data={(historyData?.items as unknown as HistorySession[]) || []}
          isLoading={historyLoading}
          emptyMessage={t("orders.import.historyEmpty")}
          emptyIcon={<AlertCircle className="h-8 w-8 text-slate-400" />}
          selectedIds={useMemo(() => new Set(selectedIds), [selectedIds])}
          onSelectAll={handleSelectAll}
          onSelectRow={(id, checked) => handleSelectRow(String(id), checked)}
          getRowId={(row) => String(row.id)}
          actions={renderActions}
          headerRowClassName="bg-[#CCF2EB] dark:bg-teal-950/30 font-bold text-xs uppercase tracking-wider select-none border-b border-slate-100 dark:border-slate-800"
          pagination={paginationProps}
        />
      </Card>

      <SessionDetailModal
        selectedSessionId={selectedSessionId}
        setSelectedSessionId={setSelectedSessionId}
        sessionDetail={sessionDetail}
        detailLoading={detailLoading}
        t={t}
        currentLocale={currentLocale}
      />
    </div>
  );
}

export default function HistoryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-20 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-[#0F798C]" />
          <span>Loading...</span>
        </div>
      }
    >
      <HistoryPageContent />
    </Suspense>
  );
}
