"use client";

import { trpc } from "@customer/lib/trpc";
import { Button } from "@ecom/ui/components/button";
import { RefreshCw } from "lucide-react";
import Link from "next/link";
import { Dropzone } from "./components/Dropzone";
import { ErrorTable } from "./components/ErrorTable";
import { NotesPanel } from "./components/NotesPanel";
import { ProgressOverlay } from "./components/ProgressOverlay";
import { useOrderImport } from "./hooks/useOrderImport";

export default function ImportOrdersPage() {
  // tRPC query to satisfy hook parameters, but we don't query history on this page anymore
  const utils = trpc.useUtils();
  const refetchHistory = () => {
    utils.customer.orders.listImportSessions.invalidate();
  };

  // Import custom hook orchestrating state & uploading logic
  const {
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
    removeFile,
    validateAndSetFile,
    handleFileUpload,
    handleExportErrors,
    t,
    currentLocale,
  } = useOrderImport(refetchHistory);

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-foreground">{t("orders.importOrder")}</h1>
        {importStatus === "completed" && (
          <Button
            onClick={() => setImportStatus("idle")}
            variant="outline"
            className="flex items-center gap-1.5"
          >
            <RefreshCw className="h-4 w-4" />
            {currentLocale === "vi" ? "Làm mới / Import lại" : "Reset / Import Again"}
          </Button>
        )}
      </div>

      {/* Tabs Layout */}
      {importStatus === "idle" && (
        <div className="bg-[#CCF2EB] dark:bg-teal-950/40 p-1 rounded-xl inline-flex gap-1 self-start mb-2 border border-transparent dark:border-teal-800/20">
          <Link
            href="/orders/import"
            className="px-6 py-2 font-bold text-sm transition-all rounded-lg bg-white dark:bg-teal-900 text-[#0c6070] dark:text-teal-200 shadow-sm flex items-center gap-2 cursor-pointer"
          >
            {t("orders.import.uploadTab")}
          </Link>
          <Link
            href="/orders/import/history"
            className="px-6 py-2 font-bold text-sm transition-all rounded-lg text-[#0c6070] dark:text-teal-300 hover:bg-white/40 dark:hover:bg-teal-900/40 flex items-center gap-2 cursor-pointer"
          >
            {t("orders.import.historyTab")}
          </Link>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1">
        {/* Idle Mode: Dropzone & Guidance side-by-side */}
        {importStatus === "idle" && (
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            <div className="flex-1 w-full">
              <Dropzone
                file={file}
                fileInputRef={fileInputRef}
                buyLabel={buyLabel}
                setBuyLabel={setBuyLabel}
                removeFile={removeFile}
                validateAndSetFile={validateAndSetFile}
                handleProceedImport={handleFileUpload}
                t={t}
                currentLocale={currentLocale}
              />
            </div>
            <NotesPanel t={t} />
          </div>
        )}

        {/* Parsing/Uploading Mode: Progress indicators */}
        {(importStatus === "parsing" || importStatus === "importing") && (
          <ProgressOverlay
            importStatus={importStatus}
            uploadProgress={uploadProgress}
            successCount={successCount}
            failedCount={failedCount}
            totalRowsCount={totalRowsCount}
            currentLocale={currentLocale}
          />
        )}

        {/* Completed Mode: Error breakdown lists & quick navigation */}
        {importStatus === "completed" && (
          <ErrorTable
            importStatus={importStatus}
            totalRowsCount={totalRowsCount}
            successCount={successCount}
            failedCount={failedCount}
            importErrors={importErrors}
            handleExportErrors={handleExportErrors}
            setFile={setFile}
            setImportStatus={setImportStatus}
            t={t}
            currentLocale={currentLocale}
          />
        )}
      </div>
    </div>
  );
}
