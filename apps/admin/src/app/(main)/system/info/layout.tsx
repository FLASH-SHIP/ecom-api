import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Thông tin hệ thống | Ecom",
  description: "Tất cả thông tin về cấu hình và trạng thái hệ thống hiện tại",
};

export default function SystemInfoLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
