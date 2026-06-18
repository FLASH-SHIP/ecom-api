"use client";

import PageBreadcrumb from "@admin/components/PageBreadcrumb";
import { ConfirmDialog } from "@admin/components/ui/ConfirmDialog";
import { useConfirm } from "@admin/components/ui/useConfirm";
import { trpc } from "@admin/lib/trpc";
import { Button } from "@ecom/ui/components/button";
import { Card } from "@ecom/ui/components/card";
import { Input } from "@ecom/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ecom/ui/components/select";
import { Skeleton } from "@ecom/ui/components/skeleton";
import { cn } from "@ecom/ui/lib/utils";
import { Folder, FolderPlus, Trash2, Upload, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useRef, useState } from "react";

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}

function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "🖼️";
  if (mimeType.startsWith("video/")) return "🎬";
  if (mimeType.startsWith("audio/")) return "🎵";
  if (mimeType === "application/pdf") return "📄";
  return "📎";
}

export default function MediaPage() {
  const t = useTranslations("media");
  const { askConfirm, dialogProps: confirmDialogProps } = useConfirm();
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
  const [folderPath, setFolderPath] = useState<{ id: number | null; name: string }[]>([
    { id: null, name: t("allFiles") },
  ]);
  const [search, setSearch] = useState("");
  const [mimeFilter, setMimeFilter] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<number[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: folders, isLoading: foldersLoading } = trpc.viewer.media.folders.list.useQuery({
    parentId: currentFolderId,
  });
  const { data: filesData, isLoading: filesLoading } = trpc.viewer.media.files.list.useQuery({
    folderId: currentFolderId,
    mimeType: mimeFilter || undefined,
    search: search || undefined,
    perPage: 30,
  });
  const { data: stats } = trpc.viewer.media.files.stats.useQuery();
  const utils = trpc.useUtils();

  const createFolderMutation = trpc.viewer.media.folders.create.useMutation({
    onSuccess: () => {
      utils.viewer.media.folders.list.invalidate();
      setNewFolderName("");
      setShowNewFolder(false);
    },
  });
  const deleteFolderMutation = trpc.viewer.media.folders.remove.useMutation({
    onSuccess: () => utils.viewer.media.folders.list.invalidate(),
  });
  const deleteFileMutation = trpc.viewer.media.files.remove.useMutation({
    onSuccess: () => {
      utils.viewer.media.files.list.invalidate();
      utils.viewer.media.files.stats.invalidate();
    },
  });
  const deleteFilesMutation = trpc.viewer.media.files.removeMany.useMutation({
    onSuccess: () => {
      utils.viewer.media.files.list.invalidate();
      utils.viewer.media.files.stats.invalidate();
      setSelectedFiles([]);
    },
  });

  const navigateToFolder = useCallback(
    (folderId: number | null, folderName: string) => {
      setCurrentFolderId(folderId);
      setSelectedFiles([]);
      if (folderId === null) {
        setFolderPath([{ id: null, name: t("allFiles") }]);
      } else {
        const existingIndex = folderPath.findIndex((p) => p.id === folderId);
        if (existingIndex >= 0) {
          setFolderPath(folderPath.slice(0, existingIndex + 1));
        } else {
          setFolderPath([...folderPath, { id: folderId, name: folderName }]);
        }
      }
    },
    [folderPath, t],
  );

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        if (currentFolderId) formData.append("folderId", currentFolderId.toString());
        await fetch("/api/upload", { method: "POST", body: formData });
      }
      utils.viewer.media.files.list.invalidate();
      utils.viewer.media.files.stats.invalidate();
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function toggleFileSelect(id: number) {
    setSelectedFiles((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]));
  }

  const isLoading = foldersLoading || filesLoading;

  return (
    <div className="flex flex-col gap-6">
      <PageBreadcrumb className="mb-0" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("subtitle")}
            {stats && (
              <span>
                {" "}
                {t("statsInfo", {
                  totalFiles: stats.totalFiles,
                  totalSize: formatFileSize(stats.totalSize),
                })}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowNewFolder(!showNewFolder)}>
            <FolderPlus className="mr-2 size-4" />
            {t("newFolder")}
          </Button>
          <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            <Upload className="mr-2 size-4" />
            {uploading ? t("uploading") : t("upload")}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleUpload}
            accept="image/*,video/*,audio/*,.pdf"
          />
        </div>
      </div>

      {/* New Folder Form */}
      {showNewFolder && (
        <Card>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (newFolderName.trim())
                createFolderMutation.mutate({
                  name: newFolderName.trim(),
                  parentId: currentFolderId,
                });
            }}
            className="flex items-center gap-2 p-4"
          >
            <Input
              id="new-folder-name"
              placeholder={t("folderName")}
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="max-w-[280px]"
            />
            <Button
              type="submit"
              size="sm"
              disabled={createFolderMutation.isPending || !newFolderName.trim()}
            >
              {t("newFolder")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setShowNewFolder(false);
                setNewFolderName("");
              }}
            >
              <X className="size-4" />
            </Button>
          </form>
        </Card>
      )}

      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1 text-sm">
        {folderPath.map((crumb, index) => (
          <span key={crumb.id ?? "root"} className="flex items-center gap-1">
            {index > 0 && <span className="text-muted-foreground/50">/</span>}
            <button
              type="button"
              className={cn(
                "hover:underline",
                index === folderPath.length - 1
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground",
              )}
              onClick={() => navigateToFolder(crumb.id, crumb.name)}
            >
              {crumb.name}
            </button>
          </span>
        ))}
      </nav>

      {/* Filters & Bulk */}
      <div className="flex items-center gap-3">
        <Input
          id="media-search"
          placeholder={t("searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-[240px]"
        />
        <Select
          value={mimeFilter || "ALL"}
          onValueChange={(v) => setMimeFilter(v === "ALL" ? "" : v)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={t("typeFilter")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("allTypes")}</SelectItem>
            <SelectItem value="image/">{t("images")}</SelectItem>
            <SelectItem value="video/">{t("videos")}</SelectItem>
            <SelectItem value="audio/">{t("audio")}</SelectItem>
            <SelectItem value="application/pdf">{t("pdf")}</SelectItem>
          </SelectContent>
        </Select>
        {selectedFiles.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => {
              askConfirm({
                message: t("deleteSelectedConfirm", { count: selectedFiles.length }),
                onConfirm: () => deleteFilesMutation.mutate({ ids: selectedFiles }),
              });
            }}
            disabled={deleteFilesMutation.isPending}
          >
            <Trash2 className="mr-2 size-4" />
            {t("deleteSelected", { count: selectedFiles.length })}
          </Button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton loading array — items have no stable IDs
            <Skeleton key={i} className="aspect-square rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Folders */}
          {folders && folders.length > 0 && (
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("folders")}
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {folders.map((folder) => (
                  <Card
                    key={folder.id}
                    className="group relative flex cursor-pointer flex-col items-center gap-2 p-4 transition-all hover:border-primary hover:shadow-md"
                    onClick={() => navigateToFolder(folder.id, folder.name)}
                  >
                    <Folder size={40} className="text-muted-foreground" />
                    <p className="w-full truncate text-center text-sm font-medium">{folder.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("fileCount", { count: folder._count.files })}
                    </p>
                    <button
                      type="button"
                      className="absolute right-1 top-1 rounded-md p-1 text-destructive opacity-0 transition-opacity hover:bg-destructive/10 group-hover:opacity-100"
                      aria-label={t("deleteFolder")}
                      onClick={(e) => {
                        e.stopPropagation();
                        askConfirm({
                          message: t("deleteFolderConfirm", { name: folder.name }),
                          onConfirm: () => deleteFolderMutation.mutate({ id: folder.id }),
                        });
                      }}
                    >
                      <X size={14} />
                    </button>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Files */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("filesSection")} {filesData?.meta.total ? `(${filesData.meta.total})` : ""}
            </p>
            {!filesData?.data.length ? (
              <Card className="border-dashed py-8 text-center">
                <p className="mb-1 text-4xl">📂</p>
                <p className="text-sm text-muted-foreground">{t("noFiles")}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {t("uploadFiles")}
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {filesData.data.map((file) => {
                  const isSelected = selectedFiles.includes(file.id);
                  return (
                    <Card
                      key={file.id}
                      className={cn(
                        "group relative overflow-hidden",
                        isSelected && "ring-2 ring-primary",
                      )}
                    >
                      {/* Selection */}
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleFileSelect(file.id)}
                        className={cn(
                          "absolute left-2 top-2 z-10 size-4 rounded border-border text-primary transition-opacity",
                          isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                        )}
                      />
                      {/* Preview */}
                      <div className="flex aspect-square items-center justify-center overflow-hidden bg-muted/50">
                        {file.mimeType.startsWith("image/") ? (
                          // biome-ignore lint/performance/noImgElement: dynamic CDN URL — dimensions unknown at build time
                          <img
                            src={file.url}
                            alt={file.alt ?? file.name}
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-4xl">{getFileIcon(file.mimeType)}</span>
                        )}
                      </div>
                      {/* Info */}
                      <div className="p-2">
                        <p className="truncate text-xs font-medium" title={file.name}>
                          {file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                      </div>
                      {/* Delete hover */}
                      <button
                        type="button"
                        className="absolute right-1 top-1 rounded-md bg-background p-1 text-destructive opacity-0 transition-opacity hover:bg-destructive/10 group-hover:opacity-100"
                        aria-label={t("deleteFile")}
                        onClick={() => {
                          askConfirm({
                            message: t("deleteFileConfirm", { name: file.name }),
                            onConfirm: () => deleteFileMutation.mutate({ id: file.id }),
                          });
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
      <ConfirmDialog {...confirmDialogProps} />
    </div>
  );
}
