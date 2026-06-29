"use client";

import { Checkbox } from "@ecom/ui/components/checkbox";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@ecom/ui/components/dialog";
import { Separator } from "@ecom/ui/components/separator";
import { Folder, FolderInput, GripVertical, Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ReactNode, useCallback, useState } from "react";

import { useMediaFolderTree } from "../api/hook";
import type { MediaFolderTreeItem, MoveDialogProps } from "../model/media.model";
import { MediaItemType } from "../model/media.model";
import { ButtonField } from "./Compat";

// ── Recursive folder row ──────────────────────────────────────

interface FolderRowProps {
  folder: MediaFolderTreeItem;
  selectedId: string | null;
  onSelect: (id: string) => void;
  depth?: number;
}

const FolderRow = ({ folder, selectedId, onSelect, depth = 0 }: FolderRowProps): ReactNode => {
  const isActive = selectedId === folder.id;

  return (
    <>
      <ButtonField
        variant="ghost"
        onClick={() => onSelect(folder.id)}
        className={`
          w-full flex items-center justify-start gap-3 px-3 py-2.5 h-auto rounded-[0.5rem]
          transition-colors cursor-pointer
          ${isActive ? "" : "hover:bg-[#f3f4f6]"}
        `}
        style={{
          paddingLeft: `${12 + depth * 20}px`,
          ...(isActive
            ? {
                backgroundColor: "color-mix(in srgb, var(--admin-primary-color) 15%, transparent)",
                color: "var(--admin-primary-color)",
              }
            : {}),
        }}
      >
        <GripVertical
          className="size-4 shrink-0"
          style={{
            color: isActive ? "var(--admin-primary-color)" : "var(--admin-text-color)",
            opacity: isActive ? 1 : 0.5,
          }}
        />
        <Folder
          className="size-4 shrink-0"
          style={{ color: isActive ? "var(--admin-primary-color)" : "var(--admin-text-color)" }}
        />
        <span
          className={`text-[0.875rem] truncate ${isActive ? "font-medium" : ""}`}
          style={{ color: isActive ? "var(--admin-primary-color)" : "var(--admin-text-color)" }}
        >
          {folder.name}
        </span>
      </ButtonField>
      {folder.children.length > 0
        ? folder.children.map((child) => (
            <FolderRow
              key={child.id}
              folder={child}
              selectedId={selectedId}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))
        : null}
    </>
  );
};

// ── Component ─────────────────────────────────────────────────

const MoveDialog = ({
  open,
  onOpenChange,
  items,
  onSubmit,
  loading = false,
}: MoveDialogProps): ReactNode => {
  const t = useTranslations();
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [moveToRoot, setMoveToRoot] = useState(false);

  const { data: folderTreeData, isFetching: isLoadingTree } = useMediaFolderTree();
  const tree = folderTreeData?.data?.tree ?? [];

  // Filter out folders that are being moved (can't move into themselves)
  const movingFolderIds = new Set(
    items.filter((i) => i.type === MediaItemType.FOLDER).map((i) => i.id),
  );
  const filteredTree = tree.filter((f) => !movingFolderIds.has(f.id));

  const handleFolderSelect = useCallback((id: string) => {
    setMoveToRoot(false); // Uncheck "Move to root" when selecting a folder
    setSelectedFolderId((prev) => (prev === id ? null : id));
  }, []);

  const handleMoveToRootChange = useCallback((checked: boolean | "indeterminate") => {
    const isChecked = checked === true;
    setMoveToRoot(isChecked);
    if (isChecked) {
      setSelectedFolderId(null); // Clear folder selection
    }
  }, []);

  const handleSubmit = useCallback(() => {
    const destination = moveToRoot ? 0 : (selectedFolderId ?? "");
    if (destination === "") return;
    onSubmit(items, destination);
  }, [moveToRoot, selectedFolderId, items, onSubmit]);

  const canSubmit = moveToRoot || selectedFolderId !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[34.375rem] p-0 overflow-hidden rounded-[0.875rem] border border-[#e5e7eb] [&>button]:hidden">
        {/* Header */}
        <div className="relative px-6 pt-6 pb-3">
          <DialogTitle
            className="text-[1.25rem] font-semibold"
            style={{ color: "var(--admin-text-color)" }}
          >
            {t("media.move")}
          </DialogTitle>
          <DialogClose asChild>
            <ButtonField
              variant="ghost"
              size="icon"
              className="absolute right-6 top-4 rounded-md p-1 text-[#9ca3af] hover:bg-muted cursor-pointer h-auto w-auto"
              aria-label="Close"
              style={{ color: "var(--admin-text-color)" }}
            >
              <X className="size-4" />
            </ButtonField>
          </DialogClose>
        </div>

        <Separator />

        {/* Body */}
        <div className="px-6 pt-4 pb-2 flex flex-col gap-4">
          {/* Label */}
          <span className="text-[0.875rem] text-[#6b7280]">{t("media.selectDestination")}</span>

          {/* Folder list */}
          <div className="border border-[#e5e7eb] rounded-[0.625rem] overflow-hidden max-h-[18.75rem] overflow-y-auto">
            {isLoadingTree ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredTree.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-[0.875rem] text-[#9ca3af]">
                No folders available
              </div>
            ) : (
              <div className="flex flex-col p-1">
                {filteredTree.map((folder) => (
                  <FolderRow
                    key={folder.id}
                    folder={folder}
                    selectedId={moveToRoot ? null : selectedFolderId}
                    onSelect={handleFolderSelect}
                  />
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Move to root checkbox */}
          <label className="flex items-center gap-3 cursor-pointer py-1">
            <Checkbox
              checked={moveToRoot}
              onCheckedChange={handleMoveToRootChange}
              className="rounded-full"
            />
            <span className="text-[0.875rem]" style={{ color: "var(--admin-text-color)" }}>
              {t("media.moveToRoot")}
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-2 flex items-center justify-end gap-3">
          <DialogClose asChild>
            <ButtonField
              variant="outline"
              className="h-[2.5rem] px-6 rounded-[0.625rem] cursor-pointer"
              style={{ color: "var(--admin-text-color)" }}
            >
              {t("common.close")}
            </ButtonField>
          </DialogClose>
          <ButtonField
            onClick={handleSubmit}
            disabled={!canSubmit || loading}
            className="h-[2.5rem] px-6 rounded-[0.625rem] text-white cursor-pointer flex items-center gap-2"
            style={
              !canSubmit || loading ? undefined : { backgroundColor: "var(--admin-primary-color)" }
            }
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FolderInput className="size-4" />
            )}
            {t("media.move")}
          </ButtonField>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MoveDialog;
