"use client";

import { DataTableSkeleton } from "@admin/components/data-table";
import { PermissionGuard } from "@admin/components/layout/PermissionGuard";
import { Permissions } from "@ecom/lib/permissions";
import dynamic from "next/dynamic";

const LanguagesContent = dynamic(() => import("./LanguagesContent"), {
  ssr: false,
  loading: () => <DataTableSkeleton columnCount={7} rowCount={5} />,
});

export default function LanguagesPage() {
  return (
    <PermissionGuard permissions={[Permissions.SETTINGS_READ]}>
      <LanguagesContent />
    </PermissionGuard>
  );
}
