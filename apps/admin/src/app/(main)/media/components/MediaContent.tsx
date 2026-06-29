"use client";

import PaginationBar from "@admin/components/base/PaginationBar";
import type { PreviewItem } from "@admin/components/base/PreviewDialog";
import PreviewDialog from "@admin/components/base/PreviewDialog";
import ConfirmDeleteModal from "@admin/components/layouts/ConfirmDeleteModal";
import { showToast, ToastType } from "@admin/components/toast-provider";
import { Separator } from "@ecom/ui/components/separator";
import { cn } from "@ecom/ui/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowDownAZ, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
/* eslint-disable no-console */
import { type MouseEvent, type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { useMediaList, useMutationMediaAction } from "../api/hook";
import { MediaDataKeys } from "../api/queries";
import type {
  BreadcrumbSegment,
  ContextMenuState,
  MediaFileItem,
  MediaFolderItem,
  MediaItem,
  SortOption,
} from "../model/media.model";
import {
  MEDIA_PICKER_MIME_MAP,
  MediaAction,
  MediaItemType,
  MediaPickerFilter,
  ViewMode,
} from "../model/media.model";
import CropDialog from "./CropDialog";
import MediaContextMenu from "./MediaContextMenu";
import MediaDetailSidebar from "./MediaDetailSidebar";
import MediaGrid from "./MediaGrid";
import MediaItemEditDialog from "./MediaItemEditDialog";
import MediaList from "./MediaList";
import MediaToolbar from "./MediaToolbar";
import MoveDialog from "./MoveDialog";
import PropertiesDialog from "./PropertiesDialog";
import ShareDialog from "./ShareDialog";

// Default sort option — value only, label will be set by MediaToolbar
const DEFAULT_SORT: SortOption = { label: "File name - ASC", value: "name-asc", icon: ArrowDownAZ };

// ── Mappers: API → UI ───────────────────────────────────────

/** Map a file API object → MediaItem for grid/list rendering */
const mapFileToMediaItem = (file: MediaFileItem): MediaItem => {
  const type = (file.type as MediaItemType) || MediaItemType.IMAGE;
  return {
    _uid: `${type}:${file.id}`,
    id: file.id,
    name: file.name,
    type,
    size: file.size,
    full_url: file.full_url,
    thumbnailUrl: file.preview_url || file.full_url,
    alt: file.alt,
    mime_type: file.mime_type,
    basename: file.basename,
    preview_url: file.preview_url,
    indirect_url: file.indirect_url,
    created_at: file.created_at,
    updated_at: file.updated_at,
  };
};

/** Map a folder API object → MediaItem for grid/list rendering */
const mapFolderToMediaItem = (folder: MediaFolderItem): MediaItem => ({
  _uid: `folder:${folder.id}`,
  id: String(folder.id),
  name: folder.name,
  type: MediaItemType.FOLDER,
  created_at: folder.created_at ?? "",
  updated_at: folder.updated_at ?? "",
  color: folder.color,
});

import type { MediaContentProps } from "../model/media.model";

const MediaContent = ({
  currentFolderId,
  onFolderChange,
  viewIn,
  filter,
  search,
  onSelectionChange,
  mediaFilter,
}: MediaContentProps): ReactNode => {
  // ── State ───────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.GRID);
  const [selectedItems, setSelectedItems] = useState<MediaItem[]>([]);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedSort, setSelectedSort] = useState<SortOption>(DEFAULT_SORT);
  const t = useTranslations("media");
  const tGlobal = useTranslations();

  // ── Trash confirm state ─────────────────────────────────────
  const [trashConfirmOpen, setTrashConfirmOpen] = useState(false);
  const [trashItems, setTrashItems] = useState<MediaItem[]>([]);

  // ── Rename dialog state ────────────────────────────────────
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameItems, setRenameItems] = useState<MediaItem[]>([]);

  // ── Alt Text dialog state ──────────────────────────────────
  const [altTextDialogOpen, setAltTextDialogOpen] = useState(false);
  const [altTextItems, setAltTextItems] = useState<MediaItem[]>([]);

  // ── Share dialog state ────────────────────────────────────
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareItems, setShareItems] = useState<MediaItem[]>([]);

  // ── Move dialog state ─────────────────────────────────────
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [moveItems, setMoveItems] = useState<MediaItem[]>([]);

  // ── Properties dialog state ─────────────────────────────
  const [propertiesDialogOpen, setPropertiesDialogOpen] = useState(false);
  const [propertiesItems, setPropertiesItems] = useState<MediaItem[]>([]);

  // ── Crop dialog state ───────────────────────────────────
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [cropItem, setCropItem] = useState<MediaItem | null>(null);

  // ── Delete permanently dialog state ────────────────────
  const [deletePermanentlyConfirmOpen, setDeletePermanentlyConfirmOpen] = useState(false);
  const [deletePermanentlyItems, setDeletePermanentlyItems] = useState<MediaItem[]>([]);

  // ── Preview dialog state ───────────────────────────────
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);

  const queryClient = useQueryClient();

  const { mutate: doMediaAction, isPending: isActionPending } = useMutationMediaAction({
    onSuccess: () => {
      showToast(ToastType.SUCCESS, t("actionSuccess"));
      // Close any open modals/dialogs
      setTrashConfirmOpen(false);
      setTrashItems([]);
      setRenameDialogOpen(false);
      setRenameItems([]);
      setAltTextDialogOpen(false);
      setAltTextItems([]);
      setMoveDialogOpen(false);
      setMoveItems([]);
      setPropertiesDialogOpen(false);
      setPropertiesItems([]);
      setCropDialogOpen(false);
      setCropItem(null);
      setDeletePermanentlyConfirmOpen(false);
      setDeletePermanentlyItems([]);
      setSelectedItems([]);
      setShowSidebar(false);
      queryClient.invalidateQueries({ queryKey: MediaDataKeys.all });
    },
    onError: (error: any) => {
      showToast(ToastType.ERROR, error?.response?.data?.message);
    },
  });

  // ── API Call ────────────────────────────────────────────────
  const { data: apiResponse, isFetching } = useMediaList({
    folder_id: currentFolderId,
    view_in: viewIn,
    page,
    sort_by: selectedSort.value,
    filter,
    search,
  });

  // ── Derived data from API ─────────────────────────────────
  const folderItems: MediaItem[] = useMemo(() => {
    if (!apiResponse?.data) return [];
    return (apiResponse.data.folders ?? []).map(mapFolderToMediaItem);
  }, [apiResponse]);

  const fileItems: MediaItem[] = useMemo(() => {
    if (!apiResponse?.data) return [];
    let files = (apiResponse.data.files ?? []).map(mapFileToMediaItem);
    // Filter by mediaFilter enum if provided
    if (mediaFilter && mediaFilter !== MediaPickerFilter.ALL) {
      const mimePatterns = MEDIA_PICKER_MIME_MAP[mediaFilter];
      if (mimePatterns.length > 0) {
        files = files.filter((f) => {
          const mime = f.mime_type?.toLowerCase() ?? "";
          return mimePatterns.some((p) => (p.endsWith("/") ? mime.startsWith(p) : mime === p));
        });
      }
    }
    return files;
  }, [apiResponse, mediaFilter]);

  const breadcrumb: BreadcrumbSegment[] = useMemo(() => {
    if (!apiResponse?.data?.breadcrumbs) {
      return [{ label: "All media", folderId: 0 }];
    }
    return apiResponse.data.breadcrumbs.map((bc) => ({
      label: bc.name,
      folderId: bc.id,
    }));
  }, [apiResponse]);

  const isRoot = breadcrumb.length <= 1;

  // ── Notify parent of selection changes ──────────────────────
  useEffect(() => {
    onSelectionChange?.(selectedItems);
  }, [selectedItems, onSelectionChange]);

  // ── Handlers ────────────────────────────────────────────────

  /**
   * Click item:
   * - Bình thường: chọn 1 item (bỏ chọn tất cả rồi chọn mới)
   * - Cmd/Ctrl + click: toggle thêm/bớt item trong danh sách đã chọn
   * - null: bỏ chọn tất cả (click vùng trống)
   */
  const handleSelect = useCallback((item: MediaItem | null, multi?: boolean) => {
    if (!item) {
      setSelectedItems([]);
      setContextMenu(null);
      return;
    }

    if (multi) {
      // Toggle item trong danh sách
      setSelectedItems((prev) => {
        const exists = prev.some((i) => i._uid === item._uid);
        if (exists) {
          return prev.filter((i) => i._uid !== item._uid);
        }
        return [...prev, item];
      });
    } else {
      // Chọn 1 item duy nhất — không toggle off để tránh conflict với double-click
      setSelectedItems([item]);
    }
    setContextMenu(null);
  }, []);

  /** Double-click: open folder (navigate) or preview file */
  const handleOpen = useCallback(
    (item: MediaItem) => {
      if (item.type === MediaItemType.FOLDER) {
        console.log("Open folder:", item.name, "id:", item.id);
        onFolderChange(item.id);
        setSelectedItems([]);
        setPage(1);
      } else {
        console.log("Open file (preview):", item.name);
      }
    },
    [onFolderChange],
  );

  /** Back button ("...") → navigate to parent folder */
  // `js-early-exit` — guard clause
  const handleBack = useCallback(() => {
    if (breadcrumb.length <= 1) return;
    const parentBc = breadcrumb[breadcrumb.length - 2];
    onFolderChange(parentBc.folderId);
    setSelectedItems([]);
    setPage(1);
    console.log("Navigate back to:", parentBc.label, "id:", parentBc.folderId);
  }, [breadcrumb, onFolderChange]);

  /** Breadcrumb click → navigate to that folder level */
  // `js-early-exit` — guard clause
  const handleBreadcrumbNavigate = useCallback(
    (index: number) => {
      if (index >= breadcrumb.length - 1) return;
      const target = breadcrumb[index];
      onFolderChange(target.folderId);
      setSelectedItems([]);
      setPage(1);
      console.log("Breadcrumb navigate to:", target.label, "id:", target.folderId);
    },
    [breadcrumb, onFolderChange],
  );

  const handleContextMenu = useCallback((e: MouseEvent, item: MediaItem) => {
    e.preventDefault();
    // Nếu item chưa được chọn → chọn chỉ nó, nếu đã chọn → giữ nguyên multi selection
    setSelectedItems((prev) => {
      const alreadySelected = prev.some((i) => i._uid === item._uid);
      if (alreadySelected) return prev; // Giữ multi selection
      return [item]; // Chỉ chọn item mới
    });
    setContextMenu({ item, position: { x: e.clientX, y: e.clientY } });
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  /** Callback khi user chọn "Move to trash" từ context menu */
  const handleTrashRequest = useCallback((items: MediaItem[]) => {
    setTrashItems(items);
    setTrashConfirmOpen(true);
  }, []);

  /** Callback khi user chọn "Rename" từ context menu */
  const handleRenameRequest = useCallback((items: MediaItem[]) => {
    setRenameItems(items);
    setRenameDialogOpen(true);
  }, []);

  /** Callback khi user chọn "ALT text" từ context menu */
  const handleAltTextRequest = useCallback((items: MediaItem[]) => {
    setAltTextItems(items);
    setAltTextDialogOpen(true);
  }, []);

  /** Callback khi user chọn "Share" từ context menu */
  const handleShareRequest = useCallback((items: MediaItem[]) => {
    setShareItems(items);
    setShareDialogOpen(true);
  }, []);

  /** Callback khi user chọn "Move" từ context menu */
  const handleMoveRequest = useCallback((items: MediaItem[]) => {
    setMoveItems(items);
    setMoveDialogOpen(true);
  }, []);

  /** Callback khi user chọn "Properties" từ context menu */
  const handlePropertiesRequest = useCallback((items: MediaItem[]) => {
    setPropertiesItems(items);
    setPropertiesDialogOpen(true);
  }, []);

  /** Callback khi user chọn "Crop" từ context menu */
  const handleCropRequest = useCallback((item: MediaItem) => {
    setCropItem(item);
    setCropDialogOpen(true);
  }, []);

  /** Callback khi user chọn "Make a copy" từ context menu — gọi API trực tiếp */
  const handleMakeCopyRequest = useCallback(
    (items: MediaItem[]) => {
      doMediaAction({
        action: MediaAction.MAKE_COPY,
        selected: items.map((item) => {
          const isFolder = item.type === MediaItemType.FOLDER;
          return {
            id: item.id,
            is_folder: isFolder,
            ...(isFolder ? {} : { full_url: item.full_url }),
          };
        }),
      });
    },
    [doMediaAction],
  );

  /** Callback khi user chọn "Add to favorite" từ context menu */
  const handleFavoriteRequest = useCallback(
    (items: MediaItem[]) => {
      doMediaAction({
        action: MediaAction.FAVORITE,
        selected: items.map((item) => {
          const isFolder = item.type === MediaItemType.FOLDER;
          return {
            id: item.id,
            is_folder: isFolder,
            ...(isFolder ? {} : { full_url: item.full_url }),
          };
        }),
      });
    },
    [doMediaAction],
  );

  /** Callback khi user chọn "Restore" từ context menu */
  const handleRestoreRequest = useCallback(
    (items: MediaItem[]) => {
      doMediaAction({
        action: MediaAction.RESTORE,
        selected: items.map((item) => {
          const isFolder = item.type === MediaItemType.FOLDER;
          return {
            id: item.id,
            is_folder: isFolder,
            ...(isFolder ? {} : { full_url: item.full_url }),
          };
        }),
      });
    },
    [doMediaAction],
  );

  /** Submit trash API */
  const handleTrashConfirm = useCallback(() => {
    doMediaAction({
      action: MediaAction.TRASH,
      selected: trashItems.map((item) => ({
        id: item.id,
        is_folder: item.type === MediaItemType.FOLDER,
      })),
    });
  }, [trashItems, doMediaAction]);

  /** Callback khi user chọn "Delete permanently" từ context menu */
  const handleDeletePermanentlyRequest = useCallback((items: MediaItem[]) => {
    setDeletePermanentlyItems(items);
    setDeletePermanentlyConfirmOpen(true);
  }, []);

  /** Submit delete permanently API */
  const handleDeletePermanentlyConfirm = useCallback(() => {
    doMediaAction({
      action: MediaAction.DELETE,
      selected: deletePermanentlyItems.map((item) => ({
        id: item.id,
        is_folder: item.type === MediaItemType.FOLDER,
      })),
      skip_trash: false,
    });
  }, [deletePermanentlyItems, doMediaAction]);

  /** Callback khi user chọn "Preview" từ context menu */
  const handlePreviewRequest = useCallback(
    (item: MediaItem) => {
      // Only preview selected items (or the single clicked item)
      const itemsToPreview =
        selectedItems.length > 0 && selectedItems.some((s) => s._uid === item._uid)
          ? selectedItems.filter((s) => s.type !== MediaItemType.FOLDER)
          : [item];
      const mapped: PreviewItem[] = itemsToPreview.map((f: MediaItem) => ({
        url: f.preview_url || f.full_url || f.thumbnailUrl || "",
        downloadUrl: f.full_url || "",
        name: f.name,
        mimeType: f.mime_type,
      }));
      const idx = itemsToPreview.findIndex((f: MediaItem) => f._uid === item._uid);
      setPreviewItems(mapped);
      setPreviewIndex(idx >= 0 ? idx : 0);
      setPreviewOpen(true);
    },
    [selectedItems],
  );

  // `rerender-derived-state-no-effect` — derive during render
  const lastSelectedItem = useMemo(
    () => (selectedItems.length > 0 ? selectedItems[selectedItems.length - 1] : null),
    [selectedItems],
  );

  // `rerender-memo-with-default-value` — hoist inline callback
  const handleSortChange = useCallback((option: SortOption) => {
    setSelectedSort(option);
    setPage(1);
  }, []);

  // ── Render ──────────────────────────────────────────────────
  return (
    <div
      className={cn(
        "relative h-full overflow-hidden bg-background",
        isFullscreen && "fixed inset-0 z-[60] p-4",
      )}
    >
      {/* Main content — luôn chiếm full width */}
      <div className="flex flex-col h-full">
        <MediaToolbar
          breadcrumb={breadcrumb}
          onBreadcrumbNavigate={handleBreadcrumbNavigate}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          selectedSort={selectedSort}
          onSortChange={handleSortChange}
          selectedItems={selectedItems}
          onTrashRequest={handleTrashRequest}
          onRenameRequest={handleRenameRequest}
          onAltTextRequest={handleAltTextRequest}
          onShareRequest={handleShareRequest}
          onMoveRequest={handleMoveRequest}
          onPreviewRequest={handlePreviewRequest}
          onCropRequest={handleCropRequest}
          onMakeCopyRequest={handleMakeCopyRequest}
          onFavoriteRequest={handleFavoriteRequest}
          onRestoreRequest={handleRestoreRequest}
          onDeletePermanentlyRequest={handleDeletePermanentlyRequest}
          onOpenFolder={handleOpen}
          viewIn={viewIn}
          showSidebar={showSidebar}
          onToggleSidebar={() => setShowSidebar((prev) => !prev)}
          isFullscreen={isFullscreen}
          onToggleFullscreen={() => setIsFullscreen((prev) => !prev)}
        />

        <Separator />

        {/* Content area + detail sidebar container */}
        <div className="flex-1 min-h-0 overflow-hidden relative">
          {/* Scrollable content */}
          <div
            className="h-full overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedItems([]);
            }}
          >
            {/* `rendering-conditional-render` — ternary */}
            {isFetching ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
              </div>
            ) : null}

            {viewMode === ViewMode.GRID ? (
              <MediaGrid
                folders={folderItems}
                files={fileItems}
                selectedItems={selectedItems}
                showBackButton={!isRoot}
                onSelect={handleSelect}
                onOpen={handleOpen}
                onBack={handleBack}
                onContextMenu={handleContextMenu}
              />
            ) : (
              <MediaList
                folders={folderItems}
                files={fileItems}
                selectedItems={selectedItems}
                showBackButton={!isRoot}
                onSelect={handleSelect}
                onOpen={handleOpen}
                onBack={handleBack}
                onContextMenu={handleContextMenu}
              />
            )}
          </div>

          {/* Right sidebar — overlay inside content area only */}
          <div
            className={`absolute top-0 right-0 h-full w-[75%] md:w-[17.5rem] bg-background border-l shadow-lg transition-transform duration-200 z-20 ${
              showSidebar ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <MediaDetailSidebar item={lastSelectedItem} onClose={() => setShowSidebar(false)} />
          </div>
        </div>

        {/* Pagination — fixed footer */}
        {apiResponse?.data?.pagination ? (
          <>
            <Separator />
            <PaginationBar pagination={apiResponse.data.pagination} onPageChange={setPage} />
          </>
        ) : null}
      </div>

      {/* Context menu overlay — `rendering-conditional-render` */}
      {contextMenu ? (
        <MediaContextMenu
          item={contextMenu.item}
          selectedItems={selectedItems}
          position={contextMenu.position}
          onClose={handleCloseContextMenu}
          onTrashRequest={handleTrashRequest}
          onRenameRequest={handleRenameRequest}
          onAltTextRequest={handleAltTextRequest}
          onShareRequest={handleShareRequest}
          onMoveRequest={handleMoveRequest}
          onPropertiesRequest={handlePropertiesRequest}
          onCropRequest={handleCropRequest}
          onMakeCopyRequest={handleMakeCopyRequest}
          onFavoriteRequest={handleFavoriteRequest}
          onRestoreRequest={handleRestoreRequest}
          onDeletePermanentlyRequest={handleDeletePermanentlyRequest}
          onPreviewRequest={handlePreviewRequest}
          onOpenFolder={handleOpen}
          viewIn={viewIn}
        />
      ) : null}

      {/* Preview dialog */}
      <PreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        items={previewItems}
        initialIndex={previewIndex}
      />

      {/* Trash confirm modal */}
      <ConfirmDeleteModal
        open={trashConfirmOpen}
        onOpenChange={setTrashConfirmOpen}
        onConfirm={handleTrashConfirm}
        loading={isActionPending}
        title={tGlobal("common.confirmDelete")}
        description={
          <div>
            <p>
              Do you really want to delete {trashItems.length > 1 ? "these items" : "this item"}?
            </p>
            <div className="mt-2 flex flex-col gap-1">
              {trashItems.map((item) => (
                <p key={item._uid} className="font-semibold text-[#1f2a37] break-all">
                  {item.name}
                </p>
              ))}
            </div>
          </div>
        }
        confirmLabel={tGlobal("common.delete")}
        cancelLabel={tGlobal("common.cancel")}
      />

      {/* Delete permanently confirm modal */}
      <ConfirmDeleteModal
        open={deletePermanentlyConfirmOpen}
        onOpenChange={setDeletePermanentlyConfirmOpen}
        onConfirm={handleDeletePermanentlyConfirm}
        loading={isActionPending}
        title={t("deleteItems")}
        description="This action is irreversible. Are you sure you want to delete these items?"
        confirmLabel={t("confirm")}
        cancelLabel={tGlobal("common.close")}
      />

      {/* Rename dialog */}
      <MediaItemEditDialog
        open={renameDialogOpen}
        onOpenChange={setRenameDialogOpen}
        items={renameItems}
        title="Rename"
        field={{
          key: "name",
          placeholder: "Enter new name...",
          getInitialValue: (item) => item.name,
        }}
        checkbox={{
          key: "rename_physical_file",
          getLabel: (item) =>
            item.type === MediaItemType.FOLDER
              ? "Rename physical folder name on disk too"
              : "Rename physical file name on disk too",
        }}
        onSubmit={(data, dialogItems) => {
          doMediaAction({
            action: MediaAction.RENAME,
            selected: dialogItems.map((item) => ({
              id: item.id,
              is_folder: item.type === MediaItemType.FOLDER,
              name: data[item._uid].value,
              rename_physical_file: data[item._uid].checked,
            })),
          });
        }}
        loading={isActionPending}
      />

      {/* Alt Text dialog */}
      <MediaItemEditDialog
        open={altTextDialogOpen}
        onOpenChange={setAltTextDialogOpen}
        items={altTextItems}
        title="ALT Text"
        field={{
          key: "alt",
          placeholder: "Enter alt text...",
          getInitialValue: (item) => item.alt || "",
        }}
        onSubmit={(data, dialogItems) => {
          doMediaAction({
            action: MediaAction.ALT_TEXT,
            selected: dialogItems.map((item) => ({
              id: item.id,
              alt: data[item._uid].value,
            })),
          });
        }}
        loading={isActionPending}
      />

      {/* Share dialog */}
      <ShareDialog open={shareDialogOpen} onOpenChange={setShareDialogOpen} items={shareItems} />

      {/* Move dialog */}
      <MoveDialog
        open={moveDialogOpen}
        onOpenChange={setMoveDialogOpen}
        items={moveItems}
        onSubmit={(dialogItems, destination) => {
          doMediaAction({
            action: MediaAction.MOVE,
            selected: dialogItems.map((item) => ({
              id: item.id,
              is_folder: item.type === MediaItemType.FOLDER,
            })),
            destination,
          });
        }}
        loading={isActionPending}
      />

      <PropertiesDialog
        open={propertiesDialogOpen}
        onOpenChange={setPropertiesDialogOpen}
        items={propertiesItems}
        onSubmit={(selectedIds, color) => {
          doMediaAction({
            action: MediaAction.PROPERTIES,
            selected: selectedIds.map((id) => ({ id })),
            color,
          });
        }}
        loading={isActionPending}
      />

      <CropDialog
        open={cropDialogOpen}
        onOpenChange={setCropDialogOpen}
        item={cropItem}
        onSubmit={(imageId, cropData) => {
          doMediaAction({
            action: MediaAction.CROP,
            imageId,
            cropData,
            selected: [],
          });
        }}
        loading={isActionPending}
      />
    </div>
  );
};

export default MediaContent;
