import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Người dùng hệ thống | Ecom",
  description: "Quản lý tài khoản quản trị viên, vai trò và trạng thái tài khoản",
};

export default function SystemUsersLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
