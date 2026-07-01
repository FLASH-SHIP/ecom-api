import OAuthGoogle from "@customer/components/auth/OAuthGoogle";
import { Button } from "@ecom/ui/components/button";
import { AppleIcon } from "@ecom/ui/components/icons";

export function AuthSocialLogins() {
  return (
    <div className="flex flex-col gap-4">
      {/* Or continue with divider */}
      <div className="flex items-center gap-3 select-none">
        <div className="flex-1 h-[1px] bg-border" />
        <span className="text-xs font-semibold text-muted-foreground">hoặc tiếp tục với</span>
        <div className="flex-1 h-[1px] bg-border" />
      </div>

      {/* Grid of buttons */}
      <div className="grid grid-cols-2 gap-3">
        <OAuthGoogle />
        <Button
          type="button"
          variant="outline"
          className="flex items-center justify-center h-10 rounded-xl bg-background/50 hover:bg-muted text-xs font-bold text-foreground transition-all border-border"
        >
          <AppleIcon /> Apple
        </Button>
      </div>
    </div>
  );
}
