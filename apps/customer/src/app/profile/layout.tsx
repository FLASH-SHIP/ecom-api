"use client";

import { trpc } from "@customer/lib/trpc";
import { translate } from "@ecom/i18n";
import { useI18n } from "@ecom/shared/@i18n";
import { Breadcrumb } from "@ecom/ui/components/breadcrumb";
import { cn } from "@ecom/ui/lib/utils";
import { Lock, User } from "lucide-react";
import NextLink from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type { ReactNode } from "react";

export default function ProfileLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { status } = useSession();
  const { languageId: currentLocale } = useI18n();

  const { data: profile, isLoading: isLoadingProfile } = trpc.customer.auth.me.useQuery(undefined, {
    enabled: status === "authenticated",
  });

  const isLoading = status === "loading" || isLoadingProfile;

  if (isLoading) {
    return <ProfileLoading locale={currentLocale ?? ""} />;
  }

  if (status === "unauthenticated" || !profile) {
    return <ProfileNotLoggedIn locale={currentLocale ?? ""} />;
  }

  const isProfileActive = pathname === "/profile/info";
  const isPasswordActive = pathname === "/profile/change-password";

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Page Header */}
      <div>
        <Breadcrumb
          items={[
            {
              label: currentLocale === "vi" ? "Bảng điều khiển" : "Dashboard",
              href: "/dashboard",
            },
            {
              label: translate("customerProfile.title", currentLocale),
            },
          ]}
          className="w-fit rounded-sm border border-border px-2 py-0.5 mb-3 text-xs"
        />
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {translate("customerProfile.title", currentLocale)}
        </h1>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden w-full">
        <div className="flex flex-col md:flex-row md:h-[650px] items-stretch">
          {/* Left side navigation menu */}
          <aside className="w-full md:w-[240px] shrink-0 p-4 border-b md:border-b-0 md:border-r border-border flex flex-col gap-1 bg-muted/5">
            <button
              type="button"
              onClick={() => router.push("/profile/info")}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-left transition-colors cursor-pointer w-full",
                isProfileActive
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <User className="h-4 w-4 shrink-0" />
              {translate("customerProfile.profileTab", currentLocale)}
            </button>
            <button
              type="button"
              onClick={() => router.push("/profile/change-password")}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-left transition-colors cursor-pointer w-full",
                isPasswordActive
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Lock className="h-4 w-4 shrink-0" />
              {translate("customerProfile.passwordTab", currentLocale)}
            </button>
          </aside>

          {/* Right side form content */}
          <div className="flex-1 overflow-y-auto min-w-0 thin-scrollbar">
            <div className="p-6 md:p-8">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileLoading({ locale }: { locale: string }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <p className="text-center text-sm text-muted-foreground">
        {translate("customerProfile.loading", locale)}
      </p>
    </div>
  );
}

function ProfileNotLoggedIn({ locale }: { locale: string }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 text-center">
      <h1 className="text-2xl font-bold">{translate("customerProfile.notLoggedIn", locale)}</h1>
      <NextLink href="/auth/login" className="mt-4 inline-block text-primary hover:underline">
        {translate("customerProfile.loginButton", locale)}
      </NextLink>
    </div>
  );
}
