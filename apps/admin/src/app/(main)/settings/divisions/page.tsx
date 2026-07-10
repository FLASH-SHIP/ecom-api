"use client";

import { DataTableSkeleton } from "@admin/components/data-table";
import { PermissionGuard } from "@admin/components/layout/PermissionGuard";
import { Permissions } from "@ecom/lib/permissions";
import dynamic from "next/dynamic";

const DivisionsContent = dynamic(() => import("./DivisionsContent"), {
  ssr: false,
  loading: () => <DataTableSkeleton columnCount={5} rowCount={5} />,
});

export default function DivisionsPage() {
  return (
    <PermissionGuard permissions={[Permissions.SETTINGS_READ]}>
      <DivisionsContent />
    </PermissionGuard>
  );
}
