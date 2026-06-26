import ModuleI18nProvider from "@admin/components/i18n/ModuleI18nProvider";
import { PermissionGuard } from "@admin/components/layout/PermissionGuard";
import { Permissions } from "@ecom/lib/permissions";
import CustomersClient from "./CustomersClient";

export default function CustomersPage() {
  return (
    <ModuleI18nProvider namespaces={["customers", "users"]}>
      <PermissionGuard permissions={[Permissions.CUSTOMERS_READ]}>
        <CustomersClient />
      </PermissionGuard>
    </ModuleI18nProvider>
  );
}
