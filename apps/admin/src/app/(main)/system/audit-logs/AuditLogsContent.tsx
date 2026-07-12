"use client";

import type { BulkAction, RowAction } from "@admin/components/data-table";
import { DataTable, toFilterInput } from "@admin/components/data-table";
import { useServerTable } from "@admin/components/data-table/hooks/useServerTable";
import type { DataTableServerParams, FilterFieldDef } from "@admin/components/data-table/types";
import { useToast } from "@admin/components/toast-provider";
import { ConfirmDialog } from "@admin/components/ui/ConfirmDialog";
import { useConfirm } from "@admin/components/ui/useConfirm";
import { trpc } from "@admin/lib/trpc";
import { formatDateTime, formatRelativeTime } from "@admin/utils/dateFormat";
import { Button } from "@ecom/ui/components/button";
import { Input } from "@ecom/ui/components/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@ecom/ui/components/sheet";
import { cn } from "@ecom/ui/lib/utils";
import { keepPreviousData } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Activity,
  ArrowUpRight,
  Calendar,
  Clock,
  Database,
  Globe,
  Laptop,
  Loader2,
  RefreshCw,
  Search,
  Trash,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useRef, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

type AuditLog = {
  id: number;
  action: string;
  module: string;
  entityId: string | null;
  entityType: string | null;
  oldValues: unknown;
  newValues: unknown;
  ipAddress: string | null;
  userAgent?: string | null;
  metadata: unknown;
  createdAt: string;
  user: { id: number; name: string | null; email: string; avatarUrl: string | null } | null;
};

// biome-ignore lint/suspicious/noExplicitAny: generic next-intl translator type
type TranslatorType = any;

// ── Action colour mapping ──────────────────────────────────────────────────────

const ACTION_BADGE: Record<string, string> = {
  CREATE: "border-emerald-200 bg-emerald-50 text-emerald-800",
  UPDATE: "border-blue-200 bg-blue-50 text-blue-800",
  DELETE: "border-red-200 bg-red-50 text-red-800",
  LOGIN: "border-violet-200 bg-violet-50 text-violet-800",
  LOGOUT: "border-neutral-200 bg-neutral-50 text-neutral-600",
  PURGE: "border-amber-200 bg-amber-50 text-amber-800",
  CLEAR_CACHE: "border-amber-200 bg-amber-50 text-amber-800",
  VIEW: "border-neutral-200 bg-neutral-50 text-neutral-600",
};

function formatActionDescription(action: string, module: string, t: TranslatorType): string {
  const mod = formatModuleName(module, t).toLowerCase();
  const key = `actionDesc.${action}` as const;
  const fallback = t("actionDesc.default", { action: action.toLowerCase(), module: mod });
  switch (action) {
    case "LOGIN":
    case "LOGOUT":
    case "CLEAR_CACHE":
      return t(key);
    case "CREATE":
    case "UPDATE":
    case "DELETE":
    case "PURGE":
    case "VIEW":
      return t(key, { module: mod });
    default:
      return fallback;
  }
}

// ── Helper OS & Browser Detectors ─────────────────────────────────────────────

function detectOS(ua: string): string {
  if (ua.includes("windows")) return "Windows";
  if (ua.includes("macintosh") || ua.includes("mac os")) return "macOS";
  if (ua.includes("android")) return "Android";
  if (ua.includes("iphone") || ua.includes("ipad")) return "iOS";
  if (ua.includes("linux")) return "Linux";
  return "Unknown";
}

function detectBrowser(ua: string): string {
  if (ua.includes("edg/")) return "Edge";
  if (ua.includes("chrome") && ua.includes("safari")) {
    if (ua.includes("opr/") || ua.includes("opera")) return "Opera";
    return "Chrome";
  }
  if (ua.includes("safari") && !ua.includes("chrome")) return "Safari";
  if (ua.includes("firefox")) return "Firefox";
  if (ua.includes("msie") || ua.includes("trident")) return "IE";
  return "Unknown";
}

function parseUserAgent(uaString: string | null) {
  if (!uaString) return { browser: "Unknown", os: "Unknown", device: "Unknown" };

  const ua = uaString.toLowerCase();
  const os = detectOS(ua);
  const browser = detectBrowser(ua);
  const device =
    ua.includes("mobi") || ua.includes("android")
      ? ua.includes("ipad")
        ? "Tablet"
        : "Mobile"
      : "Desktop";

  return { browser, os, device };
}

function getEntityLink(entityType: string | null, entityId: string | null): string | null {
  if (!entityType || !entityId) return null;
  const type = entityType.toLowerCase();
  switch (type) {
    case "user":
      return `/system/users/profile/${entityId}`;
    case "role":
      return `/system/roles/edit/${entityId}`;
    case "post":
      return `/posts/${entityId}`;
    case "category":
      return `/categories/${entityId}`;
    case "tag":
      return `/tags/${entityId}`;
    case "customer":
      return `/customers`;
    case "webhook":
      return `/webhooks`;
    default:
      return null;
  }
}

function formatModuleName(module: string, t: TranslatorType): string {
  const key = `modules.${module}`;
  if (t.has(key)) {
    return t(key);
  }

  // Formatting fallback
  const knownSplits: Record<string, string> = {
    customerverificationcodes: "Customer Verification Codes",
    rolepermissions: "Role Permissions",
    auditlogs: "Audit Logs",
    requestlogs: "Request Logs",
    clearcache: "Clear Cache",
  };

  const lowerMod = module.toLowerCase().replace(/[-_]/g, "");
  if (knownSplits[lowerMod]) {
    return knownSplits[lowerMod];
  }

  return module
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// ── Visual Diff Table Helper Functions ────────────────────────────────────────

function formatVal(val: unknown): string {
  if (val === null) return "null";
  if (val === undefined) return "undefined";
  if (typeof val === "boolean") return val ? "true" : "false";
  if (typeof val === "object") {
    try {
      return JSON.stringify(val);
    } catch {
      return "[Object]";
    }
  }
  return String(val);
}

function renderUpdateDiff(
  filteredKeys: string[],
  oldObj: Record<string, unknown>,
  newObj: Record<string, unknown>,
  t: (key: string, values?: Record<string, string>) => string,
) {
  const rows = filteredKeys
    .map((key) => {
      const oldVal = oldObj[key];
      const newVal = newObj[key];

      const normOld = oldVal instanceof Date ? oldVal.toISOString() : oldVal;
      const normNew = newVal instanceof Date ? newVal.toISOString() : newVal;

      if (JSON.stringify(normOld) === JSON.stringify(normNew) || key === "id") {
        return null;
      }

      return (
        <tr key={key} className="border-b border-border/40 hover:bg-muted/30">
          <td
            className="py-2.5 px-3 font-mono text-[11px] font-semibold text-foreground align-top max-w-[120px] truncate"
            title={key}
          >
            {key}
          </td>
          <td className="py-2.5 px-3 text-xs align-top">
            <span className="line-through text-red-500 bg-red-50/60 border border-red-100 rounded px-1.5 py-0.5 break-all inline-block font-mono text-[10px]">
              {formatVal(oldVal)}
            </span>
          </td>
          <td className="py-2.5 px-3 text-xs align-top">
            <span className="text-emerald-700 bg-emerald-50 border border-emerald-100 rounded px-1.5 py-0.5 break-all inline-block font-mono text-[10px] font-medium">
              {formatVal(newVal)}
            </span>
          </td>
        </tr>
      );
    })
    .filter(Boolean);

  if (rows.length === 0) {
    return (
      <div className="py-6 text-center text-xs text-muted-foreground border border-border rounded-lg bg-muted/5">
        {t("detail.noChange")}
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-muted/10">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-border bg-muted/50 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <th className="py-2 px-3">{t("detail.field")}</th>
            <th className="py-2 px-3">{t("detail.oldValue")}</th>
            <th className="py-2 px-3">{t("detail.newValue")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">{rows}</tbody>
      </table>
    </div>
  );
}

function renderCreateDiff(
  filteredKeys: string[],
  newObj: Record<string, unknown>,
  t: (key: string, values?: Record<string, string>) => string,
) {
  const rows = filteredKeys
    .map((key) => {
      const val = newObj[key];
      if (val === null || val === undefined || key === "id") return null;

      return (
        <tr key={key} className="border-b border-border/40 hover:bg-muted/30">
          <td
            className="py-2.5 px-3 font-mono text-[11px] font-semibold text-foreground align-top max-w-[120px] truncate"
            title={key}
          >
            {key}
          </td>
          <td className="py-2.5 px-3 text-xs align-top">
            <span className="text-emerald-700 bg-emerald-50 border border-emerald-100 rounded px-1.5 py-0.5 break-all inline-block font-mono text-[10px] font-medium">
              {formatVal(val)}
            </span>
          </td>
        </tr>
      );
    })
    .filter(Boolean);

  if (rows.length === 0) {
    return (
      <div className="py-6 text-center text-xs text-muted-foreground border border-border rounded-lg bg-muted/5">
        {t("detail.noChange")}
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-muted/10">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-border bg-muted/50 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <th className="py-2 px-3">{t("detail.field")}</th>
            <th className="py-2 px-3">{t("detail.newValue")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">{rows}</tbody>
      </table>
    </div>
  );
}

function renderDeleteDiff(
  filteredKeys: string[],
  oldObj: Record<string, unknown>,
  t: (key: string, values?: Record<string, string>) => string,
) {
  const rows = filteredKeys
    .map((key) => {
      const val = oldObj[key];
      if (val === null || val === undefined || key === "id") return null;

      return (
        <tr key={key} className="border-b border-border/40 hover:bg-muted/30">
          <td
            className="py-2.5 px-3 font-mono text-[11px] font-semibold text-foreground align-top max-w-[120px] truncate"
            title={key}
          >
            {key}
          </td>
          <td className="py-2.5 px-3 text-xs align-top">
            <span className="line-through text-red-500 bg-red-50/60 border border-red-100 rounded px-1.5 py-0.5 break-all inline-block font-mono text-[10px]">
              {formatVal(val)}
            </span>
          </td>
        </tr>
      );
    })
    .filter(Boolean);

  if (rows.length === 0) {
    return (
      <div className="py-6 text-center text-xs text-muted-foreground border border-border rounded-lg bg-muted/5">
        {t("detail.noChange")}
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-muted/10">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-border bg-muted/50 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <th className="py-2 px-3">{t("detail.field")}</th>
            <th className="py-2 px-3">{t("detail.oldValue")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">{rows}</tbody>
      </table>
    </div>
  );
}

// ── Visual Diff Component ─────────────────────────────────────────────────────

interface VisualDiffViewerProps {
  action?: string;
  oldValues?: unknown;
  newValues?: unknown;
  t: TranslatorType;
}

export function VisualDiffViewer({ action = "", oldValues, newValues, t }: VisualDiffViewerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const oldObj = (oldValues as Record<string, unknown>) || {};
  const newObj = (newValues as Record<string, unknown>) || {};

  // Find all unique keys
  const allKeys = useMemo(() => {
    const keysSet = new Set<string>();
    for (const k of Object.keys(oldObj)) keysSet.add(k);
    for (const k of Object.keys(newObj)) keysSet.add(k);
    return Array.from(keysSet).sort();
  }, [oldObj, newObj]);

  const filteredKeys = useMemo(() => {
    if (!searchQuery) return allKeys;
    const q = searchQuery.toLowerCase();
    return allKeys.filter((k) => k.toLowerCase().includes(q));
  }, [allKeys, searchQuery]);

  const renderChanges = () => {
    if (action === "UPDATE") {
      return renderUpdateDiff(filteredKeys, oldObj, newObj, t);
    }
    if (action === "CREATE") {
      return renderCreateDiff(filteredKeys, newObj, t);
    }
    if (action === "DELETE") {
      return renderDeleteDiff(filteredKeys, oldObj, t);
    }

    // Default fallback
    return (
      <div className="flex flex-col gap-2">
        {oldValues != null && (
          <div>
            <p className="mb-1 text-xs text-muted-foreground">{t("detail.oldValues")}</p>
            <pre className="m-0 max-h-[150px] overflow-y-auto rounded-md bg-muted/50 p-2.5 font-mono text-[10px] leading-relaxed">
              {JSON.stringify(oldValues, null, 2)}
            </pre>
          </div>
        )}
        {newValues != null && (
          <div>
            <p className="mb-1 text-xs text-muted-foreground">{t("detail.newValues")}</p>
            <pre className="m-0 max-h-[150px] overflow-y-auto rounded-md bg-muted/50 p-2.5 font-mono text-[10px] leading-relaxed">
              {JSON.stringify(newValues, null, 2)}
            </pre>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
          {action === "UPDATE"
            ? t("detail.fieldsChanged")
            : action === "CREATE"
              ? t("detail.createdFields")
              : action === "DELETE"
                ? t("detail.deletedFields")
                : t("detail.oldValues")}
        </h4>
        {allKeys.length > 5 && (
          <div className="relative w-44">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t("detail.searchFields")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-7 pl-7 pr-2 text-[10px] rounded border-border"
            />
          </div>
        )}
      </div>
      {renderChanges()}
    </div>
  );
}

// ── Small Presentation Cell / Card Components ─────────────────────────────────

interface AuditLogUserCellProps {
  log: AuditLog;
  t: TranslatorType;
  locale: string;
  onUserClick: (id: number) => void;
}

function AuditLogUserCell({ log, t, locale, onUserClick }: AuditLogUserCellProps) {
  const userName = log.user?.name ?? log.user?.email ?? t("systemUser");
  const initials = userName.charAt(0).toUpperCase();
  const actionDesc = formatActionDescription(log.action, log.module, t);
  const relTime = formatRelativeTime(log.createdAt, locale);

  return (
    <div className="flex items-start gap-3 py-1">
      {log.user?.avatarUrl ? (
        // biome-ignore lint/performance/noImgElement: dynamic avatar URL
        <img
          src={log.user.avatarUrl}
          alt={userName}
          className="size-9 shrink-0 rounded-full object-cover border border-border/40"
        />
      ) : (
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
          {initials}
        </div>
      )}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            className="cursor-pointer border-0 bg-transparent p-0 text-left text-sm font-semibold hover:text-primary transition-colors focus:outline-none"
            onClick={() => onUserClick(log.id)}
          >
            {userName}
          </button>
          <span
            className={cn(
              "inline-block rounded px-1.5 py-0 text-[0.65rem] font-bold border leading-relaxed uppercase",
              ACTION_BADGE[log.action] ?? ACTION_BADGE.VIEW,
            )}
          >
            {log.action}
          </span>
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {actionDesc}
          {log.entityType && log.entityId && (
            <span className="ml-1.5 font-mono text-xs text-muted-foreground/50">
              #{log.entityId}
            </span>
          )}
        </p>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground/50">
          <span>{relTime}</span>
          {log.ipAddress && (
            <>
              <span>•</span>
              <span className="font-mono">{log.ipAddress}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface AuditLogStatsGridProps {
  stats: {
    total: number;
    todayCount: number;
    byModule: { module: string; count: number }[];
  };
  t: TranslatorType;
}

function AuditLogStatsGrid({ stats, t }: AuditLogStatsGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {/* Card 1 */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t("stats.total")}
            </p>
            <h3 className="mt-1.5 text-3xl font-bold text-foreground tracking-tight">
              {stats.total.toLocaleString()}
            </h3>
          </div>
          <div className="rounded-lg bg-primary/10 p-2.5 text-primary border border-primary/10">
            <Database className="size-5" />
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-blue-500 to-indigo-500" />
      </div>

      {/* Card 2 */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t("stats.today")}
            </p>
            <h3 className="mt-1.5 text-3xl font-bold text-foreground tracking-tight">
              {stats.todayCount.toLocaleString()}
            </h3>
          </div>
          <div className="rounded-lg bg-emerald-500/10 p-2.5 text-emerald-600 border border-emerald-500/10">
            <Activity className="size-5" />
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-emerald-500 to-teal-500" />
      </div>

      {/* Card 3 */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t("stats.activeModule")}
            </p>
            <h3 className="mt-1.5 text-xl font-bold text-foreground truncate max-w-[180px] tracking-tight">
              {stats.byModule?.[0]?.module ? (
                <span className="font-semibold">
                  {formatModuleName(stats.byModule[0].module, t)}
                </span>
              ) : (
                "—"
              )}
            </h3>
            {stats.byModule?.[0] && (
              <p className="text-xs text-muted-foreground mt-1">
                {stats.byModule[0].count} {t("tableColAction").toLowerCase()}
              </p>
            )}
          </div>
          <div className="rounded-lg bg-amber-500/10 p-2.5 text-amber-600 border border-amber-500/10">
            <Clock className="size-5" />
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-amber-500 to-orange-500" />
      </div>
    </div>
  );
}

interface AuditLogDetailSheetProps {
  detailId: number | null;
  onClose: () => void;
  isLoading: boolean;
  detailLog:
    | {
        id?: number;
        action?: string;
        module?: string;
        entityId?: string | null;
        entityType?: string | null;
        oldValues?: unknown;
        newValues?: unknown;
        ipAddress?: string | null;
        userAgent?: string | null;
        metadata?: unknown;
        createdAt?: Date | string;
        user?: { id: string; name: string | null; email: string; avatarUrl: string | null } | null;
      }
    | null
    | undefined;
  t: TranslatorType;
  locale: string;
}

function AuditLogDetailSheet({
  detailId,
  onClose,
  isLoading,
  detailLog,
  t,
  locale,
}: AuditLogDetailSheetProps) {
  const metadataRows = useMemo(() => {
    if (!detailLog) return [];
    return [
      {
        label: t("detail.time"),
        icon: <Calendar className="size-3.5 text-muted-foreground" />,
        value: (
          <div className="flex flex-col">
            <span className="text-xs font-medium text-foreground">
              {formatDateTime(detailLog.createdAt ?? "")}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {formatRelativeTime(detailLog.createdAt ?? "", locale)}
            </span>
          </div>
        ),
      },
      {
        label: t("detail.actionModule"),
        icon: <Activity className="size-3.5 text-muted-foreground" />,
        value: (
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase border leading-relaxed",
                ACTION_BADGE[detailLog.action ?? "VIEW"] ?? ACTION_BADGE.VIEW,
              )}
            >
              {detailLog.action}
            </span>
            <span className="text-xs text-muted-foreground">→</span>
            <span className="text-xs font-bold text-foreground">
              {formatModuleName(detailLog.module ?? "", t)}
            </span>
          </div>
        ),
      },
      ...(detailLog.entityType
        ? [
            {
              label: t("detail.entity"),
              icon: <ArrowUpRight className="size-3.5 text-muted-foreground" />,
              value: (
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded border border-border">
                    {detailLog.entityType}#{detailLog.entityId}
                  </span>
                  {getEntityLink(detailLog.entityType, detailLog.entityId) && (
                    <Link
                      href={getEntityLink(detailLog.entityType, detailLog.entityId) || "#"}
                      className="inline-flex items-center gap-0.5 text-[11px] text-primary hover:underline font-medium ml-2 transition-colors"
                      onClick={onClose}
                    >
                      {t("detail.actionableLink")}
                      <ArrowUpRight className="size-3" />
                    </Link>
                  )}
                </div>
              ),
            },
          ]
        : []),
      ...(detailLog.ipAddress
        ? [
            {
              label: t("detail.ip"),
              icon: <Globe className="size-3.5 text-muted-foreground" />,
              value: <span className="text-xs font-mono">{detailLog.ipAddress}</span>,
            },
          ]
        : []),
      ...(detailLog.userAgent
        ? [
            {
              label: t("detail.userAgent"),
              icon: <Laptop className="size-3.5 text-muted-foreground" />,
              value: (() => {
                const ua = detailLog.userAgent;
                const parsed = parseUserAgent(ua);
                return (
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5 text-xs text-foreground">
                      <span className="font-semibold">{parsed.browser}</span>
                      <span className="text-muted-foreground/30">•</span>
                      <span className="font-medium text-muted-foreground">{parsed.os}</span>
                      <span className="text-muted-foreground/30">•</span>
                      <span className="text-muted-foreground">{parsed.device}</span>
                    </div>
                    <span
                      className="text-[10px] text-muted-foreground/50 break-all leading-normal"
                      title={ua}
                    >
                      {ua}
                    </span>
                  </div>
                );
              })(),
            },
          ]
        : []),
    ];
  }, [detailLog, t, locale, onClose]);

  return (
    <Sheet open={detailId !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-[500px]">
        <SheetHeader className="border-b border-border px-6 py-4">
          <SheetTitle className="flex items-center gap-2">
            <Activity className="size-4 text-primary" />
            {t("detail.title", { id: detailId ? String(detailId) : "" })}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {isLoading ? (
            <div className="flex h-full items-center justify-center py-20">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : detailLog ? (
            <div className="flex flex-col gap-5">
              {/* User card / Actor */}
              <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 p-4">
                {detailLog.user?.avatarUrl ? (
                  // biome-ignore lint/performance/noImgElement: dynamic avatar URL
                  <img
                    src={detailLog.user.avatarUrl}
                    alt={detailLog.user.name ?? detailLog.user.email}
                    className="size-11 shrink-0 rounded-full object-cover border border-border"
                  />
                ) : (
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base font-semibold text-primary border border-primary/20">
                    {(detailLog.user?.name ?? detailLog.user?.email ?? t("systemUser"))
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {detailLog.user?.name ?? t("systemUser")}
                  </p>
                  {detailLog.user?.email && (
                    <p className="text-xs text-muted-foreground truncate">{detailLog.user.email}</p>
                  )}
                  {detailLog.user?.id && (
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                      ID: #{detailLog.user.id}
                    </p>
                  )}
                </div>
              </div>

              {/* Metadata rows */}
              <div className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-card p-4">
                {metadataRows.map(({ label, icon, value }) => (
                  <div
                    key={label}
                    className="flex items-start gap-3 border-b border-border/40 pb-2.5 last:border-0 last:pb-0"
                  >
                    <div className="mt-0.5">{icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        {label}
                      </p>
                      <div className="mt-1">{value}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Separator */}
              <div className="h-px bg-border/60 my-1" />

              {/* Diff Viewer */}
              <VisualDiffViewer
                action={detailLog.action || ""}
                oldValues={detailLog.oldValues}
                newValues={detailLog.newValues}
                t={t}
              />
            </div>
          ) : null}
        </div>

        <div className="flex justify-end border-t border-border px-6 py-4 bg-muted/10">
          <Button variant="outline" onClick={onClose} className="h-9 px-4">
            {t("detail.close")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Map DataTable server params → tRPC listAuditLogs input ───────────────────

function toQueryInput(params: DataTableServerParams) {
  const { filters, sort, page, pageSize } = params;

  return {
    page,
    pageSize,
    filters: toFilterInput(filters),
    sortBy: sort.direction != null ? (sort.key as "id" | "createdAt") : undefined,
    sortDir: sort.direction != null ? sort.direction : undefined,
  };
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AuditLogsContent() {
  const t = useTranslations("auditLogs");
  const locale = useLocale();
  const { askConfirm, dialogProps: confirmDialogProps } = useConfirm();
  const { toast } = useToast();
  const [detailId, setDetailId] = useState<number | null>(null);

  const { queryInput, onServerChange, tableKey, initialState } = useServerTable({
    tableId: "audit-logs",
    defaultSort: { key: "id", direction: "desc" },
    defaultPageSize: 25,
    toQueryInput,
  });

  const utils = trpc.useUtils();

  const { data, isLoading, isFetching, error, refetch } = trpc.viewer.auditLogs.list.useQuery(
    queryInput,
    {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      placeholderData: keepPreviousData,
    },
  );

  // Stats query
  const { data: stats } = trpc.viewer.auditLogs.stats.useQuery(undefined, {
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  // Log detail query
  const { data: detailLog, isLoading: isDetailLoading } = trpc.viewer.auditLogs.get.useQuery(
    { id: detailId ?? 0 },
    { enabled: detailId !== null },
  );

  const rows = ((data?.items ?? []) as unknown[])
    .filter(
      (item): item is AuditLog =>
        item !== null &&
        typeof item === "object" &&
        "id" in item &&
        typeof (item as { id: unknown }).id === "number" &&
        "action" in item &&
        "module" in item,
    )
    .map((item) => ({
      ...item,
      createdAt: String((item as AuditLog & { createdAt: Date | string }).createdAt),
    }));

  const serverTotalCount = data?.total ?? 0;

  const deleteMut = trpc.viewer.auditLogs.delete.useMutation({
    onSuccess: () => {
      utils.viewer.auditLogs.list.invalidate();
      utils.viewer.auditLogs.stats.invalidate();
      if (!isBulkRef.current) {
        toast(t("deleteSuccess"), "success");
      }
    },
    onError: () => {
      if (!isBulkRef.current) {
        toast(t("deleteError"), "error");
      }
    },
  });

  const purgeMut = trpc.viewer.auditLogs.purge.useMutation({
    onSuccess: () => {
      utils.viewer.auditLogs.list.invalidate();
      utils.viewer.auditLogs.stats.invalidate();
      toast(t("purgeSuccess"), "success");
    },
    onError: () => {
      toast(t("purgeError"), "error");
    },
  });

  const purgeAllMut = trpc.viewer.auditLogs.purgeAll.useMutation({
    onSuccess: () => {
      utils.viewer.auditLogs.list.invalidate();
      utils.viewer.auditLogs.stats.invalidate();
      toast(t("purgeAllSuccess"), "success");
    },
    onError: () => {
      toast(t("purgeAllError"), "error");
    },
  });

  const isBulkRef = useRef(false);

  // ── Column definitions ─────────────────────────────────────────────────────

  const columns: ColumnDef<AuditLog>[] = useMemo(
    () => [
      {
        accessorKey: "id",
        header: "ID",
        size: 60,
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.id}</span>,
      },
      {
        accessorKey: "createdAt",
        header: t("tableColAction"),
        size: 480,
        enableColumnFilter: false,
        cell: ({ row }) => (
          <AuditLogUserCell
            log={row.original}
            t={t}
            locale={locale}
            onUserClick={(id) => setDetailId(id)}
          />
        ),
      },
      {
        accessorKey: "action",
        header: t("tableColActionType"),
        size: 130,
      },
      {
        accessorKey: "module",
        header: t("tableColModule"),
        size: 130,
        cell: ({ row }) => (
          <span className="text-sm font-medium">{formatModuleName(row.original.module, t)}</span>
        ),
      },
    ],
    [t, locale],
  );

  // ── Filter fields (Botble-style) ──────────────────────────────────────────

  const filterFields: FilterFieldDef[] = useMemo(
    () => [
      {
        key: "action",
        label: t("tableColActionType"),
        type: "select",
        operators: [{ value: "equals", label: "equals" }],
        options: [
          { value: "CREATE", label: "CREATE" },
          { value: "UPDATE", label: "UPDATE" },
          { value: "DELETE", label: "DELETE" },
          { value: "LOGIN", label: "LOGIN" },
          { value: "LOGOUT", label: "LOGOUT" },
          { value: "VIEW", label: "VIEW" },
          { value: "PURGE", label: "PURGE" },
          { value: "CLEAR_CACHE", label: "CLEAR_CACHE" },
        ],
      },
      {
        key: "module",
        label: t("tableColModule"),
        type: "text",
        operators: [
          { value: "contains", label: "contains" },
          { value: "equals", label: "equals" },
        ],
      },
      {
        key: "createdAt",
        label: t("tableColAction"),
        type: "date",
        operators: [
          { value: "greaterThanOrEqual", label: "greaterThanOrEqual" },
          { value: "lessThanOrEqual", label: "lessThanOrEqual" },
        ],
      },
    ],
    [t],
  );

  // ── Row actions ──────────────────────────────────────────────────────────────

  const rowActions: RowAction<AuditLog>[] = useMemo(
    () => [
      {
        key: "view",
        tooltip: t("detail.title", { id: "" }).replace("#", "").trim(),
        icon: <Activity size={16} />,
        onClick: (row) => setDetailId(row.id),
      },
      {
        key: "delete",
        tooltip: t("actions.delete"),
        icon: <Trash size={16} />,
        color: "error",
        onClick: (row) => {
          askConfirm({
            message: t("deleteRowConfirm", { id: String(row.id) }),
            onConfirm: () => deleteMut.mutate({ id: row.id }),
          });
        },
      },
    ],
    [askConfirm, deleteMut, t],
  );

  // ── Bulk actions ─────────────────────────────────────────────────────────────

  const bulkActions: BulkAction<AuditLog>[] = useMemo(
    () => [
      {
        key: "bulkDelete",
        label: t("actions.bulkDelete"),
        variant: "danger",
        onClick: async (selected, clearSelection) => {
          askConfirm({
            message: t("bulkDeleteConfirm", { count: String(selected.length) }),
            onConfirm: async () => {
              isBulkRef.current = true;
              try {
                await Promise.all(selected.map((r) => deleteMut.mutateAsync({ id: r.id })));
                toast(t("bulkDeleteSuccess", { count: String(selected.length) }), "success");
                clearSelection();
              } catch {
                toast(t("bulkDeleteError"), "error");
              } finally {
                isBulkRef.current = false;
              }
            },
          });
        },
      },
    ],
    [askConfirm, deleteMut, toast, t],
  );

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">
      {/* Quick Stats Grid */}
      {stats && <AuditLogStatsGrid stats={stats} t={t} />}

      {error && <p className="mb-2 text-sm text-destructive">{error.message}</p>}

      <DataTable<AuditLog>
        tableKey={tableKey}
        defaultPageSize={initialState.pageSize}
        defaultPage={initialState.page}
        data={rows}
        columns={columns}
        rowActions={rowActions}
        bulkActions={bulkActions}
        filterFields={filterFields}
        isLoading={isLoading}
        isFetching={isFetching}
        onServerChange={(params) =>
          onServerChange({
            search: params.search,
            filters: params.filters,
            sort: params.sort,
            page: params.page,
            pageSize: params.pageSize,
          })
        }
        rowCount={serverTotalCount}
        pageTitle={t("title")}
        headerActions={
          <div className="flex gap-2">
            <Button
              id="audit-purge-30-btn"
              variant="outline"
              size="sm"
              className="text-destructive border-destructive/20 hover:bg-destructive/5 hover:text-destructive"
              onClick={() => {
                askConfirm({
                  title: t("purge30Title"),
                  message: t("purge30Message"),
                  confirmLabel: t("purgeAllConfirm"),
                  onConfirm: () => purgeMut.mutate({ olderThanDays: 30 }),
                });
              }}
              disabled={purgeMut.isPending || purgeAllMut.isPending}
            >
              <Trash2 className="mr-2 size-4" />
              {purgeMut.isPending ? t("purging") : t("purge30Days")}
            </Button>
            <Button
              id="audit-purge-all-btn"
              variant="outline"
              size="sm"
              className="text-destructive border-destructive/20 hover:bg-destructive/5 hover:text-destructive"
              onClick={() => {
                askConfirm({
                  title: t("purgeAllTitle"),
                  message: t("purgeAllMessage"),
                  confirmLabel: t("purgeAllConfirm"),
                  onConfirm: () => purgeAllMut.mutate(),
                });
              }}
              disabled={purgeMut.isPending || purgeAllMut.isPending}
            >
              <Trash className="mr-2 size-4" />
              {purgeAllMut.isPending ? t("purging") : t("purgeAll")}
            </Button>
            <Button id="audit-reload-btn" variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="mr-2 size-4" />
              {t("reload")}
            </Button>
          </div>
        }
        emptyState={
          <div className="py-8 text-center">
            <p className="mb-1 text-muted-foreground">{t("noLogsTitle")}</p>
            <p className="text-sm text-muted-foreground/60">{t("noLogsSubtitle")}</p>
          </div>
        }
      />

      <ConfirmDialog {...confirmDialogProps} />

      {/* Detail Sheet */}
      <AuditLogDetailSheet
        detailId={detailId}
        onClose={() => setDetailId(null)}
        isLoading={isDetailLoading}
        detailLog={detailLog}
        t={t}
        locale={locale}
      />
    </div>
  );
}
