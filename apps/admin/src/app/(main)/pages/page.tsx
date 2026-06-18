"use client";
import { CustomFieldsPanel } from "@admin/components/custom-fields/CustomFieldsPanel";
import { DataTablePagination } from "@admin/components/DataTablePagination";
import { PageTranslationPanel } from "@admin/components/translation/PageTranslationPanel";
import { TranslationStatusIndicator } from "@admin/components/translation/TranslationStatusIndicator";
import { ConfirmDialog } from "@admin/components/ui/ConfirmDialog";
import { useConfirm } from "@admin/components/ui/useConfirm";
import { trpc } from "@admin/lib/trpc";
import { formatDateTime } from "@admin/utils/dateFormat";
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
import { Textarea } from "@ecom/ui/components/textarea";
import { cn } from "@ecom/ui/lib/utils";
import { AlertCircle, FileText, Pencil, Plus, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

const STATUS_OPTION_VALUES = ["ALL", "DRAFT", "PUBLISHED", "PENDING", "ARCHIVED"] as const;

const STATUS_BADGE: Record<string, string> = {
  DRAFT: "border-neutral-200 bg-neutral-100 text-neutral-600",
  PUBLISHED: "border-emerald-200 bg-emerald-100 text-emerald-800",
  PENDING: "border-amber-200 bg-amber-100 text-amber-800",
  ARCHIVED: "border-red-200 bg-red-100 text-red-800",
};

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: full CRUD page with inline editing, create form, filters, and translation panel
export default function PagesPage() {
  const t = useTranslations("pages");
  const tCommon = useTranslations("common");
  const { askConfirm, dialogProps: confirmDialogProps } = useConfirm();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newTemplate, setNewTemplate] = useState("default");
  const [newStatus, setNewStatus] = useState("DRAFT");

  const { data, isLoading } = trpc.viewer.pages.list.useQuery({
    search: search || undefined,
    status: (statusFilter as "DRAFT" | "PUBLISHED" | "PENDING" | "ARCHIVED") || undefined,
    page,
    perPage: 20,
  });
  const { data: editPage } = trpc.viewer.pages.get.useQuery(
    // biome-ignore lint/style/noNonNullAssertion: tRPC enabled-guard — query disabled when editingId is null
    { id: editingId! },
    { enabled: !!editingId },
  );
  const { data: editRevisions } = trpc.viewer.pages.revisions.useQuery(
    // biome-ignore lint/style/noNonNullAssertion: tRPC enabled-guard — query disabled when editingId is null
    { pageId: editingId! },
    { enabled: !!editingId },
  );

  const utils = trpc.useUtils();
  const createMutation = trpc.viewer.pages.create.useMutation({
    onSuccess: () => {
      utils.viewer.pages.list.invalidate();
      resetCreateForm();
    },
  });
  const updateMutation = trpc.viewer.pages.update.useMutation({
    onSuccess: () => {
      utils.viewer.pages.list.invalidate();
      utils.viewer.pages.get.invalidate();
      utils.viewer.pages.revisions.invalidate();
    },
  });
  const deleteMutation = trpc.viewer.pages.remove.useMutation({
    onSuccess: () => {
      utils.viewer.pages.list.invalidate();
      setEditingId(null);
    },
  });

  const pageIds = data?.data.map((p) => p.id) ?? [];
  const { data: translationBatchMap } = trpc.viewer.translations.batchTranslationStatus.useQuery(
    { entityType: "page", entityIds: pageIds },
    { staleTime: 30_000, enabled: pageIds.length > 0 },
  );

  function resetCreateForm() {
    setShowCreate(false);
    setNewTitle("");
    setNewSlug("");
    setNewContent("");
    setNewTemplate("default");
    setNewStatus("DRAFT");
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim() || !newSlug.trim()) return;
    createMutation.mutate({
      title: newTitle.trim(),
      slug: newSlug.trim(),
      content: newContent || undefined,
      template: newTemplate || undefined,
      status: newStatus as "DRAFT" | "PUBLISHED",
    });
  }

  function generateSlug(title: string) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
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
                {data.meta.total} total
              </Badge>
            )}
          </div>
        </div>
        <Button
          variant={showCreate ? "outline" : "default"}
          onClick={() => setShowCreate(!showCreate)}
        >
          {showCreate ? <X className="mr-2 size-4" /> : <Plus className="mr-2 size-4" />}
          {showCreate ? tCommon("cancel") : t("newPage")}
        </Button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <Card className="p-6">
          <p className="mb-4 font-semibold">{t("newPage")}</p>
          <form onSubmit={handleCreate}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="page-title">{t("fields.title")} *</Label>
                <Input
                  id="page-title"
                  value={newTitle}
                  required
                  onChange={(e) => {
                    setNewTitle(e.target.value);
                    setNewSlug(generateSlug(e.target.value));
                  }}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="page-slug">{t("fields.slug")} *</Label>
                <Input
                  id="page-slug"
                  value={newSlug}
                  required
                  onChange={(e) => setNewSlug(e.target.value)}
                />
              </div>
              <div className="col-span-full flex flex-col gap-1.5">
                <Label htmlFor="page-content">{t("fields.content")}</Label>
                <Textarea
                  id="page-content"
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t("fields.template")}</Label>
                <Select value={newTemplate} onValueChange={setNewTemplate}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">{t("template.default")}</SelectItem>
                    <SelectItem value="full-width">{t("template.full-width")}</SelectItem>
                    <SelectItem value="sidebar">{t("template.sidebar")}</SelectItem>
                    <SelectItem value="landing">{t("template.landing")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t("fields.status")}</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">{t("status.DRAFT")}</SelectItem>
                    <SelectItem value="PUBLISHED">{t("status.PUBLISHED")}</SelectItem>
                  </SelectContent>
                </Select>
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
              className="mt-4"
              disabled={createMutation.isPending || !newTitle.trim() || !newSlug.trim()}
            >
              {createMutation.isPending ? tCommon("creating") : t("createPage")}
            </Button>
          </form>
        </Card>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Input
          id="pages-search"
          placeholder={tCommon("searchPlaceholder")}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="max-w-[300px] flex-1"
        />
        <Select
          value={statusFilter || "ALL"}
          onValueChange={(v) => {
            setStatusFilter(v === "ALL" ? "" : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={t("fields.status")} />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTION_VALUES.map((val) => (
              <SelectItem key={val} value={val}>
                {val === "ALL" ? tCommon("all") : t(`status.${val}`)}
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
                  {t("fields.title")}
                </th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground sm:table-cell">
                  {t("fields.template")}
                </th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell">
                  {t("fields.status")}
                </th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground lg:table-cell">
                  {t("fields.author")}
                </th>
                <th className="hidden px-4 py-3 text-center font-medium text-muted-foreground lg:table-cell">
                  🌐
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
                    <td colSpan={6} className="px-4 py-3">
                      <Skeleton className="h-4" />
                    </td>
                  </tr>
                ))
              ) : !data?.data.length ? (
                <tr>
                  <td colSpan={6}>
                    <div className="flex flex-col items-center gap-2 py-8">
                      <FileText size={48} className="text-muted-foreground/40" />
                      <p className="text-sm text-muted-foreground">{t("noPagesTitle")}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: each row contains conditional inline edit form + revision panel
                data.data.map((pg) => (
                  <>
                    <tr key={pg.id} className="border-b border-border hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium">{pg.title}</p>
                        <p className="text-xs text-muted-foreground">
                          /{pg.slug}
                          {pg._count.children > 0 && (
                            <span className="ml-1 text-primary">{pg._count.children} children</span>
                          )}
                        </p>
                      </td>
                      <td className="hidden px-4 py-3 sm:table-cell">
                        <Badge variant="outline" className="text-xs">
                          {pg.template ?? "default"}
                        </Badge>
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell">
                        <span
                          className={cn(
                            "inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium",
                            STATUS_BADGE[pg.status] ?? STATUS_BADGE.DRAFT,
                          )}
                        >
                          {pg.status}
                        </span>
                      </td>
                      <td className="hidden px-4 py-3 lg:table-cell">
                        <span className="text-sm text-muted-foreground">
                          {pg.author?.name ?? "—"}
                        </span>
                      </td>
                      <td className="hidden px-4 py-3 lg:table-cell">
                        <TranslationStatusIndicator
                          entityType="page"
                          entityId={pg.id}
                          batchMap={translationBatchMap}
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
                            aria-label={
                              editingId === pg.id
                                ? `${t("actions.close")} ${pg.title}`
                                : `${t("actions.edit")} ${pg.title}`
                            }
                            onClick={() => setEditingId(editingId === pg.id ? null : pg.id)}
                          >
                            {editingId === pg.id ? <X size={16} /> : <Pencil size={16} />}
                          </button>
                          <button
                            type="button"
                            className="rounded-md p-1.5 text-destructive hover:bg-destructive/10"
                            aria-label={`${t("actions.delete")} ${pg.title}`}
                            disabled={deleteMutation.isPending}
                            onClick={() => {
                              askConfirm({
                                message: t("actions.deleteConfirm"),
                                onConfirm: () => deleteMutation.mutate({ id: pg.id }),
                              });
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {editingId === pg.id && editPage && (
                      <tr key={`edit-${pg.id}`}>
                        <td colSpan={6} className="bg-muted/30 px-4 py-3">
                          <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <div className="flex flex-col gap-1.5">
                              <Label htmlFor={`edit-page-title-${pg.id}`}>Title</Label>
                              <Input
                                id={`edit-page-title-${pg.id}`}
                                defaultValue={editPage.title}
                                onBlur={(e) => {
                                  if (e.target.value !== editPage.title)
                                    updateMutation.mutate({ id: pg.id, title: e.target.value });
                                }}
                              />
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <Label htmlFor={`edit-page-slug-${pg.id}`}>Slug</Label>
                              <Input
                                id={`edit-page-slug-${pg.id}`}
                                defaultValue={editPage.slug}
                                onBlur={(e) => {
                                  if (e.target.value !== editPage.slug)
                                    updateMutation.mutate({ id: pg.id, slug: e.target.value });
                                }}
                              />
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <Label>{t("fields.template")}</Label>
                              <Select
                                defaultValue={editPage.template ?? "default"}
                                onValueChange={(v) =>
                                  updateMutation.mutate({ id: pg.id, template: v })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="default">{t("template.default")}</SelectItem>
                                  <SelectItem value="full-width">
                                    {t("template.full-width")}
                                  </SelectItem>
                                  <SelectItem value="sidebar">{t("template.sidebar")}</SelectItem>
                                  <SelectItem value="landing">{t("template.landing")}</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <Label>{t("fields.status")}</Label>
                              <Select
                                defaultValue={editPage.status}
                                onValueChange={(v) =>
                                  updateMutation.mutate({
                                    id: pg.id,
                                    status: v as "DRAFT" | "PUBLISHED" | "PENDING" | "ARCHIVED",
                                  })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="DRAFT">{t("status.DRAFT")}</SelectItem>
                                  <SelectItem value="PUBLISHED">{t("status.PUBLISHED")}</SelectItem>
                                  <SelectItem value="PENDING">{t("status.PENDING")}</SelectItem>
                                  <SelectItem value="ARCHIVED">{t("status.ARCHIVED")}</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <Label htmlFor={`edit-page-content-${pg.id}`}>Content</Label>
                            <Textarea
                              id={`edit-page-content-${pg.id}`}
                              defaultValue={editPage.content ?? ""}
                              rows={5}
                              onBlur={(e) => {
                                if (e.target.value !== (editPage.content ?? ""))
                                  updateMutation.mutate({ id: pg.id, content: e.target.value });
                              }}
                            />
                          </div>
                          {editRevisions && editRevisions.length > 0 && (
                            <div className="mt-3">
                              <p className="text-xs text-muted-foreground">
                                Revisions ({editRevisions.length})
                              </p>
                              <div className="mt-1 max-h-[160px] overflow-y-auto rounded-md border border-border">
                                {editRevisions.map((rev) => (
                                  <div
                                    key={rev.id}
                                    className="flex items-center justify-between border-b border-border px-3 py-2 last:border-0"
                                  >
                                    <div>
                                      <span className="text-xs font-medium">{rev.title}</span>
                                      <span className="ml-1 text-xs text-muted-foreground">
                                        by {rev.author?.name ?? "Unknown"}
                                      </span>
                                    </div>
                                    <span className="text-xs text-muted-foreground/60">
                                      {formatDateTime(rev.createdAt)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {updateMutation.error && (
                            <div className="mt-2 flex items-center gap-2 rounded-md border border-destructive/30 bg-red-50 px-4 py-3 text-sm text-destructive dark:bg-red-950">
                              <AlertCircle className="size-4 shrink-0" />
                              {updateMutation.error.message}
                            </div>
                          )}

                          {/* Custom Fields */}
                          <div className="mt-4">
                            <p className="mb-1 text-sm font-semibold">{tCommon("customFields")}</p>
                            <CustomFieldsPanel
                              modelName="pages"
                              modelId={pg.id}
                              context={{ pageTemplate: editPage.template ?? undefined }}
                              collapsible
                            />
                          </div>

                          {/* Translations */}
                          <PageTranslationPanel
                            pageId={pg.id}
                            originalTitle={editPage.title}
                            originalSlug={editPage.slug}
                            originalContent={editPage.content ?? null}
                          />
                        </td>
                      </tr>
                    )}
                  </>
                ))
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
