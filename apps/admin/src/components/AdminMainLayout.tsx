"use client";

import AdminLayout from "@admin/components/layout/AdminLayout";

type AdminMainLayoutProps = {
  children: React.ReactNode;
};

/**
 * AdminMainLayout — client boundary for the admin layout.
 *
 * Previously used the admin layout. Now uses the new shadcn/Tailwind AdminLayout
 * while app providers (auth, i18n, nav, snackbar) remain in AdminApp.
 */
function AdminMainLayout({ children }: AdminMainLayoutProps) {
  return <AdminLayout>{children}</AdminLayout>;
}

export default AdminMainLayout;
