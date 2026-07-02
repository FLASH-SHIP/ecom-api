"use client";

import { Button } from "@ecom/ui/components/button";
import { FacebookIcon } from "@ecom/ui/components/icon-component/FacebookIcon";
import { signIn } from "next-auth/react";

export default function OAuthFacebook() {
  const handleFacebookLogin = async () => {
    await signIn("facebook", { callbackUrl: "/dashboard" });
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleFacebookLogin}
      className="flex items-center justify-center h-10 rounded-xl bg-background/50 hover:bg-muted text-xs font-bold text-foreground transition-all border-border"
    >
      <FacebookIcon /> Facebook
    </Button>
  );
}
