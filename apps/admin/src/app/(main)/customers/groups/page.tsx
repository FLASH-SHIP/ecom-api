import ModuleI18nProvider from "@admin/components/i18n/ModuleI18nProvider";
import { PermissionGuard } from "@admin/components/layout/PermissionGuard";
import { Permissions } from "@ecom/lib/permissions";
import GroupsClient from "./GroupsClient";

export default function CustomerGroupsPage() {
  return (
    <ModuleI18nProvider namespaces={["customer-groups", "common"]}>
      <PermissionGuard permissions={[Permissions.CUSTOMER_GROUPS_READ]}>
        <GroupsClient />
      </PermissionGuard>
    </ModuleI18nProvider>
  );
}
