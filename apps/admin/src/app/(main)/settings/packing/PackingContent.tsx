"use client";

import { MediaPickerDialog } from "@admin/components/base/MediaPickerDialog";
import type { RowAction } from "@admin/components/data-table";
import { DataTable } from "@admin/components/data-table";
import { useToast } from "@admin/components/toast-provider";
import { ConfirmDialog } from "@admin/components/ui/ConfirmDialog";
import { useConfirm } from "@admin/components/ui/useConfirm";
import { useDebounce } from "@admin/lib/hooks/useDebounce";
import { trpc } from "@admin/lib/trpc";
import { formatDate } from "@admin/utils/dateFormat";
import type { ContentStatus } from "@ecom/prisma";
import { Badge } from "@ecom/ui/components/badge";
import { Button } from "@ecom/ui/components/button";
import { Input } from "@ecom/ui/components/input";
import { Label } from "@ecom/ui/components/label";
import { PerfectScroll } from "@ecom/ui/components/perfect-scroll";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ecom/ui/components/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@ecom/ui/components/sheet";
import { Textarea } from "@ecom/ui/components/textarea";
import type { ColumnDef } from "@tanstack/react-table";
import { Image as ImageIcon, Pencil, Plus, Trash2 } from "lucide-react";
import NextImage from "next/image";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";

type PackingRow = {
  id: number;
  name: string;
  image: string | null;
  description: string | null;
  status: ContentStatus;
  createdAt: string;
};

export default function PackingContent() {
  const t = useTranslations("settings");
  const { toast } = useToast();
  const { askConfirm, dialogProps: confirmDialogProps } = useConfirm();

  // Search & Pagination State for Server-Side DataTable
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Form Drawer (Sheet) State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form Fields State
  const [name, setName] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ContentStatus>("DRAFT");

  // Media Picker State
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);

  const utils = trpc.useUtils();

  // Query & Mutations
  const { data, isLoading, isFetching } = trpc.viewer.packing.list.useQuery({
    search: debouncedSearch || undefined,
    page,
    limit,
  });

  const createMut = trpc.viewer.packing.create.useMutation({
    onSuccess: () => {
      toast(t("packing.toastCreateSuccess"), "success");
      setDialogOpen(false);
      utils.viewer.packing.list.invalidate();
    },
    onError: (err) => toast(err.message, "error"),
  });

  const updateMut = trpc.viewer.packing.update.useMutation({
    onSuccess: () => {
      toast(t("packing.toastUpdateSuccess"), "success");
      setDialogOpen(false);
      utils.viewer.packing.list.invalidate();
    },
    onError: (err) => toast(err.message, "error"),
  });

  const deleteMut = trpc.viewer.packing.delete.useMutation({
    onSuccess: () => {
      toast(t("packing.toastDeleteSuccess"), "success");
      utils.viewer.packing.list.invalidate();
    },
    onError: (err) => toast(err.message, "error"),
  });

  const rows: PackingRow[] = useMemo(() => {
    if (!data?.items) return [];
    return data.items.map((item) => ({
      id: item.id,
      name: item.name,
      image: item.image,
      description: item.description,
      status: item.status,
      createdAt:
        typeof item.createdAt === "string"
          ? item.createdAt
          : new Date(item.createdAt).toISOString(),
    }));
  }, [data]);

  // Form Action Handlers
  const openCreate = () => {
    setEditingId(null);
    setName("");
    setImage(null);
    setDescription("");
    setStatus("DRAFT");
    setDialogOpen(true);
  };

  const openEdit = useCallback(
    async (id: number) => {
      setEditingId(id);
      try {
        const item = await utils.client.viewer.packing.get.query({ id });
        setName(item.name);
        setImage(item.image);
        setDescription(item.description || "");
        setStatus(item.status);
        setDialogOpen(true);
      } catch (err: any) {
        toast(err.message || t("packing.toastLoadError"), "error");
      }
    },
    [utils, toast, t],
  );

  const handleDelete = useCallback(
    (id: number) => {
      askConfirm({
        title: t("packing.deleteConfirmTitle"),
        message: t("packing.deleteConfirmMsg"),
        onConfirm: () => {
          deleteMut.mutate({ id });
        },
      });
    },
    [askConfirm, deleteMut, t],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast(t("packing.validationName"), "error");
      return;
    }

    const payload = {
      name: name.trim(),
      image,
      description: description.trim() || null,
      status,
    };

    if (editingId) {
      updateMut.mutate({ id: editingId, ...payload });
    } else {
      createMut.mutate(payload);
    }
  };

  const handleMediaInsert = (items: any[]) => {
    if (items.length > 0) {
      const url = items[0].full_url || items[0].preview_url || "";
      setImage(url);
    }
    setMediaPickerOpen(false);
  };

  // DataTable Server-side event handler
  const onServerChange = (params: any) => {
    if (params.page !== undefined) setPage(params.page);
    if (params.pageSize !== undefined) setLimit(params.pageSize);
    if (params.search !== undefined) setSearch(params.search);
  };

  // DataTable Columns Definition
  const columns: ColumnDef<PackingRow>[] = useMemo(
    () => [
      {
        accessorKey: "id",
        header: "ID",
        size: 80,
        cell: ({ row }) => (
          <span className="text-sm font-mono text-muted-foreground">{row.original.id}</span>
        ),
      },
      {
        accessorKey: "image",
        header: t("packing.image"),
        size: 100,
        cell: ({ row }) => {
          const src = row.original.image;
          return (
            <div className="relative flex size-12 items-center justify-center overflow-hidden rounded-md border border-sys-border bg-muted">
              {src ? (
                <NextImage
                  src={src}
                  alt={row.original.name}
                  width={48}
                  height={48}
                  className="object-contain"
                />
              ) : (
                <ImageIcon className="size-5 text-muted-foreground" />
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "name",
        header: t("packing.name"),
        cell: ({ row }) => (
          <button
            type="button"
            className="cursor-pointer text-sm font-semibold text-foreground hover:text-primary transition-colors text-left"
            onClick={() => openEdit(row.original.id)}
          >
            {row.original.name}
          </button>
        ),
      },
      {
        accessorKey: "description",
        header: t("packing.description"),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground truncate max-w-[300px]">
            {row.original.description || "—"}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: t("packing.status"),
        size: 120,
        cell: ({ row }) => {
          const isActive = row.original.status === "PUBLISHED";
          return (
            <Badge variant={isActive ? "default" : "secondary"} className="font-medium">
              {isActive ? "Active" : "Inactive"}
            </Badge>
          );
        },
      },
      {
        accessorKey: "createdAt",
        header: t("packing.createdAt"),
        size: 160,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatDate(row.original.createdAt)}
          </span>
        ),
      },
    ],
    [openEdit, t],
  );

  const rowActions: RowAction<PackingRow>[] = useMemo(
    () => [
      {
        key: "edit",
        tooltip: t("packing.edit"),
        icon: <Pencil size={16} />,
        color: "success",
        onClick: (row) => openEdit(row.id),
      },
      {
        key: "delete",
        tooltip: t("packing.delete"),
        icon: <Trash2 size={16} />,
        color: "error",
        onClick: (row) => handleDelete(row.id),
      },
    ],
    [openEdit, handleDelete, t],
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Table grid */}
      <DataTable<PackingRow>
        tableKey="packing-types"
        defaultPageSize={limit}
        defaultPage={page}
        data={rows}
        columns={columns}
        rowActions={rowActions}
        isLoading={isLoading}
        isFetching={isFetching}
        onServerChange={onServerChange}
        rowCount={data?.total ?? 0}
        pageTitle={t("packing.title")}
        onRefresh={() => utils.viewer.packing.list.invalidate()}
        headerActions={
          <Button
            size="sm"
            className="bg-primary hover:opacity-90 transition-opacity"
            onClick={openCreate}
          >
            <Plus className="mr-1.5 size-4" />
            {t("packing.addBtn")}
          </Button>
        }
        emptyState={
          <div className="py-12 text-center">
            <p className="mb-2 font-medium text-muted-foreground">{t("packing.noItems")}</p>
          </div>
        }
      />

      {/* Form Drawer (Sheet) */}
      <Sheet open={dialogOpen} onOpenChange={setDialogOpen}>
        <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-[480px]">
          <SheetHeader className="border-b border-border px-6 py-4">
            <SheetTitle>{editingId ? t("packing.editTitle") : t("packing.createTitle")}</SheetTitle>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
            <PerfectScroll className="flex flex-1 flex-col px-6 py-6 overflow-y-auto">
              <div className="flex flex-col gap-5 pb-6">
                {/* Tên */}
                <div className="grid gap-2">
                  <Label htmlFor="name" className="text-sm font-semibold text-sys-primary">
                    {t("packing.lblName")} <span className="text-sys-dangerous">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder={t("packing.placeholderName")}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                {/* Hình ảnh */}
                <div className="grid gap-2">
                  <Label className="text-sm font-semibold text-sys-primary">
                    {t("packing.lblImage")}
                  </Label>
                  <div className="flex items-center gap-3">
                    <div className="relative flex size-16 items-center justify-center overflow-hidden rounded-md border border-sys-border bg-muted">
                      {image ? (
                        <NextImage
                          src={image}
                          alt="Đóng gói"
                          width={60}
                          height={60}
                          className="object-contain"
                        />
                      ) : (
                        <ImageIcon className="size-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setMediaPickerOpen(true)}
                          className="text-xs"
                        >
                          {t("packing.selectImage")}
                        </Button>
                        {image && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setImage(null)}
                            className="text-xs text-sys-dangerous hover:bg-red-50 dark:hover:bg-red-950/20"
                          >
                            {t("packing.removeImage")}
                          </Button>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {t("packing.imageHint")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Trạng thái */}
                <div className="grid gap-2">
                  <Label htmlFor="status" className="text-sm font-semibold text-sys-primary">
                    {t("packing.lblStatus")}
                  </Label>
                  <Select value={status} onValueChange={(val) => setStatus(val as ContentStatus)}>
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Chọn trạng thái" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PUBLISHED">{t("packing.statusActive")}</SelectItem>
                      <SelectItem value="DRAFT">{t("packing.statusInactive")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Mô tả */}
                <div className="grid gap-2">
                  <Label htmlFor="description" className="text-sm font-semibold text-sys-primary">
                    {t("packing.lblDescription")}
                  </Label>
                  <Textarea
                    id="description"
                    placeholder={t("packing.placeholderDescription")}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                  />
                </div>
              </div>

              {/* Footer buttons */}
              <div className="mt-auto flex gap-3 border-t border-border pt-6">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setDialogOpen(false)}
                >
                  {t("packing.cancel")}
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-primary hover:opacity-90 transition-opacity"
                  disabled={createMut.isPending || updateMut.isPending}
                >
                  {t("packing.save")}
                </Button>
              </div>
            </PerfectScroll>
          </form>
        </SheetContent>
      </Sheet>

      {/* Media Picker Dialog */}
      <MediaPickerDialog
        open={mediaPickerOpen}
        onOpenChange={setMediaPickerOpen}
        onInsert={handleMediaInsert}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog {...confirmDialogProps} />
    </div>
  );
}
