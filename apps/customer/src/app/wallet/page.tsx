import { redirect } from "next/navigation";

export default function WalletPageRedirect() {
  redirect("/wallet/topup");
}
