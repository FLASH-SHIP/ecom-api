"use client";

import { getFileTypeIcon } from "@admin/components/base/FileTypeIcon/FileTypeIcon";
import { copyToClipboard, formatDate } from "@admin/utils/func";
import { Separator } from "@ecom/ui/components/separator";
import { Copy, Folder, X } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import type { MediaDetailSidebarProps } from "../model/media.model";
import { MediaItemType } from "../model/media.model";
import { ButtonField, InputField } from "./Compat";

/** Empty state placeholder */
const EmptyPreview = (): ReactNode => (
  <div className="flex items-center justify-center h-full min-h-[12.5rem]">
    <div className="flex items-center justify-center w-[7.5rem] h-[7.5rem] border-2 border-dashed border-muted-foreground/30 rounded-lg">
      {getFileTypeIcon(undefined, 48)}
    </div>
  </div>
);

/** Detail row: label + value */
const DetailRow = ({ label, children }: { label: string; children: ReactNode }): ReactNode => (
  <div className="py-2">
    <p className="text-xs font-medium mb-0.5" style={{ color: "var(--admin-text-color)" }}>
      {label}
    </p>
    <div className="text-sm" style={{ color: "var(--admin-text-color)" }}>
      {children}
    </div>
  </div>
);

const MediaDetailSidebar = ({
  item,
  onClose,
}: MediaDetailSidebarProps & { onClose?: () => void }): ReactNode => {
  const t = useTranslations("media");
  const tGlobal = useTranslations();
  if (!item) return <EmptyPreview />;

  const isFolder = item.type === MediaItemType.FOLDER;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Close button */}
      {onClose ? (
        <div className="flex justify-end p-2 xl:hidden">
          <ButtonField
            variant="ghost"
            size="icon"
            className="size-7 cursor-pointer"
            onClick={onClose}
          >
            <X className="size-4" style={{ color: "var(--admin-text-color)" }} />
          </ButtonField>
        </div>
      ) : null}
      {/* Preview area */}
      <div className="relative flex items-center justify-center py-3 md:py-6">
        {(item.preview_url || item.full_url) && item.mime_type?.startsWith("image/") ? (
          <div className="relative w-full h-[5rem] md:h-[12.5rem]">
            <Image
              src={item.preview_url || item.full_url || ""}
              alt={item.name}
              fill
              sizes="260px"
              unoptimized
              className="object-contain rounded"
            />
          </div>
        ) : isFolder ? (
          <Folder
            className={item.color ? "size-20" : "size-20 text-muted-foreground"}
            style={item.color ? { color: item.color } : undefined}
          />
        ) : (
          getFileTypeIcon(item.mime_type, 80)
        )}
      </div>

      <Separator />

      {/* Details */}
      <div className="p-4 flex flex-col gap-0.5 overflow-y-auto">
        <DetailRow label={tGlobal("common.name")}>{item.name}</DetailRow>

        {/* Full URL (files only) */}
        {item.full_url ? (
          <DetailRow label={t("fullUrl")}>
            <div className="flex items-center gap-1.5">
              <InputField
                readOnly
                value={item.full_url}
                onValueChange={() => {}}
                containerClassName="flex-1"
                className="text-sm bg-muted px-2 py-1 rounded border text-muted-foreground truncate"
              />
              <ButtonField
                variant="ghost"
                size="icon"
                onClick={() => void copyToClipboard(item.full_url!)}
                className="p-1 hover:bg-accent rounded transition-colors cursor-pointer shrink-0"
              >
                <Copy className="size-4" />
              </ButtonField>
            </div>
          </DetailRow>
        ) : null}

        {/* Size (files only) */}
        {item.size != null ? <DetailRow label={t("size")}>{item.size}</DetailRow> : null}

        <DetailRow label={t("uploadedAt")}>{formatDate(item.created_at)}</DetailRow>
        <DetailRow label={t("modifiedAt")}>{formatDate(item.updated_at)}</DetailRow>

        {/* Alt text (images only) */}
        {item.type === MediaItemType.IMAGE ? (
          <DetailRow label={t("altText")}>
            <span className="text-muted-foreground">{item.alt ?? "-"}</span>
          </DetailRow>
        ) : null}
      </div>
    </div>
  );
};

export default MediaDetailSidebar;
