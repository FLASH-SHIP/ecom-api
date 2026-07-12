"use client";

import { PermissionGuard } from "@admin/components/layout/PermissionGuard";
import { Permissions } from "@ecom/lib/permissions";
import { useParams } from "next/navigation";
import { PartnerForm } from "../../PartnerForm";

export default function EditPartnerPage() {
  const params = useParams();
  const partnerId = Number(params.id);

  return (
    <PermissionGuard permissions={[Permissions.PARTNERS_UPDATE]}>
      <PartnerForm partnerId={partnerId} />
    </PermissionGuard>
  );
}
