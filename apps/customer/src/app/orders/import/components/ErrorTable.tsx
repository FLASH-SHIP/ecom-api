import { Button } from "@ecom/ui/components/button";
import { Card, CardContent } from "@ecom/ui/components/card";
import {
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { OrderImportError } from "../utils/import-parser";

interface ErrorTableProps {
  importStatus: "idle" | "parsing" | "importing" | "completed";
  totalRowsCount: number;
  successCount: number;
  failedCount: number;
  importErrors: OrderImportError[];
  handleExportErrors: () => void;
  setFile: (file: File | null) => void;
  setImportStatus: (status: "idle" | "parsing" | "importing" | "completed") => void;
  t: (key: string, variables?: Record<string, string | number>) => string;
  currentLocale: string;
}

export function ErrorTable({
  importStatus,
  totalRowsCount,
  successCount,
  failedCount,
  importErrors,
  handleExportErrors,
  setFile,
  setImportStatus,
  t,
  currentLocale,
}: ErrorTableProps) {
  const router = useRouter();
  const [errorPage, setErrorPage] = useState(1);
  const errorsPerPage = 20;

  if (importStatus !== "completed") return null;

  // Paginate errors list
  const totalErrorPages = Math.ceil(importErrors.length / errorsPerPage);
  const currentErrors = importErrors.slice(
    (errorPage - 1) * errorsPerPage,
    errorPage * errorsPerPage,
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Summary Banner */}
      <Card className="rounded-xl border border-border bg-card overflow-hidden shadow-md">
        <CardContent className="p-6">
          <h3 className="font-bold text-lg text-foreground border-b border-border pb-3 mb-4">
            {t("orders.import.summaryResults")}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total */}
            <div className="flex items-center gap-4 border-r border-border last:border-r-0 pr-4">
              <div className="h-12 w-12 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                <FileText className="h-6 w-6" />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground">
                  {currentLocale === "vi" ? "Tổng số đơn hàng" : "Total Orders"}
                </span>
                <span className="font-bold text-2xl text-foreground">{totalRowsCount}</span>
              </div>
            </div>

            {/* Success */}
            <div className="flex items-center gap-4 border-r border-border last:border-r-0 pr-4">
              <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="h-6 w-6" />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground">
                  {currentLocale === "vi" ? "Thành công" : "Success"}
                </span>
                <span className="font-bold text-2xl text-emerald-600 dark:text-emerald-400">
                  {successCount}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {t("orders.import.successCountText", { count: successCount })}
                </span>
              </div>
            </div>

            {/* Errors */}
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground">
                  {currentLocale === "vi" ? "Thất bại (Dòng lỗi)" : "Failed (Error Rows)"}
                </span>
                <span className="font-bold text-2xl text-rose-600 dark:text-rose-400">
                  {failedCount}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {t("orders.import.errorCountText", { count: failedCount })}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Errors table (if any) */}
      {importErrors.length > 0 && (
        <Card className="rounded-xl border border-border bg-card shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-[#E6F2F5]/10">
            <h3 className="font-bold text-base text-foreground">{t("orders.import.errorList")}</h3>
            <Button
              variant="outline"
              onClick={handleExportErrors}
              className="border-[#0F798C] text-[#0F798C] hover:bg-[#0F798C]/5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              {currentLocale === "vi" ? "Xuất lỗi ra Excel" : "Export errors to Excel"}
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-[#E6F2F5]/30 text-muted-foreground font-semibold">
                <tr>
                  <th className="px-6 py-3.5 text-left w-20">{t("orders.import.colLine")}</th>
                  <th className="px-6 py-3.5 text-left w-48">{t("orders.import.colColumnName")}</th>
                  <th className="px-6 py-3.5 text-left w-52">
                    {t("orders.import.colEnteredValue")}
                  </th>
                  <th className="px-6 py-3.5 text-left">{t("orders.import.colErrorReason")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground">
                {currentErrors.map((error) => (
                  <tr
                    key={`${error.line}-${error.columnName}-${error.errorReason}`}
                    className="hover:bg-muted/5"
                  >
                    <td className="px-6 py-3.5 font-bold text-[#0F798C]">#{error.line}</td>
                    <td className="px-6 py-3.5">
                      <span className="font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded text-xs border border-rose-500/20">
                        {error.columnName}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 max-w-[200px] truncate text-muted-foreground">
                      {error.enteredValue || (
                        <span className="italic text-slate-400 font-normal">blank</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-rose-600 dark:text-rose-400 font-medium">
                      {error.errorReason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Error list pagination */}
          {totalErrorPages > 1 && (
            <div className="px-6 py-4 flex items-center justify-between border-t border-border bg-[#E6F2F5]/10 text-xs">
              <span className="text-muted-foreground">
                {currentLocale === "vi"
                  ? `Hiển thị từ ${(errorPage - 1) * errorsPerPage + 1} đến ${Math.min(errorPage * errorsPerPage, importErrors.length)} trong tổng số ${importErrors.length} lỗi`
                  : `Showing ${(errorPage - 1) * errorsPerPage + 1} to ${Math.min(errorPage * errorsPerPage, importErrors.length)} of ${importErrors.length} errors`}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  disabled={errorPage === 1}
                  onClick={() => setErrorPage((p) => p - 1)}
                  className="h-8 w-8 rounded-lg cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={errorPage === totalErrorPages}
                  onClick={() => setErrorPage((p) => p + 1)}
                  className="h-8 w-8 rounded-lg cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Final Navigation buttons */}
      <div className="flex gap-4 max-w-md">
        <Button
          onClick={() => {
            setFile(null);
            setImportStatus("idle");
          }}
          variant="outline"
          className="w-1/2 border-[#0F798C] text-[#0F798C] hover:bg-[#0F798C]/5 font-semibold py-2.5 rounded-lg"
        >
          {t("orders.import.btnUploadMore")}
        </Button>
        <Button
          onClick={() => router.push("/orders")}
          className="w-1/2 bg-[#0F798C] hover:bg-[#0F798C]/90 text-white font-semibold py-2.5 rounded-lg"
        >
          {t("orders.import.btnOrderList")}
        </Button>
      </div>
    </div>
  );
}
