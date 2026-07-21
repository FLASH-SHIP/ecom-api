import { Card } from "@ecom/ui/components/card";
import { Loader2 } from "lucide-react";

interface ProgressOverlayProps {
  importStatus: "idle" | "parsing" | "importing" | "completed";
  uploadProgress: number;
  successCount: number;
  failedCount: number;
  totalRowsCount: number;
  currentLocale: string;
}

export function ProgressOverlay({
  importStatus,
  uploadProgress,
  successCount,
  failedCount,
  totalRowsCount,
  currentLocale,
}: ProgressOverlayProps) {
  if (importStatus !== "parsing" && importStatus !== "importing") return null;

  return (
    <Card className="rounded-xl border border-border bg-card p-10 flex flex-col items-center justify-center text-center gap-6 max-w-xl mx-auto shadow-lg">
      {importStatus === "parsing" ? (
        <>
          <Loader2 className="h-12 w-12 text-[#0F798C] animate-spin" />
          <div className="flex flex-col gap-2">
            <h3 className="font-bold text-lg text-foreground">
              {currentLocale === "vi" ? "Đang đọc dữ liệu tệp tin..." : "Reading file data..."}
            </h3>
            <span className="text-sm text-muted-foreground">
              {currentLocale === "vi"
                ? "Vui lòng chờ trong khi hệ thống trích xuất dòng Excel."
                : "Please wait while the system extracts Excel rows."}
            </span>
          </div>
        </>
      ) : (
        <>
          <div className="relative flex items-center justify-center">
            <Loader2 className="h-20 w-20 text-[#0F798C] animate-spin" />
            <span className="absolute font-bold text-[#0F798C] text-sm">{uploadProgress}%</span>
          </div>
          <div className="flex flex-col gap-3 w-full">
            <div className="flex flex-col gap-1">
              <h3 className="font-bold text-lg text-foreground">
                {currentLocale === "vi"
                  ? "Đang đẩy dữ liệu tạo đơn hàng..."
                  : "Uploading order data..."}
              </h3>
              <span className="text-sm text-muted-foreground">
                {currentLocale === "vi"
                  ? `Đã xử lý ${successCount + failedCount} trong tổng số ${totalRowsCount} đơn`
                  : `Processed ${successCount + failedCount} of ${totalRowsCount} orders`}
              </span>
            </div>
            {/* Progress Bar Container */}
            <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-[#0F798C] h-full rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>

            {/* Live Count Summaries */}
            <div className="flex justify-center gap-6 mt-2 text-xs font-semibold">
              <span className="text-emerald-600 dark:text-emerald-400">
                {currentLocale === "vi"
                  ? `Thành công: ${successCount}`
                  : `Success: ${successCount}`}
              </span>
              <span className="text-rose-600 dark:text-rose-400">
                {currentLocale === "vi" ? `Lỗi: ${failedCount}` : `Failed: ${failedCount}`}
              </span>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
