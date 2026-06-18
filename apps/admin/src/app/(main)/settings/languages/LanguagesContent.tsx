"use client";

import { LanguageFormDrawer } from "@admin/app/(main)/settings/languages/components/LanguageFormDrawer";
import type { RowAction } from "@admin/components/data-table";
import { DataTable } from "@admin/components/data-table";
import { useToast } from "@admin/components/toast-provider";
import { ConfirmDialog } from "@admin/components/ui/ConfirmDialog";
import { useConfirm } from "@admin/components/ui/useConfirm";
import { trpc } from "@admin/lib/trpc";
import { formatDate } from "@admin/utils/dateFormat";
import { Badge } from "@ecom/ui/components/badge";
import { Button } from "@ecom/ui/components/button";
import type { ColumnDef } from "@tanstack/react-table";
import { AlertTriangle, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";

type LanguageRow = {
  id: number;
  name: string;
  locale: string;
  code: string;
  flag: string | null;
  isDefault: boolean;
  isRtl: boolean;
  order: number;
  createdAt: string;
};

function getFlagEmoji(countryCode: string): string {
  const code = countryCode.toUpperCase();
  if (code.length !== 2) return countryCode;
  const codePoints = [...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65);
  return String.fromCodePoint(...codePoints);
}

export default function LanguagesContent() {
  const t = useTranslations("languages");
  const { toast } = useToast();
  const { askConfirm, dialogProps: confirmDialogProps } = useConfirm();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const { data: languages, isLoading } = trpc.viewer.languages.list.useQuery();

  const deleteMut = trpc.viewer.languages.delete.useMutation({
    onSuccess: () => {
      toast(t("deleted"), "success");
      utils.viewer.languages.list.invalidate();
    },
    onError: (err) => toast(err.message, "error"),
  });

  const setDefaultMut = trpc.viewer.languages.setDefault.useMutation({
    onSuccess: () => {
      toast(t("defaultSet"), "success");
      utils.viewer.languages.list.invalidate();
    },
    onError: (err) => toast(err.message, "error"),
  });

  const rows: LanguageRow[] = useMemo(
    () =>
      (languages ?? [])
        .filter(
          (l): l is typeof l & { id: number; name: string; locale: string; code: string } =>
            l.id !== undefined &&
            l.name !== undefined &&
            l.locale !== undefined &&
            l.code !== undefined,
        )
        .map((l) => ({
          id: l.id,
          name: l.name,
          locale: l.locale,
          code: l.code,
          flag: l.flag ?? null,
          isDefault: l.isDefault ?? false,
          isRtl: l.isRtl ?? false,
          order: l.order ?? 0,
          createdAt:
            typeof l.createdAt === "string"
              ? l.createdAt
              : l.createdAt
                ? new Date(l.createdAt).toISOString()
                : new Date().toISOString(),
        })),
    [languages],
  );

  function openCreate() {
    setEditingId(null);
    setDrawerOpen(true);
  }

  const openEdit = useCallback((id: number) => {
    setEditingId(id);
    setDrawerOpen(true);
  }, []);

  const columns: ColumnDef<LanguageRow>[] = useMemo(
    () => [
      {
        accessorKey: "id",
        header: "ID",
        size: 60,
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.id}</span>,
      },
      {
        accessorKey: "name",
        header: t("name"),
        cell: ({ row }) => (
          <button
            type="button"
            className="flex cursor-pointer items-center gap-2 bg-transparent p-0 text-left text-sm font-medium text-foreground hover:underline"
            onClick={() => openEdit(row.original.id)}
          >
            {row.original.flag && (
              <span className="text-base" role="img" aria-label={row.original.name}>
                {getFlagEmoji(row.original.flag)}
              </span>
            )}
            <span>{row.original.name}</span>
            {row.original.isRtl && (
              <Badge variant="outline" className="text-xs">
                RTL
              </Badge>
            )}
          </button>
        ),
      },
      {
        accessorKey: "locale",
        header: t("locale"),
        size: 100,
        cell: ({ row }) => <code className="text-xs">{row.original.locale}</code>,
      },
      {
        accessorKey: "code",
        header: t("code"),
        size: 100,
        cell: ({ row }) => <code className="text-xs">{row.original.code}</code>,
      },
      {
        accessorKey: "isDefault",
        header: t("default"),
        size: 100,
        meta: { align: "center" },
        cell: ({ row }) =>
          row.original.isDefault ? (
            <Star className="mx-auto size-4 fill-amber-400 text-amber-400" />
          ) : (
            <button
              type="button"
              className="mx-auto block rounded-md p-1 text-muted-foreground hover:text-amber-500"
              title={t("setDefault")}
              onClick={() =>
                askConfirm({
                  message: t("setDefaultConfirm", { name: row.original.name }),
                  onConfirm: () => setDefaultMut.mutate({ id: row.original.id }),
                })
              }
              disabled={setDefaultMut.isPending}
            >
              <Star className="size-4" />
            </button>
          ),
      },
      {
        accessorKey: "order",
        header: t("order"),
        size: 80,
        meta: { align: "center" },
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.original.order}</span>
        ),
      },
      {
        accessorKey: "createdAt",
        header: t("createdAt"),
        size: 140,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatDate(row.original.createdAt)}
          </span>
        ),
      },
    ],
    [t, openEdit, askConfirm, setDefaultMut],
  );

  const rowActions: RowAction<LanguageRow>[] = useMemo(
    () => [
      {
        key: "edit",
        tooltip: t("editLanguage"),
        icon: <Pencil size={16} />,
        color: "success",
        onClick: (row) => openEdit(row.id),
      },
      {
        key: "delete",
        tooltip: t("deleteLanguage"),
        icon: <Trash2 size={16} />,
        color: "error",
        isHidden: (row) => row.isDefault,
        onClick: (row) => {
          askConfirm({
            message: t("deleteConfirm", { name: row.name }),
            onConfirm: () => deleteMut.mutate({ id: row.id }),
          });
        },
      },
    ],
    [t, openEdit, askConfirm, deleteMut],
  );

  return (
    <>
      <DataTable<LanguageRow>
        tableKey="languages"
        data={rows}
        columns={columns}
        rowActions={rowActions}
        isLoading={isLoading}
        rowCount={rows.length}
        pageTitle={t("title")}
        onRefresh={() => utils.viewer.languages.list.invalidate()}
        headerActions={
          <Button id="create-language" size="sm" onClick={openCreate}>
            <Plus className="mr-2 size-4" />
            {t("addLanguage")}
          </Button>
        }
        emptyState={
          <div className="py-8 text-center">
            <p className="mb-1 text-muted-foreground">{t("noLanguages")}</p>
            <p className="mb-4 text-sm text-muted-foreground/60">{t("noLanguagesSubtitle")}</p>
            <Button id="create-language-empty" size="sm" onClick={openCreate}>
              <Plus className="mr-2 size-4" />
              {t("addLanguage")}
            </Button>
          </div>
        }
      />

      {/* Botble-style alert-warning */}
      <div
        role="alert"
        className="mt-4 flex gap-3 rounded-md border p-4 text-sm"
        style={{
          backgroundColor: "color-mix(in srgb, oklch(0.96 0.04 85) 55%, transparent)",
          borderColor: "color-mix(in srgb, oklch(0.75 0.15 75) 20%, transparent)",
        }}
      >
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-500" />
        <div className="space-y-3 text-foreground">
          <p className="font-bold">{t("defaultWarning")}</p>
          <p>{t("defaultWarningDetails")}</p>
          <p>{t("defaultWarningAction")}</p>
        </div>
      </div>

      <LanguageFormDrawer
        open={drawerOpen}
        languageId={editingId}
        onClose={() => setDrawerOpen(false)}
        onSaved={() => {
          setDrawerOpen(false);
          utils.viewer.languages.list.invalidate();
        }}
      />

      <ConfirmDialog {...confirmDialogProps} />
    </>
  );
}
