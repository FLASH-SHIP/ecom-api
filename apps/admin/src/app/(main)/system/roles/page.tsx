"use client";

import { ConfirmDialog } from "@admin/components/ui/ConfirmDialog";
import { useConfirm } from "@admin/components/ui/useConfirm";
import { trpc } from "@admin/lib/trpc";
import { Badge } from "@ecom/ui/components/badge";
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
import { cn } from "@ecom/ui/lib/utils";
import { AlertCircle, Copy, Plus, Shield, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: roles + permissions editor with clone dialog — inherently complex
export default function SystemRolesPage() {
  const t = useTranslations("roles");
  const { askConfirm, dialogProps: confirmDialogProps } = useConfirm();

  const [showCreate, setShowCreate] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDisplay, setNewRoleDisplay] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);

  // Clone dialog state
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const [cloneSourceId, setCloneSourceId] = useState<string | null>(null);
  const [cloneName, setCloneName] = useState("");
  const [cloneDisplayName, setCloneDisplayName] = useState("");

  const { data: roles, isLoading } = trpc.viewer.roles.list.useQuery();
  const { data: roleDetail } = trpc.viewer.roles.get.useQuery(
    // biome-ignore lint/style/noNonNullAssertion: tRPC enabled-guard — query disabled when selectedRoleId is null
    { id: selectedRoleId! },
    { enabled: !!selectedRoleId },
  );
  const { data: allPermissions } = trpc.viewer.roles.permissions.useQuery();

  const utils = trpc.useUtils();

  const createMutation = trpc.viewer.roles.create.useMutation({
    onSuccess: () => {
      utils.viewer.roles.list.invalidate();
      setShowCreate(false);
      setNewRoleName("");
      setNewRoleDisplay("");
      setNewRoleDesc("");
    },
  });

  const deleteMutation = trpc.viewer.roles.remove.useMutation({
    onSuccess: () => {
      utils.viewer.roles.list.invalidate();
      if (selectedRoleId) setSelectedRoleId(null);
    },
  });

  const syncPermsMutation = trpc.viewer.roles.syncPermissions.useMutation({
    onSuccess: () => {
      utils.viewer.roles.get.invalidate();
      utils.viewer.roles.list.invalidate();
    },
  });

  // Clone: create new role then copy permissions from the source role's detail
  const cloneMutation = trpc.viewer.roles.create.useMutation({
    onSuccess: async (newRole) => {
      if (cloneSourceId) {
        // selectedRoleId may be the source — use roleDetail if available,
        // otherwise fetch explicitly via the get query cache
        const cached = utils.viewer.roles.get.getData({ id: cloneSourceId });
        const permIds = (cached ?? roleDetail)?.permissions.map((p) => p.permission.id) ?? [];
        if (permIds.length > 0) {
          await syncPermsMutation.mutateAsync({ roleId: newRole.id, permissionIds: permIds });
        }
      }
      utils.viewer.roles.list.invalidate();
      setCloneDialogOpen(false);
      setCloneName("");
      setCloneDisplayName("");
      setCloneSourceId(null);
    },
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newRoleName.trim()) return;
    createMutation.mutate({
      name: newRoleName.trim(),
      displayName: newRoleDisplay.trim() || undefined,
      description: newRoleDesc.trim() || undefined,
    });
  }

  function handleCloneOpen(roleId: string, roleName: string) {
    setCloneSourceId(roleId);
    setCloneName(`${roleName}-copy`);
    setCloneDisplayName("");
    setCloneDialogOpen(true);
    // Prefetch permissions for this role so they're available when clone succeeds
    utils.viewer.roles.get.prefetch({ id: roleId });
  }

  function handleClone() {
    if (!cloneName.trim()) return;
    cloneMutation.mutate({
      name: cloneName.trim(),
      displayName: cloneDisplayName.trim() || undefined,
    });
  }

  function togglePermission(permId: string) {
    if (!roleDetail || !selectedRoleId) return;
    const currentIds = roleDetail.permissions.map((p) => p.permission.id);
    const newIds = currentIds.includes(permId)
      ? currentIds.filter((id) => id !== permId)
      : [...currentIds, permId];
    syncPermsMutation.mutate({ roleId: selectedRoleId, permissionIds: newIds });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button
          variant={showCreate ? "outline" : "default"}
          onClick={() => setShowCreate(!showCreate)}
        >
          {showCreate ? <X className="mr-2 size-4" /> : <Plus className="mr-2 size-4" />}
          {showCreate ? t("form.cancel") : t("newRole")}
        </Button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <Card className="p-6">
          <p className="mb-4 font-semibold">{t("newRole")}</p>
          <form onSubmit={handleCreate}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="role-name">{t("form.nameLabel")}</Label>
                <Input
                  id="role-name"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="role-display">{t("form.displayNameLabel")}</Label>
                <Input
                  id="role-display"
                  value={newRoleDisplay}
                  onChange={(e) => setNewRoleDisplay(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="role-desc">{t("form.descriptionLabel")}</Label>
                <Input
                  id="role-desc"
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                />
              </div>
            </div>
            {createMutation.error && (
              <div className="mt-3 flex items-center gap-2 rounded-md border border-destructive/30 bg-red-50 px-4 py-3 text-sm text-destructive dark:bg-red-950">
                <AlertCircle className="size-4 shrink-0" />
                {createMutation.error.message}
              </div>
            )}
            <Button
              type="submit"
              size="sm"
              disabled={createMutation.isPending || !newRoleName.trim()}
              className="mt-4"
            >
              {createMutation.isPending ? t("form.creating") : t("form.create")}
            </Button>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Roles List */}
        <Card className="self-start overflow-hidden">
          <div className="border-b border-border px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("roleList", { count: String(roles?.length ?? 0) })}
            </p>
          </div>
          {isLoading ? (
            <div className="flex flex-col gap-2 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: skeleton loading array — items have no stable IDs
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : !roles?.length ? (
            <div className="flex flex-col items-center gap-2 py-8">
              <Shield size={48} className="text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">{t("noRolesTitle")}</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {roles.map((role) => (
                <div key={role.id} className="flex items-center">
                  <button
                    type="button"
                    className={cn(
                      "flex flex-1 flex-col px-4 py-3 text-left transition-colors hover:bg-muted/50",
                      selectedRoleId === role.id && "bg-primary/5 border-l-2 border-primary",
                    )}
                    onClick={() => setSelectedRoleId(role.id)}
                  >
                    <span className="flex items-center gap-1.5 text-sm font-medium">
                      {role.displayName ?? role.name}
                      {role.name === "admin" && (
                        <Badge variant="outline" className="ml-1 text-[10px]">
                          system
                        </Badge>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {t("permCount", {
                        permissions: String(role._count.permissions),
                        users: String(role._count.users),
                      })}
                    </span>
                  </button>
                  <div className="flex items-center gap-0.5 pr-2">
                    <button
                      type="button"
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
                      aria-label={t("cloneLabel", { name: role.name })}
                      title={t("cloneRole")}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCloneOpen(role.id, role.name);
                      }}
                    >
                      <Copy size={14} />
                    </button>
                    {role.name !== "admin" && (
                      <button
                        type="button"
                        className="rounded-md p-1.5 text-destructive hover:bg-destructive/10"
                        aria-label={t("deleteLabel", { name: role.name })}
                        title={t("deleteRole")}
                        onClick={(e) => {
                          e.stopPropagation();
                          askConfirm({
                            message: t("deleteConfirm", { name: role.name }),
                            onConfirm: () => deleteMutation.mutate({ id: role.id }),
                          });
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Permission Editor */}
        <div className="lg:col-span-2">
          {selectedRoleId && roleDetail ? (
            <Card className="overflow-hidden">
              <div className="border-b border-border px-6 py-4">
                <p className="text-sm font-semibold">
                  {t("permissionsFor", { name: roleDetail.displayName ?? roleDetail.name })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {roleDetail.description ?? t("togglePermissions")}
                </p>
              </div>
              <div className="flex flex-col gap-6 p-6">
                {allPermissions &&
                  Object.entries(allPermissions).map(([group, perms]) => (
                    <div key={group}>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {group}
                      </p>
                      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                        {(perms as { id: string; name: string; displayName: string | null }[]).map(
                          (perm) => {
                            const isChecked = roleDetail.permissions.some(
                              (p) => p.permission.id === perm.id,
                            );
                            return (
                              <label
                                key={perm.id}
                                className={cn(
                                  "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 transition-colors hover:border-primary/50",
                                  isChecked ? "border-primary bg-primary/5" : "border-border",
                                )}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => togglePermission(perm.id)}
                                  disabled={syncPermsMutation.isPending}
                                  className="size-4 rounded border-border text-primary"
                                />
                                <span className="text-xs">{perm.displayName ?? perm.name}</span>
                              </label>
                            );
                          },
                        )}
                      </div>
                    </div>
                  ))}
                {allPermissions && Object.keys(allPermissions).length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    {t("noPermissions")}
                  </p>
                )}
              </div>
            </Card>
          ) : (
            <Card className="border-dashed p-8 text-center">
              <Shield size={48} className="mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">{t("selectRoleHint")}</p>
            </Card>
          )}
        </div>
      </div>

      {/* Clone Role Dialog */}
      <Dialog open={cloneDialogOpen} onOpenChange={setCloneDialogOpen}>
        <DialogContent className="sm:max-w-sm">
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
            <Button variant="outline" onClick={() => setCloneDialogOpen(false)}>
              {t("form.cancel")}
            </Button>
            <Button onClick={handleClone} disabled={!cloneName.trim() || cloneMutation.isPending}>
              {cloneMutation.isPending ? t("form.creating") : t("form.clone")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog {...confirmDialogProps} />
    </div>
  );
}
