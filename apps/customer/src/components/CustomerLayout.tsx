"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { CustomerDashboardLayout } from "./CustomerDashboardLayout";

interface CustomerLayoutProps {
  children: ReactNode;
}

export function CustomerLayout({ children }: CustomerLayoutProps) {
  const pathname = usePathname();
  const isAuthPage = pathname?.includes("/auth/");

  if (isAuthPage) {
    return <main className="flex-1 flex flex-col">{children}</main>;
  }

  return <CustomerDashboardLayout>{children}</CustomerDashboardLayout>;
}
