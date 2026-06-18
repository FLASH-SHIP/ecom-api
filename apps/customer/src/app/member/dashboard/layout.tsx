import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Trang tổng quan tài khoản thành viên Ecom của bạn.",
  robots: { index: false },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
