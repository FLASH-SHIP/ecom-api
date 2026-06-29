"use client";

import { useToast } from "@admin/components/toast-provider";
import { downloadJson } from "@admin/lib/download";
import { trpc } from "@admin/lib/trpc";
import { Button } from "@ecom/ui/components/button";
import { Download, Loader2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef } from "react";

interface ExportImportControlsProps {
  selectedIds?: number[];
  disableExport?: boolean;
  onImported?: () => void;
}

export function ExportImportControls({
  selectedIds,
  disableExport,
  onImported,
}: ExportImportControlsProps) {
  const t = useTranslations("customFields.exportImport");
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { refetch: doExport, isFetching: isExporting } =
    trpc.viewer.customFields.exportGroups.useQuery(
      { ids: selectedIds?.length ? selectedIds : undefined },
      { enabled: false },
    );

  const importMut = trpc.viewer.customFields.importGroups.useMutation({
    onSuccess: (result) => {
      // Show as toast — not inline so toolbar layout is not broken
      toast(t("importSuccess", { count: result.created }), "success");
      onImported?.();
    },
    onError: (err) => toast(err.message, "error"),
  });

  async function handleExport() {
    const result = await doExport();
    if (!result.data) return;

    const filename = `field-groups-export-${new Date().toISOString().split("T")[0]}.json`;
    await downloadJson(result.data, filename);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const data = Array.isArray(json) ? json : [json];
        importMut.mutate(data as Record<string, unknown>[]);
      } catch {
        toast(t("invalidFile"), "error");
      }
    };
    reader.readAsText(file);

    // Reset so the same file can be re-selected
    e.target.value = "";
  }

  return (
    <div className="flex gap-2">
      <Button
        id="export-field-groups"
        size="sm"
        variant="outline"
        onClick={handleExport}
        disabled={isExporting || disableExport}
      >
        {isExporting ? (
          <Loader2 className="mr-2 size-4 animate-spin" />
        ) : (
          <Download className="mr-2 size-4" />
        )}
        {isExporting ? t("exporting") : t("export")}
      </Button>

      <Button
        id="import-field-groups"
        size="sm"
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        disabled={importMut.isPending}
      >
        {importMut.isPending ? (
          <Loader2 className="mr-2 size-4 animate-spin" />
        ) : (
          <Upload className="mr-2 size-4" />
        )}
        {importMut.isPending ? t("importing") : t("import")}
      </Button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileChange}
        aria-label="Import field groups JSON file"
      />
    </div>
  );
}
