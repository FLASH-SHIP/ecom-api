"use client";

import PageBreadcrumb from "@admin/components/PageBreadcrumb";
import { trpc } from "@admin/lib/trpc";
import { Button } from "@ecom/ui/components/button";
import { Card, CardContent } from "@ecom/ui/components/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@ecom/ui/components/tabs";
import { ArrowLeft, Image, Loader2, Lock, Settings, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { AvatarTab } from "./tabs/AvatarTab";
import { ChangePasswordTab } from "./tabs/ChangePasswordTab";
import { PreferencesTab } from "./tabs/PreferencesTab";
import { ProfileInfoTab } from "./tabs/ProfileInfoTab";

type TabId = "info" | "avatar" | "password" | "preferences";

interface TabDef {
  id: TabId;
  labelKey: string;
  icon: React.ElementType;
}

const TAB_DEFS: TabDef[] = [
  { id: "info", labelKey: "tabInfo", icon: User },
  { id: "avatar", labelKey: "tabAvatar", icon: Image },
  { id: "password", labelKey: "tabPassword", icon: Lock },
  { id: "preferences", labelKey: "tabPreferences", icon: Settings },
];

const HASH_MAP: Record<string, TabId> = {
  "#avatar": "avatar",
  "#change-password": "password",
  "#preferences": "preferences",
};

function getTabFromHash(): TabId {
  if (typeof window === "undefined") return "info";
  return HASH_MAP[window.location.hash] ?? "info";
}

interface ProfileContentProps {
  userId: number;
}

export default function ProfileContent({ userId }: ProfileContentProps) {
  const t = useTranslations("users.profile");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>(getTabFromHash);

  // Logged-in user — for permission checks, and as targetUser when isSelf
  const { data: me, isLoading: meLoading } = trpc.viewer.auth.me.useQuery(undefined, {
    staleTime: 30_000,
  });

  // isSelf is known once `me` loads — determine before firing second query
  const isSelf = me?.id === userId;
  const isAdmin = me?.permissions.includes("users.update") ?? false;

  // Target user profile data — skipped when viewing own profile (use `me` instead)
  const { data: otherUser, isLoading: otherLoading } = trpc.viewer.auth.getUserProfile.useQuery(
    { userId },
    {
      staleTime: 30_000,
      // Only fetch when admin views a different user — avoids duplicate request for self
      enabled: !isSelf && !!me,
    },
  );

  // When isSelf, `me` already has the same shape as getUserProfile — no extra fetch needed
  const targetUser = isSelf ? me : otherUser;
  const targetLoading = isSelf ? meLoading : otherLoading;

  // Sync hash with active tab
  useEffect(() => {
    const hashToTab = () => setActiveTab(getTabFromHash());
    window.addEventListener("hashchange", hashToTab);
    return () => window.removeEventListener("hashchange", hashToTab);
  }, []);

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab as TabId);
    const reverseHash: Record<TabId, string> = {
      info: "",
      avatar: "#avatar",
      password: "#change-password",
      preferences: "#preferences",
    };
    const hash = reverseHash[newTab as TabId];
    window.history.replaceState(null, "", hash || window.location.pathname);
  };

  if (meLoading || targetLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!me || !targetUser) return null;

  // Only self or admin can view this page
  if (!isSelf && !isAdmin) {
    return (
      <div className="py-8 text-center">
        <p className="text-destructive">{t("accessDenied")}</p>
      </div>
    );
  }

  const displayName = targetUser.name ?? "User";
  const userInitials = displayName.charAt(0).toUpperCase();

  return (
    <div className="flex flex-col gap-4">
      {/* Page Breadcrumbs */}
      <PageBreadcrumb className="mb-1" />

      {/* Fuse React Style Premium Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-1 mb-6">
        <div className="flex items-center gap-4">
          {targetUser.avatarUrl ? (
            // biome-ignore lint/performance/noImgElement: avatar image loaded dynamically from storage
            <img
              src={targetUser.avatarUrl}
              alt={displayName}
              className="size-16 rounded-full border border-border object-cover shadow-sm bg-muted"
            />
          ) : (
            <div className="flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground text-2xl font-bold border border-border shadow-sm">
              {userInitials || <User size={28} />}
            </div>
          )}
          <div className="flex flex-col">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
              {displayName}
            </h1>
            <p className="text-sm text-muted-foreground">
              {targetUser.email} {targetUser.username ? `(@${targetUser.username})` : ""}
            </p>
          </div>
        </div>

        <div>
          <Button variant="outline" size="sm" onClick={() => router.push("/system/users")}>
            <ArrowLeft className="mr-2 size-4" />
            {tCommon("back") ?? "Quay lại"}
          </Button>
        </div>
      </div>

      {/* Main Tabs Container (Unified Box) */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <Card className="rounded-lg border border-border bg-card overflow-hidden">
          {/* Top Tabs Bar Area */}
          <div className="px-6 pt-6 pb-2 flex items-center">
            <TabsList className="inline-flex h-10 items-center justify-start rounded-lg bg-muted p-1 border border-border">
              {TAB_DEFS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="flex items-center gap-1.5 rounded-md px-4 py-1.5 text-xs md:text-sm font-medium text-muted-foreground transition-all hover:bg-background/50 hover:text-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                  >
                    <Icon size={16} className="shrink-0" />
                    <span>{t(tab.labelKey)}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          {/* Form Content Area */}
          <CardContent className="px-6 pb-6 pt-6">
            <TabsContent value="info" className="mt-0 outline-none">
              <ProfileInfoTab userId={userId} targetUser={targetUser} />
            </TabsContent>
            <TabsContent value="avatar" className="mt-0 outline-none">
              <AvatarTab userId={userId} targetUser={targetUser} />
            </TabsContent>
            <TabsContent value="password" className="mt-0 outline-none">
              <ChangePasswordTab userId={userId} isSelf={isSelf} isAdmin={isAdmin} />
            </TabsContent>
            <TabsContent value="preferences" className="mt-0 outline-none">
              <PreferencesTab userId={userId} isSelf={isSelf} isAdmin={isAdmin} />
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}
