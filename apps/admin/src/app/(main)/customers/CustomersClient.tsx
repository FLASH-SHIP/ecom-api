"use client";

import { DataTableSkeleton } from "@admin/components/data-table";
import dynamic from "next/dynamic";

const CustomersContent = dynamic(() => import("./CustomersContent"), {
  ssr: false,
  loading: () => <DataTableSkeleton columnCount={6} rowCount={10} />,
});

export default function CustomersClient() {
  return <CustomersContent />;
}
