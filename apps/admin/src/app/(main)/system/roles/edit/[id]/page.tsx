"use client";

import { PermissionGuard } from "@admin/components/layout/PermissionGuard";
import { StickyPublishBar } from "@admin/components/layout/StickyPublishBar";
import PageBreadcrumb from "@admin/components/PageBreadcrumb";
import { trpc } from "@admin/lib/trpc";
import { Permissions } from "@ecom/lib/permissions";
import { Button } from "@ecom/ui/components/button";
import { Card } from "@ecom/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@ecom/ui/components/dialog";
import { Input } from "@ecom/ui/components/input";
import { Label } from "@ecom/ui/components/label";
import { Skeleton } from "@ecom/ui/components/skeleton";
import { Textarea } from "@ecom/ui/components/textarea";
import { AlertCircle, ArrowLeft, Copy, Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { use, useEffect, useMemo, useRef, useState } from "react";
import { PermissionTree } from "../../components/PermissionTree";

interface CloneRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceId: number;
  sourceName: string;
  onSuccess: (newRoleId: number) => void;
}

function CloneRoleDialog({
  open,
  onOpenChange,
  sourceId,
  sourceName,
  onSuccess,
}: CloneRoleDialogProps) {
  const t = useTranslations("roles");
  const [cloneName, setCloneName] = useState("");
  const [cloneDisplayName, setCloneDisplayName] = useState("");

  const utils = trpc.useUtils();
  const syncPermsMutation = trpc.viewer.roles.syncPermissions.useMutation();

  const cloneMutation = trpc.viewer.roles.create.useMutation({
    onSuccess: async (newRole) => {
      const cached = utils.viewer.roles.get.getData({ id: sourceId });
      const permIds = cached?.permissions.map((p) => p.permission.id) ?? [];
      if (permIds.length > 0) {
        await syncPermsMutation.mutateAsync({ roleId: newRole.id, permissionIds: permIds });
      }
      utils.viewer.roles.list.invalidate();
      setCloneName("");
      setCloneDisplayName("");
      onSuccess(newRole.id);
    },
  });

  useEffect(() => {
    if (open && sourceName) {
      setCloneName(`${sourceName}-copy`);
      setCloneDisplayName("");
    }
  }, [open, sourceName]);

  function handleClone() {
    if (!cloneName.trim()) return;
    cloneMutation.mutate({
      name: cloneName.trim(),
      displayName: cloneDisplayName.trim() || undefined,
    });
  }

  const isPending = cloneMutation.isPending || syncPermsMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm border-border">
        <DialogHeader>
          <DialogTitle>{t("form.cloneTitle")}</DialogTitle>
          <DialogDescription className="sr-only">Clone an existing role</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 pt-1">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="clone-role-name">{t("form.cloneNameLabel")}</Label>
            <Input
              id="clone-role-name"
              value={cloneName}
              onChange={(e) => setCloneName(e.target.value)}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">{t("cloneHelperText")}</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="clone-role-display">{t("form.cloneDisplayLabel")}</Label>
            <Input
              id="clone-role-display"
              value={cloneDisplayName}
              onChange={(e) => setCloneDisplayName(e.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground">{t("cloneCopyNote")}</p>
        </div>
        {cloneMutation.error && (
          <div className="mt-2 flex items-center gap-2 rounded-md border border-destructive/30 bg-red-50 px-4 py-3 text-sm text-destructive dark:bg-red-950">
            <AlertCircle className="size-4 shrink-0" />
            {cloneMutation.error.message}
          </div>
        )}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            {t("form.cancel")}
          </Button>
          <Button type="button" onClick={handleClone} disabled={!cloneName.trim() || isPending}>
            {isPending ? t("form.creating") : t("form.clone")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function EditRolePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations("roles");
  const commonT = useTranslations("common");
  const router = useRouter();

  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDisplay, setNewRoleDisplay] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<number[]>([]);

  // Search and collapsed sections states
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const publishCardRef = useRef<HTMLDivElement>(null);

  const { data: roleDetail, isLoading: isRoleLoading } = trpc.viewer.roles.get.useQuery({ id });
  const { data: allPermissions, isLoading: isPermsLoading } =
    trpc.viewer.roles.permissions.useQuery();

  const utils = trpc.useUtils();

  const updateMutation = trpc.viewer.roles.update.useMutation();
  const syncPermsMutation = trpc.viewer.roles.syncPermissions.useMutation();

  useEffect(() => {
    if (roleDetail) {
      setNewRoleName(roleDetail.name);
      setNewRoleDisplay(roleDetail.displayName ?? "");
      setNewRoleDesc(roleDetail.description ?? "");
      setSelectedPermissionIds(roleDetail.permissions.map((p) => p.permission.id));
    }
  }, [roleDetail]);

  const dbPermissions = useMemo(() => {
    if (!allPermissions) return [];
    return Object.values(allPermissions).flat() as {
      id: number;
      name: string;
      displayName: string | null;
    }[];
  }, [allPermissions]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newRoleName.trim()) return;

    try {
      await updateMutation.mutateAsync({
        id,
        displayName: newRoleDisplay.trim() || undefined,
        description: newRoleDesc.trim() || undefined,
      });

      await syncPermsMutation.mutateAsync({
        roleId: id,
        permissionIds: selectedPermissionIds,
      });

      utils.viewer.roles.list.invalidate();
      utils.viewer.roles.get.invalidate({ id });
    } catch {}
  }

  const isPending = updateMutation.isPending || syncPermsMutation.isPending;

  return (
    <PermissionGuard permissions={[Permissions.ROLES_UPDATE]}>
      <div className="flex flex-col gap-6">
        <PageBreadcrumb className="mb-0" />

        {/* Header */}
        <div className="flex items-center justify-between gap-4 mt-1 mb-2">
          <div>
            <h1 className="text-xl font-bold">{t("editRole")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 size-4" />
            {commonT("back") ?? "Quay lại"}
          </Button>
        </div>

        {isRoleLoading ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-4 items-start">
            <div className="lg:col-span-3 flex flex-col gap-6">
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-[400px] w-full" />
            </div>
            <Skeleton className="h-44 w-full" />
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 gap-6 lg:grid-cols-4 items-start"
          >
            <StickyPublishBar
              publishCardRef={publishCardRef}
              title={newRoleDisplay || newRoleName}
              label={t("editRole")}
              isPending={isPending}
              onSave={() => {}}
              saveLabel={isPending ? t("form.saving") : t("form.save")}
            />
            {/* Left Column: Form & Permissions */}
            <div className="lg:col-span-3 flex flex-col gap-6">
              {/* Inputs Card */}
              <Card className="p-6 border-border/80">
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="role-name">{t("fields.name")}</Label>
                      <Input
                        id="role-name"
                        value={newRoleName}
                        disabled
                        className="bg-muted/40 cursor-not-allowed"
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
            <div className="flex flex-col gap-4" ref={publishCardRef}>
              <Card className="p-4 border-border/80">
                <div className="border-b border-border/60 pb-2 mb-3">
                  <h3 className="text-sm font-semibold">{commonT("publish")}</h3>
                </div>
                <div className="flex flex-col gap-2">
                  {updateMutation.error && (
                    <div className="flex items-center gap-2 rounded-md border border-destructive/20 bg-red-50 px-3 py-2 text-xs text-destructive dark:bg-red-950/45">
                      <AlertCircle className="size-4 shrink-0" />
                      <span className="truncate">{updateMutation.error.message}</span>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={isPending}
                      className="flex-1 text-xs h-9 font-semibold flex items-center justify-center gap-1.5"
                    >
                      {isPending ? (
                        <Loader2 className="mr-1.5 size-4 animate-spin" />
                      ) : (
                        <Save className="mr-1.5 size-4" />
                      )}
                      {isPending ? t("form.saving") : t("form.save")}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setCloneDialogOpen(true)}
                      disabled={isPending}
                      className="flex-1 text-xs h-9 bg-muted/70 text-foreground border border-border/80 hover:bg-muted transition-all font-semibold"
                    >
                      <Copy className="mr-1.5 size-3.5" />
                      {t("form.clone")}
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </form>
        )}

        {roleDetail && (
          <CloneRoleDialog
            open={cloneDialogOpen}
            onOpenChange={setCloneDialogOpen}
            sourceId={roleDetail.id}
            sourceName={roleDetail.name}
            onSuccess={(newId) => {
              setCloneDialogOpen(false);
              router.push(`/system/roles/edit/${newId}`);
            }}
          />
        )}
      </div>
    </PermissionGuard>
  );
}
