import { Button } from "@ecom/ui/components/button";
import { Card, CardContent } from "@ecom/ui/components/card";
import { Checkbox } from "@ecom/ui/components/checkbox";
import { cn } from "@ecom/ui/lib/utils";
import { Download, FileText, Upload, X } from "lucide-react";
import type React from "react";
import { useState } from "react";

interface DropzoneProps {
  file: File | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  buyLabel: boolean;
  setBuyLabel: (val: boolean) => void;
  removeFile: () => void;
  validateAndSetFile: (file: File) => void;
  handleProceedImport: () => void;
  t: (key: string, variables?: Record<string, string | number>) => string;
  currentLocale: string;
}

export function Dropzone({
  file,
  fileInputRef,
  buyLabel,
  setBuyLabel,
  removeFile,
  validateAndSetFile,
  handleProceedImport,
  t,
  currentLocale,
}: DropzoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const [showConfirmReplace, setShowConfirmReplace] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        if (file) {
          setPendingFile(droppedFile);
          setShowConfirmReplace(true);
        } else {
          validateAndSetFile(droppedFile);
        }
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (selectedFile) {
        if (file) {
          setPendingFile(selectedFile);
          setShowConfirmReplace(true);
        } else {
          validateAndSetFile(selectedFile);
        }
      }
    }
  };

  const confirmReplace = () => {
    if (pendingFile) {
      validateAndSetFile(pendingFile);
      setPendingFile(null);
    }
    setShowConfirmReplace(false);
  };

  // Extract base name and extension for Figma matching display
  const getFileDetails = (fileObj: File) => {
    const dotIndex = fileObj.name.lastIndexOf(".");
    const baseName = dotIndex !== -1 ? fileObj.name.substring(0, dotIndex) : fileObj.name;
    const ext = dotIndex !== -1 ? fileObj.name.substring(dotIndex + 1) : "";
    return { baseName, ext };
  };

  const { baseName, ext } = file ? getFileDetails(file) : { baseName: "", ext: "" };

  return (
    <>
      <Card className="rounded-2xl border border-border bg-card shadow-sm">
        <CardContent className="p-6 flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col gap-1">
            <h2 className="font-semibold text-foreground text-base">
              {currentLocale === "vi" ? "Tải lên tệp mẫu" : "Upload Template File"}
            </h2>
          </div>

          {/* Dropzone Area (Dashed border remains visible in both states) */}
          {/* biome-ignore lint/a11y/useSemanticElements: Dropzone is a block container with interactive children and cannot use button tag */}
          <div
            role="button"
            tabIndex={0}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            className={cn(
              "border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-3 text-center cursor-pointer transition-all duration-300",
              dragOver
                ? "border-[#0F798C] bg-[#0F798C]/5 dark:bg-cyan-950/10 scale-[1.01]"
                : "border-[#0F798C]/40 hover:border-[#0F798C] hover:bg-[#0F798C]/5 dark:hover:bg-cyan-950/5",
              file ? "p-6" : "p-12",
            )}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx,.xls"
              className="hidden"
            />
            <div
              className={cn(
                "rounded-full bg-[#0F798C]/10 flex items-center justify-center text-[#0F798C] dark:text-cyan-400 transition-transform duration-300",
                file ? "h-12 w-12" : "h-16 w-16",
              )}
            >
              <Upload className={file ? "h-6 w-6" : "h-8 w-8"} />
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-medium text-foreground text-sm">
                {!file
                  ? t("orders.import.dragDropZone")
                  : currentLocale === "vi"
                    ? `Tải tệp mới để thay thế tệp "${baseName}"`
                    : `Upload a new file to replace the "${baseName}"`}
              </span>
            </div>
          </div>

          {/* Selected File Card - displayed only when a file is chosen */}
          {file && (
            <FilePreviewCard
              baseName={baseName}
              ext={ext}
              size={file.size}
              removeFile={removeFile}
            />
          )}

          {/* Download Templates Section */}
          <div className="flex flex-col gap-3">
            <h3 className="font-semibold text-foreground text-sm">
              {currentLocale === "vi" ? "Tải xuống file mẫu" : "Download Templates"}
            </h3>
            <a
              href="/templates/standard_template.xlsx"
              download
              className="flex items-center justify-between border border-border bg-card hover:bg-accent/40 dark:hover:bg-accent/10 p-4 rounded-xl transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <div className="h-10 w-10 rounded-full bg-[#0F798C]/10 flex items-center justify-center text-[#0F798C]">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold text-foreground text-sm">
                    {t("orders.import.standardTemplate")}
                  </span>
                  <span className="text-xs text-muted-foreground">V1.2 • 2048Kb</span>
                </div>
              </div>
              <Download className="h-5 w-5 text-[#0F798C]" />
            </a>
          </div>

          {/* Options & Action Row - displayed only when a file is chosen */}
          {file && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-border pt-5">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="buy-label-all"
                  checked={buyLabel}
                  onCheckedChange={(checked) => setBuyLabel(!!checked)}
                />
                <label
                  htmlFor="buy-label-all"
                  className="text-sm font-medium leading-none text-foreground cursor-pointer"
                >
                  {t("orders.import.buyLabelCheckbox")}
                </label>
              </div>

              <Button
                onClick={handleProceedImport}
                className="bg-[#0F798C] hover:bg-[#0c6070] text-white font-semibold px-8 py-2.5 rounded-lg flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all"
              >
                {currentLocale === "vi" ? "Import" : "Import"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmReplaceModal
        isOpen={showConfirmReplace && pendingFile !== null}
        fileName={file?.name || ""}
        onConfirm={confirmReplace}
        onCancel={() => {
          setPendingFile(null);
          setShowConfirmReplace(false);
        }}
        t={t}
        currentLocale={currentLocale}
      />
    </>
  );
}

interface FilePreviewCardProps {
  baseName: string;
  ext: string;
  size: number;
  removeFile: () => void;
}

function FilePreviewCard({ baseName, ext, size, removeFile }: FilePreviewCardProps) {
  return (
    <div className="border border-teal-200 dark:border-teal-900/30 bg-[#CCF2EB]/50 dark:bg-teal-950/30 p-4 rounded-xl flex items-center justify-between transition-all duration-300">
      <div className="flex items-center gap-3.5">
        <div className="h-10 w-10 rounded-lg bg-[#0F798C]/15 flex items-center justify-center text-[#0F798C] dark:text-cyan-400">
          <FileText className="h-5 w-5" />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold text-foreground text-sm max-w-[200px] sm:max-w-xs md:max-w-md truncate">
            {baseName}
          </span>
          <span className="text-xs text-muted-foreground lowercase">
            {ext} • {(size / 1024).toFixed(0)}kb
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={removeFile}
        className="h-8 w-8 rounded-full border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all cursor-pointer"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

interface ConfirmReplaceModalProps {
  isOpen: boolean;
  fileName: string;
  onConfirm: () => void;
  onCancel: () => void;
  t: (key: string, variables?: Record<string, string | number>) => string;
  currentLocale: string;
}

function ConfirmReplaceModal({
  isOpen,
  fileName,
  onConfirm,
  onCancel,
  t,
  currentLocale,
}: ConfirmReplaceModalProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-md rounded-xl border border-border shadow-2xl animate-in fade-in zoom-in-95 duration-200 p-6 flex flex-col gap-6 bg-card text-center sm:text-left">
        <div className="flex flex-col gap-2">
          <h3 className="font-bold text-lg text-rose-600 dark:text-rose-400">
            {t("orders.import.confirmReplaceTitle")}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {currentLocale === "vi"
              ? `Bạn có chắc chắn muốn thay thế tệp "${fileName}" bằng một tệp mới không?`
              : `Are you sure you want to replace "${fileName}" by a new file?`}
          </p>
        </div>
        <div className="flex flex-row gap-3">
          <Button
            onClick={onConfirm}
            className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold py-2.5 rounded-lg transition-colors cursor-pointer"
          >
            {currentLocale === "vi" ? "Thay thế" : "Replace"}
          </Button>
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1 border-border text-foreground hover:bg-accent hover:text-accent-foreground font-semibold py-2.5 rounded-lg transition-colors cursor-pointer"
          >
            {currentLocale === "vi" ? "Hủy" : "Cancel"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
