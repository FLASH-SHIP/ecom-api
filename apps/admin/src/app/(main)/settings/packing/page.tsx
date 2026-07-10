"use client";

import { DataTableSkeleton } from "@admin/components/data-table";
import { PermissionGuard } from "@admin/components/layout/PermissionGuard";
import { Permissions } from "@ecom/lib/permissions";
import dynamic from "next/dynamic";

const PackingContent = dynamic(() => import("./PackingContent"), {
  ssr: false,
  loading: () => <DataTableSkeleton columnCount={6} rowCount={5} />,
});

export default function PackingPage() {
  return (
    <PermissionGuard permissions={[Permissions.SETTINGS_READ]}>
      <PackingContent />
    </PermissionGuard>
  );
}
