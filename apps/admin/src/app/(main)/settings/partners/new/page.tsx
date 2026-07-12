"use client";

import { PermissionGuard } from "@admin/components/layout/PermissionGuard";
import { Permissions } from "@ecom/lib/permissions";
import { PartnerForm } from "../PartnerForm";

export default function NewPartnerPage() {
  return (
    <PermissionGuard permissions={[Permissions.PARTNERS_CREATE]}>
      <PartnerForm partnerId={null} />
    </PermissionGuard>
  );
}
