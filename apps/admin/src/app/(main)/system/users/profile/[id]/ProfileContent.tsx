"use client";

import { trpc } from "@admin/lib/trpc";
import { Card, CardContent } from "@ecom/ui/components/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@ecom/ui/components/tabs";
import { Image, Loader2, Lock, Settings, User } from "lucide-react";
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

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange}>
      {/* Tab navigation */}
      <Card className="mb-6">
        <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent p-0">
          {TAB_DEFS.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="gap-1.5 rounded-none border-b-2 border-transparent px-4 py-3 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                <Icon size={16} />
                {t(tab.labelKey)}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Card>

      {/* Tab content — targetUser is the profile being viewed/edited */}
      <Card>
        <CardContent className="p-6">
          <TabsContent value="info" className="mt-0">
            <ProfileInfoTab userId={userId} targetUser={targetUser} />
          </TabsContent>
          <TabsContent value="avatar" className="mt-0">
            <AvatarTab userId={userId} targetUser={targetUser} />
          </TabsContent>
          <TabsContent value="password" className="mt-0">
            <ChangePasswordTab userId={userId} isSelf={isSelf} isAdmin={isAdmin} />
          </TabsContent>
          <TabsContent value="preferences" className="mt-0">
            <PreferencesTab userId={userId} isSelf={isSelf} isAdmin={isAdmin} />
          </TabsContent>
        </CardContent>
      </Card>
    </Tabs>
  );
}
