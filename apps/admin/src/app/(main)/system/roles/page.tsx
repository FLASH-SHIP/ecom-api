"use client";

import { DataTableSkeleton } from "@admin/components/data-table";
import { PermissionGuard } from "@admin/components/layout/PermissionGuard";
import { Permissions } from "@ecom/lib/permissions";
import dynamic from "next/dynamic";

const RolesListContent = dynamic(() => import("./RolesListContent"), {
  ssr: false,
  loading: () => <DataTableSkeleton columnCount={6} rowCount={10} />,
});

export default function RolesListPage() {
  return (
    <PermissionGuard permissions={[Permissions.ROLES_READ]}>
      <RolesListContent />
    </PermissionGuard>
  );
}
