import ModuleI18nProvider from "@admin/components/i18n/ModuleI18nProvider";
import { PermissionGuard } from "@admin/components/layout/PermissionGuard";
import { Permissions } from "@ecom/lib/permissions";
import VerificationCodesClient from "./VerificationCodesClient";

export default function VerificationCodesPage() {
  return (
    <ModuleI18nProvider namespaces={["customers", "users"]}>
      <PermissionGuard permissions={[Permissions.CUSTOMERS_READ]}>
        <VerificationCodesClient />
      </PermissionGuard>
    </ModuleI18nProvider>
  );
}
