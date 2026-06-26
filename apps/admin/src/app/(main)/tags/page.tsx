"use client";

import { PermissionGuard } from "@admin/components/layout/PermissionGuard";
import { Permissions } from "@ecom/lib/permissions";
import dynamic from "next/dynamic";

const TagsContent = dynamic(() => import("./TagsContent"), { ssr: false });

export default function TagsPage() {
  return (
    <PermissionGuard permissions={[Permissions.TAGS_READ]}>
      <TagsContent />
    </PermissionGuard>
  );
}
