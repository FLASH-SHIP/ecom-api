"use client";

import PageBreadcrumb from "@admin/components/PageBreadcrumb";
import { trpc } from "@admin/lib/trpc";
import { Button } from "@ecom/ui/components/button";
import { Card } from "@ecom/ui/components/card";
import { Input } from "@ecom/ui/components/input";
import { Label } from "@ecom/ui/components/label";
import { Textarea } from "@ecom/ui/components/textarea";
import { AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { PermissionTree } from "../components/PermissionTree";

export default function CreateRolePage() {
  const t = useTranslations("roles");
  const commonT = useTranslations("common");
  const router = useRouter();

  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDisplay, setNewRoleDisplay] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>([]);

  const [redirectAfterSave, setRedirectAfterSave] = useState(true); // true = list, false = edit

  const { data: allPermissions, isLoading: isPermsLoading } =
    trpc.viewer.roles.permissions.useQuery();

  const utils = trpc.useUtils();

  const createMutation = trpc.viewer.roles.create.useMutation();
  const syncPermsMutation = trpc.viewer.roles.syncPermissions.useMutation();

  const dbPermissions = useMemo(() => {
    if (!allPermissions) return [];
    return Object.values(allPermissions).flat() as {
      id: string;
      name: string;
      displayName: string | null;
    }[];
  }, [allPermissions]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newRoleName.trim()) return;

    try {
      const newRole = await createMutation.mutateAsync({
        name: newRoleName.trim(),
        displayName: newRoleDisplay.trim() || undefined,
        description: newRoleDesc.trim() || undefined,
      });

      if (selectedPermissionIds.length > 0) {
        await syncPermsMutation.mutateAsync({
          roleId: newRole.id,
          permissionIds: selectedPermissionIds,
        });
      }

      utils.viewer.roles.list.invalidate();

      if (redirectAfterSave) {
        router.push("/system/roles");
      } else {
        router.push(`/system/roles/edit/${newRole.id}`);
      }
    } catch {}
  }

  const isPending = createMutation.isPending || syncPermsMutation.isPending;

  return (
    <div className="flex flex-col gap-6">
      <PageBreadcrumb className="mb-0" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{t("newRole")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-4 items-start">
        {/* Left Column: Form & Permissions */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          {/* Inputs Card */}
          <Card className="p-6 border-border/80">
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="role-name">
                    {t("fields.name")} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="role-name"
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    required
                    placeholder={t("form.nameLabel")}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="role-display">{t("fields.displayName")}</Label>
                  <Input
                    id="role-display"
                    value={newRoleDisplay}
                    onChange={(e) => setNewRoleDisplay(e.target.value)}
                    placeholder={t("form.displayNameLabel")}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="role-desc">{t("fields.description")}</Label>
                <Textarea
                  id="role-desc"
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  placeholder={t("form.descriptionLabel")}
                  rows={3}
                />
              </div>
            </div>
          </Card>

          {/* Permissions Accordion Card */}
          <PermissionTree
            dbPermissions={dbPermissions}
            selectedPermissionIds={selectedPermissionIds}
            onChange={setSelectedPermissionIds}
            isPending={isPending}
            isLoading={isPermsLoading}
          />
        </div>

        {/* Right Column: Publish Sidebar */}
        <div className="flex flex-col gap-4">
          <Card className="p-4 border-border/80">
            <div className="border-b border-border/60 pb-2 mb-3">
              <h3 className="text-sm font-semibold">{commonT("publish")}</h3>
            </div>
            <div className="flex flex-col gap-2">
              {createMutation.error && (
                <div className="flex items-center gap-2 rounded-md border border-destructive/20 bg-red-50 px-3 py-2 text-xs text-destructive dark:bg-red-950/40">
                  <AlertCircle className="size-4 shrink-0" />
                  <span className="truncate">{createMutation.error.message}</span>
                </div>
              )}
              <Button
                type="submit"
                onClick={() => setRedirectAfterSave(false)}
                disabled={isPending || !newRoleName.trim()}
                className="w-full text-xs h-9 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all font-semibold"
              >
                {isPending && !redirectAfterSave ? t("form.saving") : t("form.saveAndEdit")}
              </Button>
              <Button
                type="submit"
                onClick={() => setRedirectAfterSave(true)}
                disabled={isPending || !newRoleName.trim()}
                className="w-full text-xs h-9 font-semibold"
              >
                {isPending && redirectAfterSave ? t("form.saving") : t("form.save")}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full text-xs h-9"
                onClick={() => router.push("/system/roles")}
                disabled={isPending}
              >
                {t("form.cancel")}
              </Button>
            </div>
          </Card>
        </div>
      </form>
    </div>
  );
}
