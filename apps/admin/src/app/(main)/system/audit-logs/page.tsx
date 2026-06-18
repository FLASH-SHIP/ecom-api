"use client";

/**
 * Audit Logs page — wrapper with `dynamic({ ssr: false })`.
 *
 * `next/dynamic` with `ssr: false` must be used inside a Client Component
 * (Next.js App Router restriction). The table streams in after JS hydration.
 *
 * Column count: 4 = [ID, Action, ActionType, Module]
 */
import { DataTableSkeleton } from "@admin/components/data-table";
import dynamic from "next/dynamic";

const AuditLogsContent = dynamic(() => import("./AuditLogsContent"), {
  ssr: false,
  loading: () => <DataTableSkeleton columnCount={4} rowCount={10} />,
});

export default function AuditLogsPage() {
  return <AuditLogsContent />;
}
