import { trpc } from "@customer/lib/trpc";
import { translate } from "@ecom/i18n";
import { useI18n } from "@ecom/shared/@i18n";
import { useBeforeUnload } from "@ecom/shared/hooks/useBeforeUnload";
import { useRef, useState } from "react";
import { useToast } from "../../../../components/toast-provider";
import {
  type ExcelRow,
  exportErrorsToExcel,
  type OrderImportError,
  type ParsedOrder,
  parseExcelRows,
} from "../utils/import-parser";

export function useOrderImport(refetchHistory: () => void) {
  const { toast } = useToast();
  const { languageId: currentLocale } = useI18n();

  const t = (key: string, variables?: Record<string, string | number>) => {
    let raw = translate(key, currentLocale);
    if (variables) {
      for (const [k, v] of Object.entries(variables)) {
        raw = raw.replace(`{${k}}`, String(v));
      }
    }
    return raw;
  };

  const trpcContext = trpc.useUtils();

  // File states
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Settings
  const [buyLabel, setBuyLabel] = useState(false);

  // Import Status
  const [importStatus, setImportStatus] = useState<"idle" | "parsing" | "importing" | "completed">(
    "idle",
  );
  const [totalRowsCount, setTotalRowsCount] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [importErrors, setImportErrors] = useState<OrderImportError[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Navigation unload blocker
  useBeforeUnload(importStatus === "importing" || importStatus === "parsing");

  // tRPC Mutations
  const createSessionMutation = trpc.customer.orders.createImportSession.useMutation();
  const importBatchMutation = trpc.customer.orders.importBatch.useMutation();
  const completeSessionMutation = trpc.customer.orders.completeImportSession.useMutation();

  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    const ext = selectedFile.name.split(".").pop()?.toLowerCase();
    if (ext !== "xlsx" && ext !== "xls" && ext !== "csv") {
      toast(
        currentLocale === "vi"
          ? "Chỉ chấp nhận tệp Excel (.xlsx, .xls) hoặc CSV!"
          : "Only Excel (.xlsx, .xls) or CSV files are accepted!",
        "error",
      );
      return;
    }
    setFile(selectedFile);
  };

  const handleFileUpload = async () => {
    if (!file) return;

    setImportStatus("parsing");
    setImportErrors([]);
    setSuccessCount(0);
    setFailedCount(0);
    setUploadProgress(0);

    try {
      const XLSX = await import("xlsx");
      const reader = new FileReader();

      // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: High complexity from parsing Excel file client-side
      reader.onload = async (e) => {
        let createdSessionId: string | null = null;
        let tempSuccess = 0;
        let tempFailed = 0;
        const accumulatedErrors: OrderImportError[] = [];

        try {
          const data = e.target?.result;
          if (!data) throw new Error("Could not read file data");

          const workbook = XLSX.read(data, { type: "array" });
          const sheetName =
            workbook.SheetNames.find(
              (name) =>
                name.toLowerCase().includes("import") ||
                name.toLowerCase().includes("template") ||
                name.toLowerCase().includes("đơn hàng") ||
                name.toLowerCase().includes("don hang"),
            ) ||
            workbook.SheetNames.find(
              (name) => name !== "Reference Data" && name !== "Instructions",
            ) ||
            workbook.SheetNames[0];

          if (!sheetName) {
            throw new Error(
              currentLocale === "vi"
                ? "Không tìm thấy Sheet hợp lệ trong file Excel!"
                : "No valid sheets found in the Excel file!",
            );
          }
          const worksheet = workbook.Sheets[sheetName];
          if (!worksheet) {
            throw new Error(
              currentLocale === "vi"
                ? "Không thể tìm thấy nội dung Sheet!"
                : "Could not find sheet content!",
            );
          }
          const rawRows = XLSX.utils.sheet_to_json<ExcelRow>(worksheet, { defval: "" });

          if (rawRows.length === 0) {
            throw new Error(
              currentLocale === "vi"
                ? "Tệp tin tải lên không chứa dữ liệu!"
                : "The uploaded file does not contain any data!",
            );
          }

          // Row Limit Guard: Chặn tải lên file vượt quá 2.000 dòng ở phía Client
          if (rawRows.length > 2000) {
            throw new Error(
              currentLocale === "vi"
                ? `Số dòng trong tệp (${rawRows.length}) vượt quá giới hạn tối đa cho phép là 2.000 dòng đơn!`
                : `The number of rows in the file (${rawRows.length}) exceeds the maximum allowed limit of 2,000 order rows!`,
            );
          }

          // Parse raw rows and filter placeholder sample rows
          const parsedOrders = parseExcelRows(rawRows, currentLocale, () => {
            toast(
              currentLocale === "vi"
                ? "Hệ thống đã tự động lọc bỏ các đơn hàng mẫu (SO-2026-001, SO-2026-002) ra khỏi file."
                : "System automatically filtered out sample orders (SO-2026-001, SO-2026-002) from the file.",
              "info",
            );
          });

          if (parsedOrders.length === 0) {
            throw new Error(
              currentLocale === "vi"
                ? "Không tìm thấy đơn hàng hợp lệ để import!"
                : "No valid orders found to import!",
            );
          }

          setTotalRowsCount(parsedOrders.length);
          setImportStatus("importing");

          // Create import session
          const session = await createSessionMutation.mutateAsync({
            fileName: file.name,
            fileSize: file.size,
            totalRows: parsedOrders.length,
          });
          createdSessionId = session.id;
          setSessionId(session.id);

          // Chunk into batches of 20
          const batchSize = 20;
          const batches: ParsedOrder[][] = [];
          for (let i = 0; i < parsedOrders.length; i += batchSize) {
            batches.push(parsedOrders.slice(i, i + batchSize));
          }

          let processedRows = 0;

          // Helper logic for automatic upload retry (3 attempts with exponential backoff)
          const runBatchWithRetry = async (
            batch: ParsedOrder[],
            batchIndex: number,
            sessId: string,
            retries = 3,
            delay = 1000,
          ): Promise<{ successCount: number; failedCount: number; errors: OrderImportError[] }> => {
            try {
              return await importBatchMutation.mutateAsync({
                importId: sessId,
                batchIndex,
                orders: batch.map((o) => ({ ...o, isGetLabel: buyLabel ? 1 : 0 })),
              });
            } catch (error) {
              if (retries > 1) {
                await new Promise((resolve) => setTimeout(resolve, delay));
                return runBatchWithRetry(batch, batchIndex, sessId, retries - 1, delay * 2);
              }
              throw error;
            }
          };

          // Process batches in parallel with limit = 3
          const concurrencyLimit = 3;
          const runBatch = async (batch: ParsedOrder[], batchIndex: number) => {
            const res = await runBatchWithRetry(batch, batchIndex, session.id);

            tempSuccess += res.successCount;
            tempFailed += res.failedCount;
            accumulatedErrors.push(...res.errors);
            processedRows += batch.length;
            setUploadProgress(Math.round((processedRows / parsedOrders.length) * 100));
            setSuccessCount(tempSuccess);
            setFailedCount(tempFailed);
            setImportErrors([...accumulatedErrors]);
          };

          // Parallel concurrency pool
          const pool: Promise<void>[] = [];
          for (let i = 0; i < batches.length; i++) {
            const currentBatch = batches[i];
            if (currentBatch) {
              const p = runBatch(currentBatch, i);
              pool.push(p);
              if (pool.length >= concurrencyLimit) {
                await Promise.race(pool);
              }
            }
          }
          await Promise.all(pool);

          // Sort errors by line number
          accumulatedErrors.sort((a, b) => a.line - b.line);
          setImportErrors([...accumulatedErrors]);

          // Single Write updates total stats and error array JSON
          await completeSessionMutation.mutateAsync({
            importId: session.id,
            successRows: tempSuccess,
            failedRows: tempFailed,
            errors: accumulatedErrors,
          });

          setImportStatus("completed");
          toast(
            currentLocale === "vi"
              ? "Đã hoàn thành xử lý tệp import!"
              : "File import processing completed!",
            "success",
          );
          trpcContext.customer.orders.list.invalidate();
          refetchHistory();
        } catch (err) {
          setImportStatus("idle");
          const msg = err instanceof Error ? err.message : String(err);
          toast(msg, "error");

          // Fail-safe cleanup: Update database session status to failed
          if (createdSessionId) {
            try {
              await completeSessionMutation.mutateAsync({
                importId: createdSessionId,
                successRows: tempSuccess,
                failedRows: tempFailed,
                errors: accumulatedErrors,
                status: "failed",
              });
            } catch (cleanupErr) {
              console.error("Cleanup import session failed:", cleanupErr);
            }
            refetchHistory();
          }
        }
      };

      reader.readAsArrayBuffer(file);
    } catch (err) {
      setImportStatus("idle");
      const msg = err instanceof Error ? err.message : String(err);
      toast(msg, "error");
    }
  };

  const handleExportErrors = async () => {
    if (importErrors.length === 0) return;
    try {
      await exportErrorsToExcel(importErrors, file?.name || "Order", sessionId, currentLocale);
      toast(
        currentLocale === "vi"
          ? "Đã xuất file báo cáo lỗi Excel thành công!"
          : "Exported Excel error report successfully!",
        "success",
      );
    } catch (_err) {
      toast("Lỗi khi xuất file báo cáo lỗi Excel", "error");
    }
  };

  return {
    file,
    setFile,
    fileInputRef,
    buyLabel,
    setBuyLabel,
    importStatus,
    setImportStatus,
    totalRowsCount,
    successCount,
    failedCount,
    importErrors,
    uploadProgress,
    sessionId,
    removeFile,
    validateAndSetFile,
    handleFileUpload,
    handleExportErrors,
    t,
    currentLocale,
  };
}
