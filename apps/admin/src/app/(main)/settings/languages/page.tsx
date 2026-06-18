"use client";

import { DataTableSkeleton } from "@admin/components/data-table";
import dynamic from "next/dynamic";

const LanguagesContent = dynamic(() => import("./LanguagesContent"), {
  ssr: false,
  loading: () => <DataTableSkeleton columnCount={7} rowCount={5} />,
});

export default function LanguagesPage() {
  return <LanguagesContent />;
}
