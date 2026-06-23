"use client";

import { formatSize, getAcceptExtensions, type MediaFileType } from "@admin/utils/func";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, FileIcon, Loader2, X, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  forwardRef,
  type ReactNode,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useMutationUploadMediaFile } from "../api/hook";
import { MediaDataKeys } from "../api/queries";
import {
  type UploadFileItem,
  UploadFileStatus,
  type UploadProgressPanelHandle,
} from "../model/media.model";
import { ButtonField } from "./Compat";

const statusColor = (status: UploadFileStatus): string => {
  switch (status) {
    case UploadFileStatus.UPLOADING:
      return "text-blue-500";
    case UploadFileStatus.SUCCESS:
      return "text-green-500";
    case UploadFileStatus.ERROR:
      return "text-red-500";
    default:
      return "text-muted-foreground";
  }
};

const statusLabel = (status: UploadFileStatus): string => {
  switch (status) {
    case UploadFileStatus.UPLOADING:
      return "Uploading…";
    case UploadFileStatus.SUCCESS:
      return "Success";
    case UploadFileStatus.ERROR:
      return "Error";
    default:
      return "Waiting…";
  }
};

const StatusIcon = ({ status }: { status: UploadFileStatus }): ReactNode => {
  switch (status) {
    case UploadFileStatus.UPLOADING:
      return <Loader2 className="size-4 animate-spin text-blue-500" />;
    case UploadFileStatus.SUCCESS:
      return <CheckCircle2 className="size-4 text-green-500" />;
    case UploadFileStatus.ERROR:
      return <XCircle className="size-4 text-red-500" />;
    default:
      return <FileIcon className="size-4 text-muted-foreground" />;
  }
};

// ── Component ───────────────────────────────────────────────
interface UploadProgressPanelProps {
  /** Giới hạn loại file cho phép. Mặc định accept all. */
  acceptTypes?: MediaFileType[];
}

const UploadProgressPanel = forwardRef<UploadProgressPanelHandle, UploadProgressPanelProps>(
  ({ acceptTypes }, ref) => {
    const t = useTranslations();
    const inputRef = useRef<HTMLInputElement>(null);
    const acceptString = getAcceptExtensions(acceptTypes);
    const [items, setItems] = useState<UploadFileItem[]>([]);
    const [visible, setVisible] = useState(false);
    const [uploading, setUploading] = useState(false);

    const uploadMutation = useMutationUploadMediaFile();
    const queryClient = useQueryClient();

    // Expose openPicker to parent via ref
    useImperativeHandle(ref, () => ({
      openPicker: () => {
        inputRef.current?.click();
      },
    }));

    // Handle files selected
    const onFilesSelected = useCallback(
      async (files: FileList | null) => {
        if (!files || files.length === 0) return;

        const newItems: UploadFileItem[] = Array.from(files).map((f, i) => ({
          id: `${Date.now()}-${i}`,
          file: f,
          status: UploadFileStatus.PENDING,
        }));

        setItems(newItems);
        setVisible(true);
        setUploading(true);

        // Upload sequentially
        for (let i = 0; i < newItems.length; i++) {
          const item = newItems[i];

          // Mark current as uploading
          setItems((prev) =>
            prev.map((it) =>
              it.id === item.id ? { ...it, status: UploadFileStatus.UPLOADING } : it,
            ),
          );

          try {
            // Extract filename without extension
            const nameWithoutExt = item.file.name.replace(/\.[^/.]+$/, "");

            await uploadMutation.mutateAsync({
              file: item.file,
              folder_id: "0",
              visibility: "public",
              filename: nameWithoutExt,
            });

            // Mark success
            setItems((prev) =>
              prev.map((it) =>
                it.id === item.id ? { ...it, status: UploadFileStatus.SUCCESS } : it,
              ),
            );
          } catch (err) {
            // Mark error, continue to next
            setItems((prev) =>
              prev.map((it) =>
                it.id === item.id
                  ? {
                      ...it,
                      status: UploadFileStatus.ERROR,
                      errorMessage: err instanceof Error ? err.message : t("media.uploadFailed"),
                    }
                  : it,
              ),
            );
          }
        }

        setUploading(false);

        // Refetch danh sách media sau khi upload xong tất cả
        queryClient.invalidateQueries({ queryKey: MediaDataKeys.all });
      },
      [uploadMutation],
    );

    const handleClose = () => {
      if (!uploading) {
        setVisible(false);
        setItems([]);
      }
    };

    const completedCount = items.filter(
      (it) => it.status === UploadFileStatus.SUCCESS || it.status === UploadFileStatus.ERROR,
    ).length;

    return (
      <>
        {/* Hidden file input */}
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          accept={acceptString}
          onChange={(e) => {
            onFilesSelected(e.target.files);
            e.target.value = "";
          }}
        />

        {/* Floating progress panel */}
        {visible && items.length > 0 ? (
          <div className="fixed bottom-4 right-4 w-[25rem] bg-background border border-[#e5e7eb] rounded-lg shadow-xl z-50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-b-[#e5e7eb] bg-muted/30">
              <h4 className="text-sm font-semibold">
                Upload progress{uploading ? ` (${completedCount}/${items.length})` : ""}
              </h4>
              <ButtonField
                variant="ghost"
                size="icon"
                onClick={handleClose}
                disabled={uploading}
                className={`p-1 rounded-full transition-colors ${
                  uploading
                    ? "text-muted-foreground cursor-not-allowed"
                    : "hover:bg-accent cursor-pointer"
                }`}
              >
                <X className="size-4" style={{ color: "var(--admin-text-color)" }} />
              </ButtonField>
            </div>

            {/* File list */}
            <div className="max-h-[18.75rem] overflow-y-auto">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 px-4 py-2.5 border-b !border-b-[#e5e7eb] last:border-b-0"
                >
                  <StatusIcon status={item.status} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${statusColor(item.status)}`}>
                      {item.file.name}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatSize(item.file.size)}
                  </span>
                  <span className={`text-xs shrink-0 ${statusColor(item.status)}`}>
                    {item.status === UploadFileStatus.UPLOADING
                      ? t("media.uploading")
                      : item.status === UploadFileStatus.SUCCESS
                        ? t("media.uploadSuccess")
                        : item.status === UploadFileStatus.ERROR
                          ? t("media.uploadError")
                          : statusLabel(item.status)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </>
    );
  },
);

UploadProgressPanel.displayName = "UploadProgressPanel";

export default UploadProgressPanel;
