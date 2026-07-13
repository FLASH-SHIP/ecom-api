import { auth } from "@admin/lib/auth";
import { redirect } from "next/navigation";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const session = await auth();

  if (session?.user?.id) {
    redirect("/");
  }

  return <LoginForm />;
}
