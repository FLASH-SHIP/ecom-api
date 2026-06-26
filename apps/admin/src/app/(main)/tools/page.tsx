"use client";

import { PermissionGuard } from "@admin/components/layout/PermissionGuard";
import { trpc } from "@admin/lib/trpc";
import { Permissions } from "@ecom/lib/permissions";
import { Badge } from "@ecom/ui/components/badge";
import { Button } from "@ecom/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@ecom/ui/components/card";
import { cn } from "@ecom/ui/lib/utils";
import { CloudDownload, Copy, Download, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

const MODULE_VALUES = [
  "all",
  "posts",
  "categories",
  "tags",
  "pages",
  "customers",
  "settings",
] as const;

type ModuleType = (typeof MODULE_VALUES)[number];

export default function ToolsPage() {
  const t = useTranslations("tools");
  const [selectedModule, setSelectedModule] = useState<ModuleType>("all");
  const [exportResult, setExportResult] = useState<string | null>(null);

  const exportQuery = trpc.viewer.tools.export.useQuery(
    { module: selectedModule },
    { enabled: false },
  );

  const handleExport = async () => {
    const result = await exportQuery.refetch();
    if (result.data) setExportResult(JSON.stringify(result.data, null, 2));
  };

  const handleDownload = () => {
    if (!exportResult) return;
    const blob = new Blob([exportResult], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ecom-export-${selectedModule}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    if (!exportResult) return;
    navigator.clipboard.writeText(exportResult);
  };

  return (
    <PermissionGuard permissions={[Permissions.SYSTEM_MANAGE]}>
      <div className="flex flex-col gap-6">
        <h1 className="text-xl font-bold">{t("title")}</h1>

        {/* Export Section */}
        <Card>
          <CardHeader className="border-b border-border px-6 py-4">
            <CardTitle className="text-base font-semibold">{t("exportTitle")}</CardTitle>
            <p className="mt-0.5 text-sm text-muted-foreground">{t("exportSubtitle")}</p>
          </CardHeader>
          <CardContent className="p-6">
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {MODULE_VALUES.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setSelectedModule(value);
                    setExportResult(null);
                  }}
                  className={cn(
                    "cursor-pointer rounded-lg border p-3 text-left transition-all hover:border-primary/50",
                    selectedModule === value ? "border-primary bg-primary/5" : "border-border",
                  )}
                >
                  <p
                    className={cn(
                      "text-sm font-medium",
                      selectedModule === value ? "text-primary" : "text-foreground",
                    )}
                  >
                    {t(`modules.${value}`)}
                  </p>
                  <p className="text-xs text-muted-foreground">{t(`modules.${value}Desc`)}</p>
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <Button onClick={handleExport} disabled={exportQuery.isFetching}>
                {exportQuery.isFetching ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <CloudDownload className="mr-2 size-4" />
                )}
                {exportQuery.isFetching
                  ? t("exporting")
                  : t("exportButton", { module: t(`modules.${selectedModule}`) })}
              </Button>
              {exportResult && (
                <>
                  <Button variant="outline" onClick={handleDownload}>
                    <Download className="mr-2 size-4" />
                    {t("downloadJson")}
                  </Button>
                  <Button variant="outline" onClick={handleCopy}>
                    <Copy className="mr-2 size-4" />
                    {t("copyClipboard")}
                  </Button>
                  <Badge variant="outline" className="self-center">
                    {(exportResult.length / 1024).toFixed(1)} KB
                  </Badge>
                </>
              )}
            </div>

            {exportResult && (
              <pre className="mt-6 max-h-80 overflow-y-auto rounded-lg bg-muted p-4 font-mono text-xs text-foreground">
                {exportResult.slice(0, 5000)}
                {exportResult.length > 5000 && `\n\n${t("truncated")}`}
              </pre>
            )}
          </CardContent>
        </Card>

        {/* Import Section (placeholder) */}
        <Card>
          <CardHeader className="border-b border-border px-6 py-4">
            <CardTitle className="text-base font-semibold">{t("importTitle")}</CardTitle>
            <p className="mt-0.5 text-sm text-muted-foreground">{t("importSubtitle")}</p>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">{t("importComingSoon")}</p>
          </CardContent>
        </Card>
      </div>
    </PermissionGuard>
  );
}
