import { redirect } from "next/navigation";

export default function DeveloperPageRedirect() {
  redirect("/developer/api-keys");
}
