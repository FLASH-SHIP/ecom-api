import AdminMainLayout from "@admin/components/AdminMainLayout";
import { auth } from "@admin/lib/auth";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Dashboard | Ecom",
};

/**
 * Server component — handles auth guard.
 * Delegates layout rendering to AdminMainLayout (client component with the admin layout).
 */
export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  // Server-side auth guard — redirect to login if no session
  if (!session?.user?.id) {
    redirect("/login");
  }

  return <AdminMainLayout>{children}</AdminMainLayout>;
}
