"use client";

import { PermissionGuard } from "@admin/components/layout/PermissionGuard";
import { Permissions } from "@ecom/lib/permissions";
import { FieldGroupForm } from "../components/forms/FieldGroupForm";

export default function NewFieldGroupPage() {
  return (
    <PermissionGuard permissions={[Permissions.CUSTOM_FIELDS_CREATE]}>
      <FieldGroupForm groupId={null} />
    </PermissionGuard>
  );
}
