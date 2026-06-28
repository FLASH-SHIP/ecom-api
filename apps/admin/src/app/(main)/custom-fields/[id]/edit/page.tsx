"use client";

import { PermissionGuard } from "@admin/components/layout/PermissionGuard";
import { Permissions } from "@ecom/lib/permissions";
import { useParams } from "next/navigation";
import { FieldGroupForm } from "../../components/forms/FieldGroupForm";

export default function EditFieldGroupPage() {
  const params = useParams<{ id: string }>();
  const groupId = params.id ? Number(params.id) : null;

  return (
    <PermissionGuard permissions={[Permissions.CUSTOM_FIELDS_UPDATE]}>
      <FieldGroupForm groupId={groupId} />
    </PermissionGuard>
  );
}
