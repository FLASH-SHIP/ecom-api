import ModuleI18nProvider from "@admin/components/i18n/ModuleI18nProvider";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Quản trị hệ thống | Ecom",
  description: "Quản lý người dùng, vai trò, phân quyền và theo dõi hoạt động hệ thống",
};

export default function SystemLayout({ children }: { children: ReactNode }) {
  return (
    <ModuleI18nProvider
      namespaces={[
        "users",
        "roles",
        "cache",
        "systemInfo",
        "auditLogs",
        "requestLogs",
        "system",
        "tools",
      ]}
    >
      {children}
    </ModuleI18nProvider>
  );
}
