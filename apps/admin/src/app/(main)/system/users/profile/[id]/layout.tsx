import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Thông tin cá nhân | Ecom",
  description: "Quản lý thông tin cá nhân, ảnh đại diện, mật khẩu và tùy chọn giao diện",
};

export default function ProfileLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
