import { PageShell } from "@admin/components/layout/PageShell";
import { auth } from "@admin/lib/auth";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import ProfileContent from "./ProfileContent";

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * Server component — validates session + userId param before rendering.
 * Permission check (isSelf / isAdmin) is handled client-side in ProfileContent.
 * Rule: permission checks in page.tsx, never in layout.tsx.
 */
export default async function ProfilePage({ params }: Props) {
  const { id } = await params;

  // Validate param is a positive integer
  const userId = Number.parseInt(id, 10);
  if (Number.isNaN(userId) || userId <= 0) {
    notFound();
  }

  // Server-side session check — (main)/layout.tsx also guards this, but
  // explicit check here gives a cleaner 401 boundary for the profile route.
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const t = await getTranslations("users.profile");

  return (
    <PageShell title={t("tabInfo")}>
      <ProfileContent userId={userId} />
    </PageShell>
  );
}
