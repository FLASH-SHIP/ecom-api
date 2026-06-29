"use client";

import { showToast, ToastType } from "@admin/components/toast-provider";
import { downloadFile, downloadFolderAsZip, downloadMultipleItemsAsZip } from "@admin/utils/func";
import {
  Copy,
  Crop,
  Download,
  Eye,
  FileText,
  FolderInput,
  FolderOpen,
  Link,
  Link2,
  Pencil,
  RotateCcw,
  Settings,
  Share2,
  Star,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { getMediaList } from "../api/queries";
import type { MediaContextMenuProps, MediaItem, MenuAction } from "../model/media.model";
import { MediaItemType } from "../model/media.model";
import { ButtonField } from "./Compat";

/** Actions for items in Trash view */
export const buildTrashActions = (
  item: MediaItem,
  onClose: () => void,
  onRenameRequest?: (items: MediaItem[]) => void,
  onRestoreRequest?: (items: MediaItem[]) => void,
  onDeletePermanentlyRequest?: (items: MediaItem[]) => void,
  onPreviewRequest?: (item: MediaItem) => void,
  t?: (key: string) => string,
): MenuAction[] => [
  {
    label: "Preview",
    icon: Eye,
    onClick: () => {
      if (onPreviewRequest) {
        onPreviewRequest(item);
      }
      onClose();
    },
  },
  {
    label: "Rename",
    icon: Pencil,
    onClick: () => {
      if (onRenameRequest) {
        onRenameRequest([item]);
      }
      onClose();
    },
  },
  {
    label: "Download",
    icon: Download,
    onClick: async () => {
      if (item.full_url) {
        try {
          await downloadFile(item.full_url, item.basename || item.name);
          showToast(ToastType.SUCCESS, t?.("media.downloadStarted") ?? "Download started");
        } catch {
          showToast(ToastType.ERROR, t?.("media.downloadFailed") ?? "Download failed");
        }
      }
      onClose();
    },
  },
  {
    label: "Delete permanently",
    icon: Trash2,
    danger: true,
    onClick: () => {
      if (onDeletePermanentlyRequest) {
        onDeletePermanentlyRequest([item]);
      }
      onClose();
    },
  },
  {
    label: "Restore",
    icon: RotateCcw,
    onClick: () => {
      if (onRestoreRequest) {
        onRestoreRequest([item]);
      }
      onClose();
    },
  },
];

export const buildFolderActions = (
  item: MediaItem,
  onClose: () => void,
  onTrashRequest?: (items: MediaItem[]) => void,
  onRenameRequest?: (items: MediaItem[]) => void,
  _onAltTextRequest?: (items: MediaItem[]) => void,
  _onShareRequest?: (items: MediaItem[]) => void,
  onMoveRequest?: (items: MediaItem[]) => void,
  onPropertiesRequest?: (items: MediaItem[]) => void,
  onMakeCopyRequest?: (items: MediaItem[]) => void,
  onFavoriteRequest?: (items: MediaItem[]) => void,
  _onPreviewRequest?: (item: MediaItem) => void,
  onOpenFolder?: (item: MediaItem) => void,
  t?: (key: string) => string,
): MenuAction[] => [
  {
    label: "Open",
    icon: FolderOpen,
    onClick: () => {
      if (onOpenFolder) {
        onOpenFolder(item);
      }
      onClose();
    },
  },
  {
    label: "Rename",
    icon: Pencil,
    onClick: () => {
      if (onRenameRequest) {
        onRenameRequest([item]);
      }
      onClose();
    },
  },
  {
    label: "Make a copy",
    icon: Copy,
    onClick: () => {
      if (onMakeCopyRequest) {
        onMakeCopyRequest([item]);
      }
      onClose();
    },
  },
  {
    label: "Move",
    icon: FolderInput,
    onClick: () => {
      if (onMoveRequest) {
        onMoveRequest([item]);
      }
      onClose();
    },
  },
  {
    label: "Add to favorite",
    icon: Star,
    onClick: () => {
      if (onFavoriteRequest) {
        onFavoriteRequest([item]);
      }
      onClose();
    },
  },
  {
    label: "Download",
    icon: Download,
    onClick: async () => {
      try {
        showToast(ToastType.INFO, t?.("media.preparingDownload") ?? "Preparing download...");
        // Lấy tất cả files trong folder
        const response = await getMediaList({
          folder_id: item.id,
          view_in: "all_media",
          per_page: 1000,
        });
        const files = response?.data?.files || [];
        if (files.length === 0) {
          showToast(ToastType.WARNING, t?.("media.folderIsEmpty") ?? "Folder is empty");
          onClose();
          return;
        }
        // Map dùng basename (có extension) thay vì name
        const zipFiles = files.map((f) => ({ name: f.basename || f.name, full_url: f.full_url }));
        await downloadFolderAsZip(zipFiles, item.name);
        showToast(ToastType.SUCCESS, t?.("media.downloadCompleted") ?? "Download completed");
      } catch {
        showToast(ToastType.ERROR, t?.("media.downloadFolderFailed") ?? "Download folder failed");
      }
      onClose();
    },
  },
  {
    label: "Move to trash",
    icon: Trash2,
    danger: true,
    onClick: () => {
      if (onTrashRequest) {
        onTrashRequest([item]);
      }
      onClose();
    },
  },
  {
    label: "Properties",
    icon: Settings,
    onClick: () => {
      if (onPropertiesRequest) {
        onPropertiesRequest([item]);
      }
      onClose();
    },
  },
];

export const buildFileActions = (
  item: MediaItem,
  onClose: () => void,
  onTrashRequest?: (items: MediaItem[]) => void,
  onRenameRequest?: (items: MediaItem[]) => void,
  onAltTextRequest?: (items: MediaItem[]) => void,
  onShareRequest?: (items: MediaItem[]) => void,
  onMoveRequest?: (items: MediaItem[]) => void,
  onCropRequest?: (item: MediaItem) => void,
  onMakeCopyRequest?: (items: MediaItem[]) => void,
  onFavoriteRequest?: (items: MediaItem[]) => void,
  onPreviewRequest?: (item: MediaItem) => void,
  t?: (key: string) => string,
): MenuAction[] => [
  {
    label: "Preview",
    icon: Eye,
    onClick: () => {
      if (onPreviewRequest) {
        onPreviewRequest(item);
      }
      onClose();
    },
  },
  ...(item.type === MediaItemType.IMAGE
    ? [
        {
          label: "Crop",
          icon: Crop,
          onClick: () => {
            if (onCropRequest) {
              onCropRequest(item);
            }
            onClose();
          },
        },
      ]
    : []),
  {
    label: "Rename",
    icon: Pencil,
    onClick: () => {
      if (onRenameRequest) {
        onRenameRequest([item]);
      }
      onClose();
    },
  },
  {
    label: "Make a copy",
    icon: Copy,
    onClick: () => {
      if (onMakeCopyRequest) {
        onMakeCopyRequest([item]);
      }
      onClose();
    },
  },
  {
    label: "Move",
    icon: FolderInput,
    onClick: () => {
      if (onMoveRequest) {
        onMoveRequest([item]);
      }
      onClose();
    },
  },
  {
    label: "ALT text",
    icon: FileText,
    onClick: () => {
      if (onAltTextRequest) {
        onAltTextRequest([item]);
      }
      onClose();
    },
  },
  {
    label: "Copy link",
    icon: Link2,
    onClick: () => {
      const url = item.full_url || "";
      if (url) {
        navigator.clipboard.writeText(url);
        showToast(ToastType.SUCCESS, t?.("media.linkCopied") ?? "Link copied to clipboard");
      }
      onClose();
    },
  },
  {
    label: "Copy indirect link",
    icon: Link,
    onClick: () => {
      const url = item.indirect_url || "";
      if (url) {
        navigator.clipboard.writeText(url);
        showToast(
          ToastType.SUCCESS,
          t?.("media.indirectLinkCopied") ?? "Indirect link copied to clipboard",
        );
      }
      onClose();
    },
  },
  {
    label: "Share",
    icon: Share2,
    onClick: () => {
      if (onShareRequest) {
        onShareRequest([item]);
      }
      onClose();
    },
  },
  {
    label: "Add to favorite",
    icon: Star,
    onClick: () => {
      if (onFavoriteRequest) {
        onFavoriteRequest([item]);
      }
      onClose();
    },
  },
  {
    label: "Download",
    icon: Download,
    onClick: async () => {
      if (item.full_url) {
        try {
          await downloadFile(item.full_url, item.basename || item.name);
          showToast(ToastType.SUCCESS, t?.("media.downloadStarted") ?? "Download started");
        } catch {
          showToast(ToastType.ERROR, t?.("media.downloadFailed") ?? "Download failed");
        }
      }
      onClose();
    },
  },
  {
    label: "Move to trash",
    icon: Trash2,
    danger: true,
    onClick: () => {
      if (onTrashRequest) {
        onTrashRequest([item]);
      }
      onClose();
    },
  },
];

const MediaContextMenu = ({
  item,
  selectedItems,
  position,
  onClose,
  onTrashRequest,
  onRenameRequest,
  onAltTextRequest,
  onShareRequest,
  onMoveRequest,
  onPropertiesRequest,
  onCropRequest,
  onMakeCopyRequest,
  onFavoriteRequest,
  onRestoreRequest,
  onDeletePermanentlyRequest,
  onPreviewRequest,
  onOpenFolder,
  viewIn,
}: MediaContextMenuProps): ReactNode => {
  const t = useTranslations();
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click — `client-passive-event-listeners`
  useEffect(() => {
    const handleClickOutside = (e: globalThis.MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside, { passive: true });
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // Determine which actions to show based on selection
  let actions: MenuAction[];

  if (selectedItems.length > 1) {
    // ── TRASH view: multi-select ──
    if (viewIn === "trash") {
      actions = buildTrashActions(
        item,
        onClose,
        onRenameRequest,
        onRestoreRequest,
        onDeletePermanentlyRequest,
        onPreviewRequest,
        t,
      );
      const trashMultiOverrides: Record<string, () => void> = {
        Rename: () => {
          if (onRenameRequest) onRenameRequest(selectedItems);
          onClose();
        },
        "Delete permanently": () => {
          if (onDeletePermanentlyRequest) {
            onDeletePermanentlyRequest(selectedItems);
          }
          onClose();
        },
        Restore: () => {
          if (onRestoreRequest) {
            onRestoreRequest(selectedItems);
          }
          onClose();
        },
      };
      actions = actions.map((a) =>
        trashMultiOverrides[a.label] ? { ...a, onClick: trashMultiOverrides[a.label] } : a,
      );
    } else {
      // `js-combine-iterations` — single loop for type check
      let hasFolders = false;
      let hasFiles = false;
      for (const i of selectedItems) {
        if (i.type === MediaItemType.FOLDER) hasFolders = true;
        else hasFiles = true;
        if (hasFolders && hasFiles) break;
      }

      if (hasFolders && hasFiles) {
        actions = buildFolderActions(
          item,
          onClose,
          onTrashRequest,
          onRenameRequest,
          onAltTextRequest,
          onShareRequest,
          onMoveRequest,
          onPropertiesRequest,
          onMakeCopyRequest,
          onFavoriteRequest,
          onPreviewRequest,
          onOpenFolder,
          t,
        ).filter((a) => a.label !== "Properties");
      } else if (hasFolders) {
        actions = buildFolderActions(
          item,
          onClose,
          onTrashRequest,
          onRenameRequest,
          onAltTextRequest,
          onShareRequest,
          onMoveRequest,
          onPropertiesRequest,
          onMakeCopyRequest,
          onFavoriteRequest,
          onPreviewRequest,
          onOpenFolder,
          t,
        );
      } else {
        actions = buildFileActions(
          item,
          onClose,
          onTrashRequest,
          onRenameRequest,
          onAltTextRequest,
          onShareRequest,
          onMoveRequest,
          onCropRequest,
          onMakeCopyRequest,
          onFavoriteRequest,
          onPreviewRequest,
          t,
        );
      }

      // Override actions cho multi-select
      const multiOverrides: Record<string, () => void> = {
        "Copy link": () => {
          const urls = selectedItems
            .map((si) => si.full_url)
            .filter(Boolean)
            .join(" ");
          if (urls) {
            navigator.clipboard.writeText(urls);
            showToast(ToastType.SUCCESS, `Copied ${selectedItems.length} links to clipboard`);
          }
          onClose();
        },
        "Copy indirect link": () => {
          const urls = selectedItems
            .map((si) => si.indirect_url)
            .filter(Boolean)
            .join(" ");
          if (urls) {
            navigator.clipboard.writeText(urls);
            showToast(
              ToastType.SUCCESS,
              `Copied ${selectedItems.length} indirect links to clipboard`,
            );
          }
          onClose();
        },
        Download: async () => {
          try {
            showToast(ToastType.INFO, `Preparing download ${selectedItems.length} items...`);
            await downloadMultipleItemsAsZip(
              selectedItems.map((si) => ({
                id: si.id,
                name: si.basename || si.name,
                type: si.type === MediaItemType.FOLDER ? "folder" : "file",
                full_url: si.full_url,
              })),
              async (folderId: string) => {
                const res = await getMediaList({
                  folder_id: folderId,
                  view_in: "all_media",
                  per_page: 1000,
                });
                // Dùng basename (có extension) cho files trong zip
                return (res?.data?.files || []).map((f) => ({
                  name: f.basename || f.name,
                  full_url: f.full_url,
                }));
              },
              "media-download",
            );
            showToast(ToastType.SUCCESS, t("media.downloadCompleted"));
          } catch {
            showToast(ToastType.ERROR, t("media.downloadFailed"));
          }
          onClose();
        },
        "Move to trash": () => {
          if (onTrashRequest) {
            onTrashRequest(selectedItems);
          }
          onClose();
        },
        Rename: () => {
          if (onRenameRequest) {
            onRenameRequest(selectedItems);
          }
          onClose();
        },
        "ALT text": () => {
          if (onAltTextRequest) {
            onAltTextRequest(selectedItems);
          }
          onClose();
        },
        Share: () => {
          if (onShareRequest) {
            onShareRequest(selectedItems);
          }
          onClose();
        },
        Move: () => {
          if (onMoveRequest) {
            onMoveRequest(selectedItems);
          }
          onClose();
        },
        Properties: () => {
          if (onPropertiesRequest) {
            onPropertiesRequest(selectedItems);
          }
          onClose();
        },
        "Make a copy": () => {
          if (onMakeCopyRequest) {
            onMakeCopyRequest(selectedItems);
          }
          onClose();
        },
        "Add to favorite": () => {
          if (onFavoriteRequest) {
            onFavoriteRequest(selectedItems);
          }
          onClose();
        },
      };

      actions = actions
        .filter((a) => a.label !== "Crop")
        .map((a) => (multiOverrides[a.label] ? { ...a, onClick: multiOverrides[a.label] } : a));
    }
  } else {
    // ── TRASH view: single-select ──
    if (viewIn === "trash") {
      actions = buildTrashActions(
        item,
        onClose,
        onRenameRequest,
        onRestoreRequest,
        onDeletePermanentlyRequest,
        onPreviewRequest,
        t,
      );
    } else {
      // Single select
      actions =
        item.type === MediaItemType.FOLDER
          ? buildFolderActions(
              item,
              onClose,
              onTrashRequest,
              onRenameRequest,
              onAltTextRequest,
              onShareRequest,
              onMoveRequest,
              onPropertiesRequest,
              onMakeCopyRequest,
              onFavoriteRequest,
              onPreviewRequest,
              onOpenFolder,
              t,
            )
          : buildFileActions(
              item,
              onClose,
              onTrashRequest,
              onRenameRequest,
              onAltTextRequest,
              onShareRequest,
              onMoveRequest,
              onCropRequest,
              onMakeCopyRequest,
              onFavoriteRequest,
              onPreviewRequest,
              t,
            );
    }
  }
  // Tự điều chỉnh vị trí context menu để không bị cắt bởi viewport
  const [adjustedPos, setAdjustedPos] = useState(position);
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    if (!ref.current) return;
    const menu = ref.current;
    const rect = menu.getBoundingClientRect();
    const padding = 32; // 2rem

    let { x, y } = position;

    // Nếu tràn dưới → đẩy lên
    if (y + rect.height > window.innerHeight - padding) {
      y = window.innerHeight - rect.height - padding;
    }
    // Nếu tràn phải → đẩy sang trái
    if (x + rect.width > window.innerWidth - padding) {
      x = window.innerWidth - rect.width - padding;
    }
    if (y < padding) y = padding;
    if (x < padding) x = padding;

    setAdjustedPos({ x, y });
    setReady(true);
  }, [position]);

  // Translate context-menu labels while keeping English keys for overrides
  const labelMap: Record<string, string> = {
    Preview: t("media.preview"),
    Rename: t("media.rename"),
    Download: t("media.download"),
    "Delete permanently": t("media.deletePermanently"),
    Restore: t("media.restore"),
    Open: t("media.open"),
    "Make a copy": t("common.create"),
    Move: t("media.move"),
    "Add to favorite": t("media.favorites"),
    "Move to trash": t("media.moveToTrash"),
    Properties: t("media.properties"),
    Crop: "Crop",
    "ALT text": t("media.altText"),
    "Copy link": t("media.copyLink"),
    "Copy indirect link": t("media.copyIndirectLink"),
    Share: t("media.share"),
  };

  return (
    <div
      ref={ref}
      className="fixed z-50 min-w-[11.25rem] bg-popover border rounded-md shadow-lg p-1 animate-in fade-in-0 zoom-in-95"
      style={{
        top: adjustedPos.y,
        left: adjustedPos.x,
        visibility: ready ? "visible" : "hidden",
      }}
    >
      {actions.map((action) => (
        <ButtonField
          key={action.label}
          variant="ghost"
          onClick={action.onClick}
          className={`
            w-full flex items-center justify-start gap-2 px-2.5 py-1.5 text-sm rounded-sm
            transition-colors cursor-pointer h-auto
            ${action.danger ? "text-destructive hover:bg-destructive/10" : "hover:bg-accent"}
          `}
        >
          <action.icon className="size-4 shrink-0" />
          {labelMap[action.label] ?? action.label}
        </ButtonField>
      ))}
    </div>
  );
};

export default MediaContextMenu;
