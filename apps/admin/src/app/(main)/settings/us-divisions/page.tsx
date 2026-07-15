"use client";

import { DataTableSkeleton } from "@admin/components/data-table";
import { PermissionGuard } from "@admin/components/layout/PermissionGuard";
import { Permissions } from "@ecom/lib/permissions";
import dynamic from "next/dynamic";

const UsDivisionsContent = dynamic(() => import("./UsDivisionsContent"), {
  ssr: false,
  loading: () => <DataTableSkeleton columnCount={4} rowCount={5} />,
});

export default function UsDivisionsPage() {
  return (
    <PermissionGuard permissions={[Permissions.SETTINGS_READ]}>
      <UsDivisionsContent />
    </PermissionGuard>
  );
}
