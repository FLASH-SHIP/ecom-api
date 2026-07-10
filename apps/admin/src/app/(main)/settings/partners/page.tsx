"use client";

import { DataTableSkeleton } from "@admin/components/data-table";
import { PermissionGuard } from "@admin/components/layout/PermissionGuard";
import { Permissions } from "@ecom/lib/permissions";
import dynamic from "next/dynamic";

const PartnersContent = dynamic(() => import("./PartnersContent"), {
  ssr: false,
  loading: () => <DataTableSkeleton columnCount={6} rowCount={8} />,
});

export default function PartnersPage() {
  return (
    <PermissionGuard permissions={[Permissions.PARTNERS_READ]}>
      <PartnersContent />
    </PermissionGuard>
  );
}
