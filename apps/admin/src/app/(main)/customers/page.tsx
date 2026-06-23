"use client";

import { DataTableSkeleton } from "@admin/components/data-table";
import ModuleI18nProvider from "@admin/components/i18n/ModuleI18nProvider";
import dynamic from "next/dynamic";

const CustomersContent = dynamic(() => import("./CustomersContent"), {
  ssr: false,
  loading: () => <DataTableSkeleton columnCount={6} rowCount={10} />,
});

export default function CustomersPage() {
  return (
    <ModuleI18nProvider namespaces={["customers", "users"]}>
      <CustomersContent />
    </ModuleI18nProvider>
  );
}
