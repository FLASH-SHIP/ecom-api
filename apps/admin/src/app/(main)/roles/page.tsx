import { redirect } from "next/navigation";

/**
 * Redirect /roles → /system/roles
 * Route moved to /system section to consolidate admin management.
 */
export default function RolesRedirectPage() {
  redirect("/system/roles");
}
