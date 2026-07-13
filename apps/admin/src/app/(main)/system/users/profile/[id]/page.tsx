import { PageShell } from "@admin/components/layout/PageShell";
import { auth } from "@admin/lib/auth";
import { notFound, redirect } from "next/navigation";
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

  if (!id) {
    notFound();
  }
  const userId = id;

  // Server-side session check — (main)/layout.tsx also guards this, but
  // explicit check here gives a cleaner 401 boundary for the profile route.
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <PageShell>
      <ProfileContent userId={userId} />
    </PageShell>
  );
}
