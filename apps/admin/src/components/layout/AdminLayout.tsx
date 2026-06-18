"use client";

import { memo, type ReactNode } from "react";
import AdminSidebar from "./AdminSidebar";
import { AdminSidebarProvider } from "./AdminSidebarContext";
import AdminToolbar from "./AdminToolbar";

interface AdminLayoutProps {
  children: ReactNode;
}

/**
 * AdminLayout — shadcn/Tailwind root layout shell.
 *
 * Replicates the Layout1 structure:
 *  ┌───────────┬──────────────────────────┐
 *  │  Sidebar  │  Toolbar (sticky)        │
 *  │  (--sidebar-width)  ├──────────────────────────┤
 *  │  sticky   │  Main Content (flex-1)   │
 *  │           │  padding: 16px           │
 *  └───────────┴──────────────────────────┘
 *
 * Wraps children with AdminSidebarProvider for sidebar state.
 */
function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <AdminSidebarProvider>
      <div id="admin-layout" className="flex w-full min-h-svh">
        <AdminSidebar />

        <main className="flex flex-1 flex-col min-w-0 relative">
          <AdminToolbar />

          <div className="flex flex-1 flex-col p-4">{children}</div>
        </main>
      </div>
    </AdminSidebarProvider>
  );
}

export default memo(AdminLayout);
