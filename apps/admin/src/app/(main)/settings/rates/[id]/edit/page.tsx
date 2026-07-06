"use client";

import { PermissionGuard } from "@admin/components/layout/PermissionGuard";
import { Permissions } from "@ecom/lib/permissions";
import { useParams } from "next/navigation";
import { RateCardForm } from "../../components/RateCardForm";

export default function EditRateCardPage() {
  const params = useParams<{ id: string }>();
  const id = params.id ? Number(params.id) : null;

  return (
    <PermissionGuard permissions={[Permissions.RATES_UPDATE]}>
      <RateCardForm rateCardId={id} />
    </PermissionGuard>
  );
}
