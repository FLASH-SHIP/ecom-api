import OAuthFacebook from "@customer/components/auth/OAuthFacebook";
import OAuthGoogle from "@customer/components/auth/OAuthGoogle";

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
        <OAuthFacebook />
      </div>
    </div>
  );
}
