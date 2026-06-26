"use client";
import { DataTableSkeleton } from "@admin/components/data-table";
import { PermissionGuard } from "@admin/components/layout/PermissionGuard";
import { Permissions } from "@ecom/lib/permissions";
/**
 * Custom Fields page — wrapper with `dynamic({ ssr: false })`.
 *
 * `next/dynamic` with `ssr: false` must be used inside a Client Component.
 * The `loading` prop uses `DataTableSkeleton` — a matched replica
 * of the DataTable layout so both loading phases look identical.
 *
 * Column count: 4 = [ID, Title, CreatedAt, Status]
 */
import dynamic from "next/dynamic";

const CustomFieldsContent = dynamic(() => import("./CustomFieldsContent"), {
  ssr: false,
  loading: () => <DataTableSkeleton columnCount={4} rowCount={10} />,
});

export default function CustomFieldsPage() {
  return (
    <PermissionGuard permissions={[Permissions.CUSTOM_FIELDS_READ]}>
      <CustomFieldsContent />
    </PermissionGuard>
  );
}
