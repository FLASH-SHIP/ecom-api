"use client";

/**
 * Request Logs page — wrapper with `dynamic({ ssr: false })`.
 *
 * `next/dynamic` with `ssr: false` must be used inside a Client Component
 * (Next.js App Router restriction). The table streams in after JS hydration.
 *
 * Column count: 8 = [ID, Method, URL, Status, Duration, IP, Time, User]
 */
import { DataTableSkeleton } from "@admin/components/data-table";
import { PermissionGuard } from "@admin/components/layout/PermissionGuard";
import { Permissions } from "@ecom/lib/permissions";
import dynamic from "next/dynamic";

const RequestLogsContent = dynamic(() => import("./RequestLogsContent"), {
  ssr: false,
  loading: () => <DataTableSkeleton columnCount={8} rowCount={10} />,
});

export default function RequestLogsPage() {
  return (
    <PermissionGuard permissions={[Permissions.AUDIT_LOGS_READ]}>
      <RequestLogsContent />
    </PermissionGuard>
  );
}
