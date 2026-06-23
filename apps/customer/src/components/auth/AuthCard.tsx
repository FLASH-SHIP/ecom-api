import { Button } from "@ecom/ui/components/button";
import { Card } from "@ecom/ui/components/card";
import { X } from "lucide-react";
import type React from "react";
import { AuthLanguageSelector } from "./AuthLanguageSelector";
import { AuthLogo } from "./AuthLogo";
import { AuthSocialLogins } from "./AuthSocialLogins";
import { AuthSupportInfo } from "./AuthSupportInfo";

interface AuthCardProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  showLogo?: boolean;
  showLanguageSelector?: boolean;
  showSocials?: boolean;
  showSupport?: boolean;
  icon?: React.ReactNode;
  onClose?: () => void;
}

export function AuthCard({
  children,
  title,
  description,
  showLogo = false,
  showLanguageSelector = false,
  showSocials = false,
  showSupport = true,
  icon,
  onClose,
}: AuthCardProps) {
  return (
    <Card className="w-full bg-white/75 dark:bg-slate-950/75 backdrop-blur-xl border border-white/20 dark:border-white/5 shadow-2xl rounded-3xl p-8 md:p-10 flex flex-col gap-6 md:gap-7 relative">
      {/* Header Row */}
      {(showLogo || showLanguageSelector || icon || onClose) && (
        <div className="flex items-center justify-between min-h-[40px] select-none">
          {showLogo && <AuthLogo />}
          {icon && (
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-cyan-50 dark:bg-cyan-950/20 text-cyan-500 shadow-sm">
              {icon}
            </div>
          )}
          {showLanguageSelector && <AuthLanguageSelector />}
          {onClose && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </Button>
          )}
        </div>
      )}

      {/* Title & Description if provided */}
      {(title || description) && (
        <div className="flex flex-col gap-2">
          {title && (
            <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-none">
              {title}
            </h1>
          )}
          {description && (
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 leading-relaxed">
              {description}
            </p>
          )}
        </div>
      )}

      {/* Main Form/Content */}
      <div className="flex flex-col gap-4">{children}</div>

      {/* Social Logins */}
      {showSocials && <AuthSocialLogins />}

      {/* Support Info Footer */}
      {showSupport && <AuthSupportInfo />}
    </Card>
  );
}
