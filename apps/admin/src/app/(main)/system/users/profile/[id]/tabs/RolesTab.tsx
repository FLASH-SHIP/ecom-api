"use client";

import { trpc } from "@admin/lib/trpc";
import { Button } from "@ecom/ui/components/button";
import { Checkbox } from "@ecom/ui/components/checkbox";
import { Input } from "@ecom/ui/components/input";
import { AlertCircle, CheckCircle2, ExternalLink, Loader2, Save, Search, X } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

interface RolesTabProps {
  userId: string;
}

export function RolesTab({ userId }: RolesTabProps) {
  const t = useTranslations("users.profile");
  const tc = useTranslations("users");
  const tr = useTranslations("roles");
  const utils = trpc.useUtils();

  // Queries
  const { data: me } = trpc.viewer.auth.me.useQuery(undefined, {
    staleTime: 30_000,
  });

  const { data: userProfile, isLoading: userLoading } = trpc.viewer.auth.getUserProfile.useQuery(
    { userId },
    { staleTime: 30_000 },
  );

  const { data: roles, isLoading: rolesLoading } = trpc.viewer.roles.list.useQuery(undefined, {
    staleTime: 300_000,
  });

  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const canEditRoles = me?.permissions.includes("roles.update") ?? false;

  const filteredRoles = useMemo(() => {
    if (!roles) return [];
    const q = searchQuery.toLowerCase().trim();
    if (!q) return roles;
    return roles.filter((role) => {
      const name = role.name?.toLowerCase() ?? "";
      const displayName = role.displayName?.toLowerCase() ?? "";
      return name.includes(q) || displayName.includes(q);
    });
  }, [roles, searchQuery]);

  // Sync state when data loads or refetches
  useEffect(() => {
    if (userProfile?.roles) {
      setSelectedRoleIds(userProfile.roles.map((r) => r.id));
    }
  }, [userProfile?.roles]);

  // Auto-hide success alert
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const syncRolesMut = trpc.viewer.users.syncRoles.useMutation({
    onSuccess: () => {
      setSuccess(true);
      setError(null);
      void utils.viewer.auth.getUserProfile.invalidate({ userId });
      void utils.viewer.users.list.invalidate();
    },
    onError: (err) => {
      setError(err.message);
      setSuccess(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    syncRolesMut.mutate({
      userId,
      roleIds: selectedRoleIds,
    });
  };

  const handleToggleRole = (roleId: number, checked: boolean) => {
    if (checked) {
      setSelectedRoleIds((prev) => [...prev, roleId]);
    } else {
      setSelectedRoleIds((prev) => prev.filter((id) => id !== roleId));
    }
  };

  if (userLoading || rolesLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isPending = syncRolesMut.isPending;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {error && (
        <div className="flex items-center justify-between rounded-md border border-destructive/30 bg-red-50 px-4 py-3 text-sm text-destructive dark:bg-red-950">
          <span className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            {error}
          </span>
          <button type="button" onClick={() => setError(null)}>
            <X className="size-4" />
          </button>
        </div>
      )}
      {success && (
        <div className="flex items-center justify-between rounded-md border border-emerald-500/30 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0" />
            {tc("rolesUpdated") || "Roles updated successfully!"}
          </span>
          <button type="button" onClick={() => setSuccess(false)}>
            <X className="size-4" />
          </button>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 border-border">
        <div>
          <h3 className="text-lg font-medium text-foreground">{t("tabRoles")}</h3>
          <p className="text-sm text-muted-foreground mt-1">{t("rolesDescription")}</p>
        </div>
        {roles && roles.length > 5 && (
          <div className="relative w-full md:max-w-xs shrink-0">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder={tc("searchRoles") || "Tìm kiếm vai trò..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-card focus:bg-background h-9 text-sm"
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredRoles.map((role) => {
          const isChecked = selectedRoleIds.includes(role.id);
          const isSuperAdminRole = role.name === "admin";

          return (
            <label
              key={role.id}
              htmlFor={`role-${role.id}`}
              className={`flex items-start justify-between space-x-3 rounded-lg border border-border p-4 bg-card transition-all hover:bg-accent/40 hover:shadow-sm cursor-pointer select-none ${
                isChecked ? "border-primary/40 ring-1 ring-primary/40 bg-primary/5" : ""
              }`}
            >
              <div className="flex items-start space-x-3">
                <Checkbox
                  id={`role-${role.id}`}
                  checked={isChecked}
                  onCheckedChange={(checked) => handleToggleRole(role.id, !!checked)}
                  disabled={isPending}
                  className="mt-0.5"
                />
                <div className="grid gap-1.5 leading-none">
                  <span className="text-sm font-medium leading-none text-foreground">
                    {role.displayName ?? role.name}
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border">
                      {role._count?.permissions ?? 0} {tr("permissions").toLowerCase()}
                    </span>
                    {isSuperAdminRole && (
                      <span className="text-[10px] bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 font-semibold px-2 py-0.5 rounded">
                        Super Admin
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {canEditRoles && (
                <Link
                  href={`/system/roles/edit/${role.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs text-primary hover:underline flex items-center gap-0.5 self-center shrink-0"
                >
                  {tc("actions.edit") || "Sửa"}
                  <ExternalLink className="size-3" />
                </Link>
              )}
            </label>
          );
        })}

        {filteredRoles.length === 0 && (
          <div className="col-span-full py-8 text-center text-muted-foreground">{tc("noRole")}</div>
        )}
      </div>

      <div className="mt-6 flex justify-end">
        <Button type="submit" disabled={isPending} id="roles-save-btn">
          {isPending ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Save className="mr-2 size-4" />
          )}
          {tc("saveRoles") || "Save Roles"}
        </Button>
      </div>
    </form>
  );
}
