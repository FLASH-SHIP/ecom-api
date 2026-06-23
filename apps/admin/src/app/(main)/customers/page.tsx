import ModuleI18nProvider from "@admin/components/i18n/ModuleI18nProvider";
import CustomersClient from "./CustomersClient";

export default function CustomersPage() {
  return (
    <ModuleI18nProvider namespaces={["customers", "users"]}>
      <CustomersClient />
    </ModuleI18nProvider>
  );
}
