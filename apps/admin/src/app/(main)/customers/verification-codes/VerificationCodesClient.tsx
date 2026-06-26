"use client";

import { DataTableSkeleton } from "@admin/components/data-table";
import dynamic from "next/dynamic";

const VerificationCodesContent = dynamic(() => import("./VerificationCodesContent"), {
  ssr: false,
  loading: () => <DataTableSkeleton columnCount={6} rowCount={10} />,
});

export default function VerificationCodesClient() {
  return <VerificationCodesContent />;
}
