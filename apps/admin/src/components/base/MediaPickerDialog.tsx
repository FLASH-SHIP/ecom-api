"use client";

import { type ReactNode, useCallback, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogClose } from "@ecom/ui/components/dialog";
import { Separator } from "@ecom/ui/components/separator";
import { ButtonField } from "@admin/app/(main)/media/components/Compat";
import { Globe, Filter, X } from "lucide-react";
import ListButtonActionMedia from "@admin/app/(main)/media/components/ListButtonActionMedia";
import MediaContent from "@admin/app/(main)/media/components/MediaContent";
import type { MediaItem, MediaOption } from "@admin/app/(main)/media/model/media.model";
import {
  MediaAction,
  MediaItemType,
  MediaPickerFilter,
  MEDIA_PICKER_MIME_MAP,
} from "@admin/app/(main)/media/model/media.model";

import { useMutationMediaAction } from "@admin/app/(main)/media/api/hook";
import { showToast, ToastType } from "@admin/components/toast-provider";
import { useQueryClient } from "@tanstack/react-query";
import { MediaDataKeys } from "@admin/app/(main)/media/api/queries";
import { useTranslations } from "next-intl";

export interface MediaPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (items: MediaItem[]) => void;
  /**
   * Filter files by media type. Defaults to ALL (no filtering).
   * Use MediaPickerFilter.IMAGE for images only, SPREADSHEET for CSV/Excel, etc.
   */
  mediaFilter?: MediaPickerFilter;
}

/**
 * A reusable media picker dialog that wraps the full Media page functionality.
 * Used to browse, select, and insert media items into editors or image pickers.
 */
export function MediaPickerDialog({
  open,
  onOpenChange,
  onInsert,
  mediaFilter = MediaPickerFilter.ALL,
}: MediaPickerDialogProps): ReactNode {
  const t = useTranslations();
  const defaultViewMedia: MediaOption = useMemo(
    () => ({ label: t("media.allMedia"), value: "all_media", icon: Globe }),
    [t],
  );
  const defaultFilterOption: MediaOption = useMemo(
    () => ({ label: t("media.everything"), value: "everything", icon: Filter }),
    [t],
  );
  const [currentFolderId, setCurrentFolderId] = useState<number | string>(0);
  const [selectedViewMedia, setSelectedViewMedia] = useState<MediaOption>(defaultViewMedia);
  const [selectedFilterType, setSelectedFilterType] = useState<MediaOption>(defaultFilterOption);
  const [search, setSearch] = useState("");
  const [selectedItems, setSelectedItems] = useState<MediaItem[]>([]);
  const queryClient = useQueryClient();

  const { mutate: doEmptyTrash, isPending: emptyTrashLoading } = useMutationMediaAction({
    onSuccess: () => {
      showToast(ToastType.SUCCESS, t("media.trashEmptied"));
      queryClient.invalidateQueries({ queryKey: MediaDataKeys.all });
    },
    onError: () => {
      showToast(ToastType.ERROR, t("media.trashEmptyFailed"));
    },
  });

  const handleEmptyTrash = useCallback(() => {
    doEmptyTrash({ action: MediaAction.EMPTY_TRASH, selected: [] });
  }, [doEmptyTrash]);

  const viewIn = selectedViewMedia.value as "all_media" | "trash" | "recent" | "favorites";

  /** Track selected items from MediaContent */
  const handleSelectionChange = useCallback((items: MediaItem[]) => {
    setSelectedItems(items);
  }, []);

  const handleInsert = useCallback(() => {
    // Filter out folders — only insert file items
    let fileItems = selectedItems.filter((item) => item.type !== MediaItemType.FOLDER);
    // Apply mediaFilter — validate selected files match expected types
    if (mediaFilter !== MediaPickerFilter.ALL) {
      const mimePatterns = MEDIA_PICKER_MIME_MAP[mediaFilter];
      if (mimePatterns.length > 0) {
        fileItems = fileItems.filter((item) => {
          const mime = item.mime_type?.toLowerCase() ?? "";
          return mimePatterns.some((p) => (p.endsWith("/") ? mime.startsWith(p) : mime === p));
        });
      }
    }
    if (fileItems.length === 0) {
      showToast(ToastType.ERROR, t("media.selectFileToInsert"));
      return;
    }
    onInsert(fileItems);
    onOpenChange(false);
    // Reset state
    setSelectedItems([]);
    setCurrentFolderId(0);
    setSearch("");
  }, [selectedItems, onInsert, onOpenChange, mediaFilter, t]);

  const handleCancel = useCallback(() => {
    onOpenChange(false);
    setSelectedItems([]);
  }, [onOpenChange]);

  // Reset state when dialog closes
  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        setSelectedItems([]);
        setCurrentFolderId(0);
        setSearch("");
      }
      onOpenChange(next);
    },
    [onOpenChange],
  );

  const fileCount = selectedItems.filter((i) => i.type !== MediaItemType.FOLDER).length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-full h-full max-w-full md:max-w-[90vw] md:w-[90vw] md:h-[85vh] p-0 overflow-hidden rounded-none md:rounded-[0.875rem] border-0 md:border md:border-[#e5e7eb] [&>button]:hidden flex flex-col">
        {/* Header */}
        <div className="relative px-4 md:px-6 pt-3 md:pt-4 pb-2 md:pb-3 shrink-0">
          <DialogTitle
            className="text-[1.5rem] font-semibold"
            style={{ color: "var(--admin-text-color)" }}
          >
            {t("media.mediaGallery")}
          </DialogTitle>
          <DialogClose asChild>
            <ButtonField
              variant="ghost"
              className="absolute right-6 top-4 rounded-md p-2 hover:bg-muted cursor-pointer h-auto w-auto"
              style={{ color: "var(--admin-text-color)" }}
              aria-label="Close"
            >
              <X width={24} height={24} />
            </ButtonField>
          </DialogClose>
        </div>

        <Separator />

        {/* Toolbar */}
        <div className="px-3 md:px-4 pb-0 md:pb-2 shrink-0">
          <ListButtonActionMedia
            currentFolderId={currentFolderId}
            selectedViewMedia={selectedViewMedia}
            onViewMediaChange={setSelectedViewMedia}
            selectedFilterType={selectedFilterType}
            onFilterTypeChange={setSelectedFilterType}
            onSearch={setSearch}
            viewIn={viewIn}
            onEmptyTrash={handleEmptyTrash}
            emptyTrashLoading={emptyTrashLoading}
          />
        </div>

        <Separator />

        {/* Media content area */}
        <div className="flex-1 overflow-hidden">
          <MediaContent
            currentFolderId={currentFolderId}
            onFolderChange={setCurrentFolderId}
            viewIn={viewIn}
            filter={selectedFilterType.value}
            search={search}
            onSelectionChange={handleSelectionChange}
            mediaFilter={mediaFilter}
          />
        </div>

        <Separator />

        {/* Footer with Cancel and Insert buttons */}
        <div className="px-4 md:px-6 py-1.5 md:py-3 shrink-0 flex items-center justify-end gap-3">
          <ButtonField
            variant="outline"
            onClick={handleCancel}
            className="h-[2.5rem] px-6 rounded-[0.625rem] cursor-pointer"
            style={{ color: "var(--admin-text-color)" }}
          >
            {t("media.cancel")}
          </ButtonField>
          <ButtonField
            onClick={handleInsert}
            disabled={fileCount === 0}
            className="h-[2.5rem] px-6 rounded-[0.625rem] bg-[#e74c3c] hover:bg-[#c0392b] text-white cursor-pointer disabled:opacity-50"
          >
            {t("media.insert")}
            {fileCount > 0 ? ` (${fileCount})` : ""}
          </ButtonField>
        </div>
      </DialogContent>
    </Dialog>
  );
}
