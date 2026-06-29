"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@ecom/ui/components/dialog";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Download, Loader2, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ReactNode, useCallback, useState } from "react";
import { useMutationDownloadMediaFromRemote } from "../api/hook";
import { MediaDataKeys } from "../api/queries";
import {
  type DownloadUrlDialogProps,
  type DownloadUrlItem,
  DownloadUrlStatus,
} from "../model/media.model";
import { ButtonField, InputField } from "./Compat";

const StatusIcon = ({ status }: { status: DownloadUrlStatus }): ReactNode => {
  switch (status) {
    case DownloadUrlStatus.DOWNLOADING:
      return <AlertCircle className="size-4 text-blue-500" />;
    case DownloadUrlStatus.SUCCESS:
      return <CheckCircle2 className="size-4 text-green-500" />;
    case DownloadUrlStatus.ERROR:
      return <XCircle className="size-4 text-red-500" />;
    default:
      return <AlertCircle className="size-4 text-muted-foreground" />;
  }
};

const statusColor = (status: DownloadUrlStatus): string => {
  switch (status) {
    case DownloadUrlStatus.DOWNLOADING:
      return "text-blue-500";
    case DownloadUrlStatus.SUCCESS:
      return "text-green-500";
    case DownloadUrlStatus.ERROR:
      return "text-red-500";
    default:
      return "text-muted-foreground";
  }
};

const statusSuffix = (status: DownloadUrlStatus): string => {
  switch (status) {
    case DownloadUrlStatus.SUCCESS:
      return ": Success";
    case DownloadUrlStatus.ERROR:
      return ": Error";
    default:
      return "";
  }
};

const DownloadUrlDialog = ({ open, onOpenChange }: DownloadUrlDialogProps): ReactNode => {
  const t = useTranslations("media");
  const [urlText, setUrlText] = useState("");
  const [items, setItems] = useState<DownloadUrlItem[]>([]);
  const [downloading, setDownloading] = useState(false);

  const downloadMutation = useMutationDownloadMediaFromRemote();
  const queryClient = useQueryClient();

  const completedCount = items.filter(
    (it) => it.status === DownloadUrlStatus.SUCCESS || it.status === DownloadUrlStatus.ERROR,
  ).length;

  const handleDownload = useCallback(async () => {
    // Parse URLs: split by newline, filter empty
    const urls = urlText
      .split("\n")
      .map((u) => u.trim())
      .filter(Boolean);

    if (urls.length === 0) return;

    // Create items
    const newItems: DownloadUrlItem[] = urls.map((u, i) => ({
      id: `${Date.now()}-${i}`,
      url: u,
      status: DownloadUrlStatus.PENDING,
    }));

    setItems(newItems);
    setDownloading(true);

    // Download sequentially
    for (let i = 0; i < newItems.length; i++) {
      const item = newItems[i];

      // Mark current as downloading
      setItems((prev) =>
        prev.map((it) =>
          it.id === item.id ? { ...it, status: DownloadUrlStatus.DOWNLOADING } : it,
        ),
      );

      try {
        await downloadMutation.mutateAsync({
          url: item.url,
          folder_id: "0",
          visibility: "public",
        });

        // Mark success
        setItems((prev) =>
          prev.map((it) => (it.id === item.id ? { ...it, status: DownloadUrlStatus.SUCCESS } : it)),
        );
      } catch (err) {
        // Mark error, continue to next
        setItems((prev) =>
          prev.map((it) =>
            it.id === item.id
              ? {
                  ...it,
                  status: DownloadUrlStatus.ERROR,
                  errorMessage: err instanceof Error ? err.message : t("downloadFailed"),
                }
              : it,
          ),
        );
      }
    }

    setDownloading(false);

    // Refetch danh sách media sau khi tất cả URL đã download xong
    queryClient.invalidateQueries({ queryKey: MediaDataKeys.all });
  }, [urlText, downloadMutation]);

  const handleClose = useCallback(
    (isOpen: boolean) => {
      if (!downloading) {
        onOpenChange(isOpen);
        if (!isOpen) {
          setUrlText("");
          setItems([]);
        }
      }
    },
    [downloading, onOpenChange],
  );

  const title = downloading
    ? `${t("downloading")} (${completedCount} / ${items.length})`
    : t("download");

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[35rem]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="size-5" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* URL textarea */}
          <div className="flex flex-col gap-1.5">
            <InputField
              as="textarea"
              rows={5}
              value={urlText}
              onValueChange={setUrlText}
              placeholder={`https://example.com/image1.jpg\nhttps://example.com/image2.jpg\nhttps://example.com/image3.jpg\n...`}
              disabled={downloading}
              description="Enter one URL per line."
              trimOnBlur={false}
              trimOnChange={false}
            />
          </div>

          {/* Download button */}
          <ButtonField
            onClick={handleDownload}
            disabled={downloading || !urlText.trim()}
            className="w-full h-[2.75rem] bg-[#3b82f6] hover:bg-[#2563eb] cursor-pointer text-base font-medium"
          >
            {downloading ? <Loader2 className="size-5 animate-spin" /> : t("download")}
          </ButtonField>

          {/* Status list */}
          {items.length > 0 ? (
            <div className="flex flex-col gap-1.5 max-h-[12.5rem] overflow-y-auto">
              {items.map((item) => {
                // Extract filename from URL
                const filename = item.url.split("/").pop() || item.url;

                return (
                  <div key={item.id} className="flex items-center gap-2">
                    <StatusIcon status={item.status} />
                    <span className={`text-sm truncate ${statusColor(item.status)}`}>
                      {filename}
                      {statusSuffix(item.status)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DownloadUrlDialog;
