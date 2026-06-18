import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Thành viên",
    template: "%s | Ecom",
  },
  description: "Quản lý tài khoản thành viên Ecom của bạn.",
  robots: { index: false }, // Member pages should not be indexed
};

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
