import { Button } from "@ecom/ui/components/button";
import { Card } from "@ecom/ui/components/card";
import { Download, Loader2, X } from "lucide-react";
import { useToast } from "../../../../components/toast-provider";
import type { OrderImportError } from "../utils/import-parser";

interface SessionDetail {
  id: string;
  fileName: string;
  errors: unknown;
}

interface SessionDetailModalProps {
  selectedSessionId: string | null;
  setSelectedSessionId: (id: string | null) => void;
  sessionDetail: SessionDetail | undefined;
  detailLoading: boolean;
  t: (key: string, variables?: Record<string, string | number>) => string;
  currentLocale: string;
}

export function SessionDetailModal({
  selectedSessionId,
  setSelectedSessionId,
  sessionDetail,
  detailLoading,
  t,
  currentLocale,
}: SessionDetailModalProps) {
  const { toast } = useToast();

  if (!selectedSessionId) return null;

  const handleExportDetailErrors = async () => {
    if (!sessionDetail?.errors) return;
    const errors = sessionDetail.errors as unknown as OrderImportError[];
    try {
      const XLSX = await import("xlsx");
      const ws = XLSX.utils.json_to_sheet(
        errors.map((e) => ({
          "Dòng (Row)": e.line,
          "Cột lỗi (Column)": e.columnName,
          "Giá trị đã nhập (Value)": e.enteredValue,
          "Chi tiết lỗi (Reason)": e.errorReason,
        })),
      );
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Errors");
      XLSX.writeFile(
        wb,
        `Import_Errors_${sessionDetail.fileName}_Session_${sessionDetail.id}.xlsx`,
      );
      toast(
        currentLocale === "vi" ? "Đã xuất lỗi thành công!" : "Exported successfully!",
        "success",
      );
    } catch (_err) {
      toast("Lỗi khi xuất tệp", "error");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col rounded-xl border border-border shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-[#E6F2F5]/20">
          <div className="flex flex-col gap-0.5">
            <h3 className="font-bold text-lg text-foreground">
              {currentLocale === "vi"
                ? "Chi tiết lỗi phiên import"
                : "Import Session Error Details"}
            </h3>
            <span className="text-xs text-muted-foreground truncate max-w-md">
              {sessionDetail?.fileName}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedSessionId(null)}
            className="h-8 w-8 rounded-full border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-all cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {detailLoading ? (
            <div className="flex flex-col items-center justify-center p-20 gap-2 text-muted-foreground">
              <Loader2 className="h-8 w-8 text-[#0F798C] animate-spin" />
              <span>
                {currentLocale === "vi"
                  ? "Đang truy vấn danh sách lỗi..."
                  : "Loading error logs..."}
              </span>
            </div>
          ) : !sessionDetail?.errors ||
            (sessionDetail.errors as unknown as OrderImportError[]).length === 0 ? (
            <div className="text-center p-20 text-muted-foreground text-sm">
              {currentLocale === "vi" ? "Không có dữ liệu lỗi." : "No error data found."}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Export button inside modal */}
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={handleExportDetailErrors}
                  className="border-[#0F798C] text-[#0F798C] hover:bg-[#0F798C]/5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  {currentLocale === "vi"
                    ? "Tải danh sách lỗi (.xlsx)"
                    : "Download error list (.xlsx)"}
                </Button>
              </div>

              <div className="border border-border rounded-xl overflow-hidden">
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead className="bg-[#E6F2F5]/30 text-muted-foreground font-semibold">
                    <tr>
                      <th className="px-6 py-3 text-left w-20">{t("orders.import.colLine")}</th>
                      <th className="px-6 py-3 text-left w-44">
                        {t("orders.import.colColumnName")}
                      </th>
                      <th className="px-6 py-3 text-left w-48">
                        {t("orders.import.colEnteredValue")}
                      </th>
                      <th className="px-6 py-3 text-left">{t("orders.import.colErrorReason")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-foreground">
                    {(sessionDetail.errors as unknown as OrderImportError[]).map((error) => (
                      <tr
                        key={`${error.line}-${error.columnName}-${error.errorReason}`}
                        className="hover:bg-muted/5"
                      >
                        <td className="px-6 py-3 font-bold text-[#0F798C]">#{error.line}</td>
                        <td className="px-6 py-3">
                          <span className="font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded text-xs border border-rose-500/20">
                            {error.columnName}
                          </span>
                        </td>
                        <td className="px-6 py-3 max-w-[150px] truncate text-muted-foreground">
                          {error.enteredValue || (
                            <span className="italic text-slate-400 font-normal">blank</span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-rose-600 dark:text-rose-400 font-medium">
                          {error.errorReason}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border bg-[#E6F2F5]/10 flex justify-end">
          <Button
            onClick={() => setSelectedSessionId(null)}
            className="bg-[#0F798C] hover:bg-[#0F798C]/90 text-white font-semibold px-6"
          >
            {currentLocale === "vi" ? "Đóng" : "Close"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
