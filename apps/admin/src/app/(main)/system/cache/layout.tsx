import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Quản lý bộ nhớ đệm | Ecom",
  description: "Xóa bộ nhớ đệm để cập nhật dữ liệu và cấu hình hệ thống",
};

export default function CacheLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
