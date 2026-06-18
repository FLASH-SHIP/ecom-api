import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Nhật ký truy vấn | Ecom",
  description: "Theo dõi và phân tích các HTTP request đến hệ thống",
};

export default function RequestLogsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
