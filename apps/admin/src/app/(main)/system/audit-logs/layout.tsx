import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Nhật ký hoạt động | Ecom",
  description: "Theo dõi toàn bộ hoạt động của quản trị viên: tạo, cập nhật, xóa dữ liệu",
};

export default function AuditLogsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
