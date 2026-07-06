"use client";

import { DataTableSkeleton } from "@admin/components/data-table";
import { PermissionGuard } from "@admin/components/layout/PermissionGuard";
import { Permissions } from "@ecom/lib/permissions";
import dynamic from "next/dynamic";

const RatesContent = dynamic(() => import("./RatesContent"), {
  ssr: false,
  loading: () => <DataTableSkeleton columnCount={8} rowCount={6} />,
});

export default function RatesPage() {
  return (
    <PermissionGuard permissions={[Permissions.RATES_READ]}>
      <RatesContent />
    </PermissionGuard>
  );
}
