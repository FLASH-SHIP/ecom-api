"use client";

import { DataTableSkeleton } from "@admin/components/data-table";
import dynamic from "next/dynamic";

const RolesListContent = dynamic(() => import("./RolesListContent"), {
  ssr: false,
  loading: () => <DataTableSkeleton columnCount={6} rowCount={10} />,
});

export default function RolesListPage() {
  return <RolesListContent />;
}
