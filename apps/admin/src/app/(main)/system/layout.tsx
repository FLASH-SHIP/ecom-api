import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Quản trị hệ thống | Ecom",
  description: "Quản lý người dùng, vai trò, phân quyền và theo dõi hoạt động hệ thống",
};

export default function SystemLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
