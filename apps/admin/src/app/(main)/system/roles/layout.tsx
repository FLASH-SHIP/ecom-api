import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Vai trò & Quyền hạn | Ecom",
  description: "Quản lý vai trò và phân quyền truy cập hệ thống",
};

export default function SystemRolesLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
