import ModuleI18nProvider from "@admin/components/i18n/ModuleI18nProvider";
import VerificationCodesClient from "./VerificationCodesClient";

export default function VerificationCodesPage() {
  return (
    <ModuleI18nProvider namespaces={["customers", "users"]}>
      <VerificationCodesClient />
    </ModuleI18nProvider>
  );
}
