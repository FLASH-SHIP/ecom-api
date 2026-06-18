import { redirect } from "next/navigation";

/**
 * Redirect /users → /system/users
 * Route moved to /system section to consolidate admin management.
 */
export default function UsersRedirectPage() {
  redirect("/system/users");
}
