"use client";

import { Button } from "@ecom/ui/components/button";
import { GoogleIcon } from "@ecom/ui/components/icon-component/GoogleIcon";
import { signIn } from "next-auth/react";

export default function OAuthGoogle() {
  const handleGoogleLogin = async () => {
    await signIn("google", { callbackUrl: "/dashboard" });
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleGoogleLogin}
      className="flex items-center justify-center h-10 rounded-xl bg-background/50 hover:bg-muted text-xs font-bold text-foreground transition-all border-border"
    >
      <GoogleIcon /> Google
    </Button>
  );
}
