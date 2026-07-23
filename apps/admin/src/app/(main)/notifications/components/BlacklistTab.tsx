"use client";

import type { RowAction } from "@admin/components/data-table";
import { DataTable } from "@admin/components/data-table";
import { showToast, ToastType } from "@admin/components/toast-provider";
import { trpc } from "@admin/lib/trpc";
import { Button } from "@ecom/ui/components/button";
import { Card } from "@ecom/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@ecom/ui/components/dialog";
import { Input } from "@ecom/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ecom/ui/components/select";
import { keepPreviousData } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { AlertTriangle, Download, Edit3, Plus, RefreshCw, Trash2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface EmailBlacklistRow extends Record<string, unknown> {
  id: number;
  email: string;
  reason: string;
  createdAt: string;
}

export function BlacklistTab() {
  const t = useTranslations("notifications");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 10;

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newReason, setNewReason] = useState("bounce");

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingEmail, setEditingEmail] = useState("");
  const [editingReason, setEditingReason] = useState("bounce");

  // Fetch blacklisted emails
  const { data, refetch, isLoading, isFetching } =
    trpc.viewer.notifications.blacklist.list.useQuery(
      {
        page,
        perPage,
        search: search || undefined,
      },
      { placeholderData: keepPreviousData },
    );

  // tRPC Mutations
  const addToBlacklistMutation = trpc.viewer.notifications.blacklist.add.useMutation({
    onSuccess: () => {
      showToast(t("blacklist.toasts.addSuccess"), ToastType.SUCCESS);
      setIsAddOpen(false);
      setNewEmail("");
      refetch();
    },
    onError: (err) => {
      showToast(err.message || t("blacklist.toasts.failed"), ToastType.ERROR);
    },
  });

  const addToBlacklistBulkMutation = trpc.viewer.notifications.blacklist.addBulk.useMutation({
    onSuccess: () => {
      showToast(t("blacklist.toasts.addBulkSuccess"), ToastType.SUCCESS);
      refetch();
    },
    onError: (err) => {
      showToast(err.message || t("blacklist.toasts.failed"), ToastType.ERROR);
    },
  });

  const removeFromBlacklistMutation = trpc.viewer.notifications.blacklist.remove.useMutation({
    onSuccess: () => {
      showToast(t("blacklist.toasts.removeSuccess"), ToastType.SUCCESS);
      refetch();
    },
    onError: (err) => {
      showToast(err.message || t("blacklist.toasts.failed"), ToastType.ERROR);
    },
  });

  const removeFromBlacklistBulkMutation =
    trpc.viewer.notifications.blacklist.removeBulk.useMutation({
      onSuccess: () => {
        showToast(t("blacklist.toasts.removeBulkSuccess"), ToastType.SUCCESS);
        refetch();
      },
      onError: (err) => {
        showToast(err.message || t("blacklist.toasts.failed"), ToastType.ERROR);
      },
    });

  const updateReasonMutation = trpc.viewer.notifications.blacklist.updateReason.useMutation({
    onSuccess: () => {
      showToast(t("blacklist.toasts.updateSuccess"), ToastType.SUCCESS);
      setIsEditOpen(false);
      refetch();
    },
    onError: (err) => {
      showToast(err.message || t("blacklist.toasts.failed"), ToastType.ERROR);
    },
  });

  const syncCacheBulkMutation = trpc.viewer.notifications.blacklist.syncCache.useMutation({
    onSuccess: () => {
      showToast(t("blacklist.toasts.syncSuccess"), ToastType.SUCCESS);
    },
    onError: (err) => {
      showToast(err.message || t("blacklist.toasts.failed"), ToastType.ERROR);
    },
  });

  // Handle single actions
  const handleAdd = () => {
    if (!newEmail) return;
    addToBlacklistMutation.mutate({ email: newEmail, reason: newReason });
  };

  const handleEditClick = (email: string, reason: string) => {
    setEditingEmail(email);
    setEditingReason(reason);
    setIsEditOpen(true);
  };

  const handleSaveEdit = () => {
    updateReasonMutation.mutate({ email: editingEmail, reason: editingReason });
  };

  const handleSyncCacheSingle = (email: string) => {
    syncCacheBulkMutation.mutate({ emails: [email] });
  };

  const handleExportCSV = () => {
    if (!data?.items || data.items.length === 0) {
      showToast(t("blacklist.toasts.noDataExport"), ToastType.WARNING);
      return;
    }

    const headers = [
      t("blacklist.columns.email"),
      t("blacklist.columns.reason"),
      t("blacklist.columns.createdAt"),
    ];
    const rows = data.items.map((item: { email?: string; reason?: string; createdAt?: string }) => [
      item.email || "",
      item.reason ? t(`blacklist.reasons.${item.reason}` as Parameters<typeof t>[0]) : "",
      item.createdAt ? new Date(item.createdAt).toLocaleString("vi-VN") : "",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [
        headers.join(","),
        ...rows.map((e) => e.map((val) => `"${val.replace(/"/g, '""')}"`).join(",")),
      ].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `blacklist_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(t("blacklist.toasts.exportSuccess"), ToastType.SUCCESS);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: parses CSV contents line by line
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) return;

        const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
        if (lines.length < 2) {
          showToast(t("blacklist.toasts.csvEmpty"), ToastType.ERROR);
          return;
        }

        const entries: { email: string; reason: string }[] = [];
        const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        for (let i = 1; i < lines.length; i++) {
          const columns = lines[i].split(",").map((c) => c.replace(/^["']|["']$/g, "").trim());
          const email = columns[0];
          const reason = columns[1] || "manual";

          if (email && EMAIL_REGEX.test(email)) {
            entries.push({ email, reason });
          }
        }

        if (entries.length === 0) {
          showToast(t("blacklist.toasts.noValidEmails"), ToastType.WARNING);
          return;
        }

        addToBlacklistBulkMutation.mutate({ entries });
      } catch (_err) {
        showToast(t("blacklist.toasts.readCsvFailed"), ToastType.ERROR);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // DataTable column definitions
  const columns: ColumnDef<EmailBlacklistRow>[] = [
    {
      accessorKey: "email",
      header: t("blacklist.columns.email"),
      cell: ({ row }) => <span className="font-medium select-all">{row.original.email}</span>,
    },
    {
      accessorKey: "reason",
      header: t("blacklist.columns.reason"),
      cell: ({ row }) => {
        const reason = row.original.reason;
        const reasonColors: Record<string, string> = {
          bounce:
            "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50",
          complaint:
            "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/50",
          manual:
            "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50",
        };
        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase border ${
              reasonColors[reason] || "bg-muted text-muted-foreground border-border"
            }`}
          >
            {t(`blacklist.reasons.${reason}` as Parameters<typeof t>[0])}
          </span>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: t("blacklist.columns.createdAt"),
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">
          {row.original.createdAt
            ? new Date(row.original.createdAt).toLocaleString("vi-VN")
            : "N/A"}
        </span>
      ),
    },
  ];

  // DataTable row Actions definitions
  const rowActions: RowAction<EmailBlacklistRow>[] = [
    {
      key: "edit",
      tooltip: t("blacklist.actions.edit"),
      icon: <Edit3 className="h-4 w-4" />,
      onClick: (row) => handleEditClick(row.email, row.reason),
    },
    {
      key: "sync",
      tooltip: t("blacklist.actions.sync"),
      icon: <RefreshCw className="h-4 w-4" />,
      onClick: (row) => handleSyncCacheSingle(row.email),
    },
    {
      key: "delete",
      tooltip: t("blacklist.actions.delete"),
      icon: <Trash2 className="h-4 w-4" />,
      onClick: (row) => {
        if (confirm(t("blacklist.dialogs.confirmDeleteSingle", { email: row.email }))) {
          removeFromBlacklistMutation.mutate({ email: row.email });
        }
      },
      color: "error",
    },
  ];

  const headerActions = (
    <div className="flex items-center gap-2">
      <input
        type="file"
        accept=".csv"
        id="csv-import-file"
        className="hidden"
        onChange={handleImportCSV}
      />
      <Button
        variant="outline"
        size="sm"
        onClick={() => document.getElementById("csv-import-file")?.click()}
      >
        <Upload className="h-3.5 w-3.5 mr-1" />
        {t("blacklist.actions.import")}
      </Button>
      <Button variant="outline" size="sm" onClick={handleExportCSV}>
        <Download className="h-3.5 w-3.5 mr-1" />
        {t("blacklist.actions.export")}
      </Button>

      {/* Add to Blacklist Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogTrigger asChild>
          <Button size="sm" className="bg-primary hover:bg-primary-hover text-white">
            <Plus className="h-4 w-4 mr-1" />
            {t("blacklist.actions.add")}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("blacklist.dialogs.addTitle")}</DialogTitle>
            <DialogDescription>{t("blacklist.dialogs.addDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <label
                htmlFor="add-email"
                className="text-xs font-semibold text-muted-foreground uppercase"
              >
                {t("blacklist.dialogs.addEmailLabel")}
              </label>
              <Input
                id="add-email"
                placeholder="email@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="add-reason"
                className="text-xs font-semibold text-muted-foreground uppercase"
              >
                {t("blacklist.dialogs.addReasonLabel")}
              </label>
              <Select value={newReason} onValueChange={setNewReason}>
                <SelectTrigger id="add-reason">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bounce">{t("blacklist.reasons.bounce")}</SelectItem>
                  <SelectItem value="complaint">{t("blacklist.reasons.complaint")}</SelectItem>
                  <SelectItem value="manual">{t("blacklist.reasons.manual")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>
              {t("blacklist.dialogs.cancel")}
            </Button>
            <Button onClick={handleAdd} disabled={!newEmail}>
              {t("blacklist.dialogs.confirmAdd")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-card/60 backdrop-blur border-border/80 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase">
            {t("blacklist.stats.total")}
          </span>
          <span className="text-2xl font-bold tracking-tight mt-1">{data?.total ?? 0}</span>
        </Card>
        <Card className="p-4 bg-card/60 backdrop-blur border-border/80 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase">
            {t("blacklist.stats.bounce")}
          </span>
          <span className="text-2xl font-bold tracking-tight text-amber-600 mt-1">
            {data?.stats?.bounce ?? 0}
          </span>
        </Card>
        <Card className="p-4 bg-card/60 backdrop-blur border-border/80 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase">
            {t("blacklist.stats.spam")}
          </span>
          <span className="text-2xl font-bold tracking-tight text-red-600 mt-1">
            {data?.stats?.complaint ?? 0}
          </span>
        </Card>
        <Card className="p-4 bg-card/60 backdrop-blur border-border/80 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase">
            {t("blacklist.stats.manual")}
          </span>
          <span className="text-2xl font-bold tracking-tight text-blue-600 mt-1">
            {data?.stats?.manual ?? 0}
          </span>
        </Card>
      </div>

      {/* Datatable */}
      <DataTable<EmailBlacklistRow>
        tableKey="blacklist-table"
        defaultPageSize={perPage}
        defaultPage={page}
        data={(data?.items as unknown as EmailBlacklistRow[]) || []}
        columns={columns}
        rowActions={rowActions}
        isLoading={isLoading}
        isFetching={isFetching}
        onServerChange={(params) => {
          setPage(params.page);
          setSearch(params.search);
        }}
        rowCount={data?.total ?? 0}
        onRefresh={() => refetch()}
        headerActions={headerActions}
        bulkActions={[
          {
            key: "sync-cache",
            label: t("blacklist.actions.bulkSync"),
            onClick: (rows, clearSelection) => {
              const emails = rows.map((r) => r.email);
              syncCacheBulkMutation.mutate({ emails }, { onSuccess: clearSelection });
            },
          },
          {
            key: "delete-bulk",
            label: t("blacklist.actions.bulkDelete"),
            variant: "danger",
            onClick: (rows, clearSelection) => {
              if (confirm(t("blacklist.dialogs.confirmDeleteBulk", { count: rows.length }))) {
                const emails = rows.map((r) => r.email);
                removeFromBlacklistBulkMutation.mutate({ emails }, { onSuccess: clearSelection });
              }
            },
          },
        ]}
        emptyState={
          <div className="py-12 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-muted-foreground/60 mb-3" />
            <p className="text-sm text-muted-foreground font-medium">{t("noResultsTitle")}</p>
          </div>
        }
      />

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("blacklist.dialogs.editTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <label
                htmlFor="edit-email"
                className="text-xs font-semibold text-muted-foreground uppercase"
              >
                {t("blacklist.dialogs.editEmailLabel")}
              </label>
              <Input id="edit-email" value={editingEmail} disabled />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="edit-reason"
                className="text-xs font-semibold text-muted-foreground uppercase"
              >
                {t("blacklist.dialogs.editReasonLabel")}
              </label>
              <Select value={editingReason} onValueChange={setEditingReason}>
                <SelectTrigger id="edit-reason">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bounce">{t("blacklist.reasons.bounce")}</SelectItem>
                  <SelectItem value="complaint">{t("blacklist.reasons.complaint")}</SelectItem>
                  <SelectItem value="manual">{t("blacklist.reasons.manual")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              {t("blacklist.dialogs.cancel")}
            </Button>
            <Button onClick={handleSaveEdit}>{t("blacklist.dialogs.confirmUpdate")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
