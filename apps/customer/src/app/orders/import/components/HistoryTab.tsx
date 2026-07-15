import { Button } from "@ecom/ui/components/button";
import { Card } from "@ecom/ui/components/card";
import { cn } from "@ecom/ui/lib/utils";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

interface HistoryItem {
  id: string;
  fileName: string;
  fileSize: number | null;
  totalRows: number;
  successRows: number;
  failedRows: number;
  status: string;
  createdAt: Date;
}

interface HistoryData {
  items: HistoryItem[];
  total: number;
}

interface HistoryTabProps {
  historyData: HistoryData | undefined;
  historyLoading: boolean;
  historyPage: number;
  setHistoryPage: React.Dispatch<React.SetStateAction<number>>;
  historyPerPage: number;
  setSelectedSessionId: (id: string) => void;
  currentLocale: string;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Component renders history items table with status mappings
export function HistoryTab({
  historyData,
  historyLoading,
  historyPage,
  setHistoryPage,
  historyPerPage,
  setSelectedSessionId,
  currentLocale,
}: HistoryTabProps) {
  return (
    <Card className="rounded-xl border border-border bg-card/40 backdrop-blur-md overflow-hidden">
      <div className="overflow-x-auto">
        {historyLoading ? (
          <div className="flex items-center justify-center p-20 gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            {currentLocale === "vi" ? "Đang tải lịch sử..." : "Loading history..."}
          </div>
        ) : !historyData?.items || historyData.items.length === 0 ? (
          <div className="text-center p-20 text-muted-foreground text-sm">
            {currentLocale === "vi"
              ? "Chưa có lượt import nào được thực hiện."
              : "No import history found."}
          </div>
        ) : (
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-[#E6F2F5]/40 dark:bg-cyan-950/20 text-[#0F798C] dark:text-cyan-400 font-semibold">
              <tr>
                <th className="px-6 py-4 text-left">
                  {currentLocale === "vi" ? "Tên tệp" : "File Name"}
                </th>
                <th className="px-6 py-4 text-left">
                  {currentLocale === "vi" ? "Ngày tạo" : "Import Date"}
                </th>
                <th className="px-6 py-4 text-left">
                  {currentLocale === "vi" ? "Kích thước" : "Size"}
                </th>
                <th className="px-6 py-4 text-center">
                  {currentLocale === "vi" ? "Thành công" : "Success Ratio"}
                </th>
                <th className="px-6 py-4 text-center">
                  {currentLocale === "vi" ? "Trạng thái" : "Status"}
                </th>
                <th className="px-6 py-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground">
              {/* biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Render table rows with multiple status conditions */}
              {historyData.items.map((session) => {
                const successRate =
                  session.totalRows > 0
                    ? Math.round((session.successRows / session.totalRows) * 100)
                    : 0;

                return (
                  <tr key={session.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-6 py-4 font-semibold max-w-[200px] truncate">
                      {session.fileName}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {new Date(session.createdAt).toLocaleDateString(
                        currentLocale === "vi" ? "vi-VN" : "en-US",
                      )}{" "}
                      {new Date(session.createdAt).toLocaleTimeString(
                        currentLocale === "vi" ? "vi-VN" : "en-US",
                        { hour: "2-digit", minute: "2-digit" },
                      )}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {session.fileSize ? `${(session.fileSize / 1024).toFixed(1)} KB` : "N/A"}
                    </td>
                    <td className="px-6 py-4 text-center font-bold">
                      <span
                        className={cn(
                          successRate === 100
                            ? "text-emerald-600 dark:text-emerald-400"
                            : successRate > 0
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-rose-600 dark:text-rose-400",
                        )}
                      >
                        {session.successRows} / {session.totalRows} ({successRate}%)
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase",
                          session.status === "completed"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : session.status === "failed"
                              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                              : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
                        )}
                      >
                        {session.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {session.failedRows > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedSessionId(session.id)}
                          className="text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300 font-semibold"
                        >
                          {currentLocale === "vi" ? "Xem lỗi" : "View Errors"}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* History Pagination */}
      {historyData && historyData.total > historyPerPage && (
        <div className="px-6 py-4 flex items-center justify-between border-t border-border bg-[#E6F2F5]/10 text-xs">
          <span className="text-muted-foreground">
            {currentLocale === "vi"
              ? `Hiển thị từ ${(historyPage - 1) * historyPerPage + 1} đến ${Math.min(historyPage * historyPerPage, historyData.total)} trong tổng số ${historyData.total} phiên`
              : `Showing ${(historyPage - 1) * historyPerPage + 1} to ${Math.min(historyPage * historyPerPage, historyData.total)} of ${historyData.total} sessions`}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              disabled={historyPage === 1}
              onClick={() => setHistoryPage((p) => p - 1)}
              className="h-8 w-8 rounded-lg cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              disabled={historyPage * historyPerPage >= historyData.total}
              onClick={() => setHistoryPage((p) => p + 1)}
              className="h-8 w-8 rounded-lg cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
