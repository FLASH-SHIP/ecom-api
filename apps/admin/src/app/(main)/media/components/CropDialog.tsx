"use client";

import {
  CropDialog as BaseCropDialog,
  type CropData,
} from "@admin/components/base/CropDialog/CropDialog";
import type { ReactNode } from "react";
import type { MediaItem } from "../model/media.model";

// ── Props ─────────────────────────────────────────────────────

export interface MediaCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: MediaItem | null;
  onSubmit: (imageId: string, cropData: CropData) => void;
  loading?: boolean;
}

// ── Media-specific wrapper ────────────────────────────────────

const CropDialog = ({
  open,
  onOpenChange,
  item,
  onSubmit,
  loading = false,
}: MediaCropDialogProps): ReactNode => {
  const imageUrl = item?.preview_url || item?.full_url || item?.thumbnailUrl || "";

  return (
    <BaseCropDialog
      open={open}
      onOpenChange={onOpenChange}
      imageUrl={imageUrl}
      imageAlt={item?.name ?? "Crop preview"}
      onSubmit={(cropData) => {
        if (item) {
          onSubmit(item.id, cropData);
        }
      }}
      loading={loading}
    />
  );
};

export default CropDialog;
