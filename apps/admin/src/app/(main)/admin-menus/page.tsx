"use client";

import { PermissionGuard } from "@admin/components/layout/PermissionGuard";
import { ConfirmDialog } from "@admin/components/ui/ConfirmDialog";
import { useConfirm } from "@admin/components/ui/useConfirm";
import { trpc } from "@admin/lib/trpc";
import { Permissions } from "@ecom/lib/permissions";
import { Button } from "@ecom/ui/components/button";
import { Card } from "@ecom/ui/components/card";
import { Input } from "@ecom/ui/components/input";
import { Label } from "@ecom/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ecom/ui/components/select";
import { Separator } from "@ecom/ui/components/separator";
import { cn } from "@ecom/ui/lib/utils";
import { Menu, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: tree-based admin menu UI inherently requires many conditionals
export default function AdminMenusPage() {
  const t = useTranslations("adminMenus");
  const tCommon = useTranslations("common");
  const { askConfirm, dialogProps: confirmDialogProps } = useConfirm();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const [newKey, setNewKey] = useState("");
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("");
  const [newRoute, setNewRoute] = useState("");
  const [newParentId, setNewParentId] = useState<string>("");

  const { data: items, isLoading } = trpc.viewer.adminMenus.list.useQuery();
  const { data: selectedItem } = trpc.viewer.adminMenus.get.useQuery(
    { id: selectedId ?? 0 },
    { enabled: !!selectedId },
  );

  const utils = trpc.useUtils();

  const createMut = trpc.viewer.adminMenus.create.useMutation({
    onSuccess: () => {
      utils.viewer.adminMenus.list.invalidate();
      utils.viewer.adminMenus.tree.invalidate();
      resetCreateForm();
    },
  });

  const updateMut = trpc.viewer.adminMenus.update.useMutation({
    onSuccess: () => {
      utils.viewer.adminMenus.list.invalidate();
      utils.viewer.adminMenus.get.invalidate();
      utils.viewer.adminMenus.tree.invalidate();
    },
  });

  const removeMut = trpc.viewer.adminMenus.remove.useMutation({
    onSuccess: () => {
      utils.viewer.adminMenus.list.invalidate();
      utils.viewer.adminMenus.tree.invalidate();
      setSelectedId(null);
    },
  });

  function resetCreateForm() {
    setShowCreate(false);
    setNewKey("");
    setNewName("");
    setNewIcon("");
    setNewRoute("");
    setNewParentId("");
  }

  const { topLevelItems, childrenMap } = useMemo(() => {
    const top = items?.filter((i) => !i.parentId) ?? [];
    const map = new Map<number, typeof items>();
    for (const item of items ?? []) {
      if (item.parentId) {
        const siblings = map.get(item.parentId) ?? [];
        siblings.push(item);
        map.set(item.parentId, siblings);
      }
    }
    return { topLevelItems: top, childrenMap: map };
  }, [items]);

  return (
    <PermissionGuard permissions={[Permissions.ADMIN_MENUS_READ]}>
      <div className="flex gap-6">
        {/* Left: Menu Item List (tree view) */}
        <div className="w-[300px] shrink-0">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold">{t("title")}</h1>
              <Button
                size="sm"
                variant={showCreate ? "outline" : "default"}
                onClick={() => setShowCreate(!showCreate)}
              >
                {!showCreate && <Plus className="mr-1.5 size-4" />}
                {showCreate ? tCommon("cancel") : t("newItem")}
              </Button>
            </div>

            {showCreate && (
              <Card className="p-4">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!newKey.trim() || !newName.trim()) return;
                    createMut.mutate({
                      key: newKey.trim(),
                      name: newName.trim(),
                      icon: newIcon || undefined,
                      route: newRoute || undefined,
                      parentId: newParentId ? Number(newParentId) : undefined,
                    });
                  }}
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="menu-key">{t("fields.keyRequired")}</Label>
                      <Input
                        id="menu-key"
                        value={newKey}
                        onChange={(e) => setNewKey(e.target.value)}
                        placeholder="cms-core-posts"
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="menu-name">{t("fields.nameRequired")}</Label>
                      <Input
                        id="menu-name"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Posts"
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="menu-icon">{t("fields.icon")}</Label>
                      <Input
                        id="menu-icon"
                        value={newIcon}
                        onChange={(e) => setNewIcon(e.target.value)}
                        placeholder="ti ti-file-text"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="menu-route">{t("fields.route")}</Label>
                      <Input
                        id="menu-route"
                        value={newRoute}
                        onChange={(e) => setNewRoute(e.target.value)}
                        placeholder="/posts"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label>{t("fields.parent")}</Label>
                      <Select
                        value={newParentId || "NONE"}
                        onValueChange={(v) => setNewParentId(v === "NONE" ? "" : v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NONE">{t("noneTopLevel")}</SelectItem>
                          {topLevelItems.map((item) => (
                            <SelectItem key={item.id} value={String(item.id)}>
                              {item.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {createMut.error && (
                      <p className="text-xs text-destructive">{createMut.error.message}</p>
                    )}
                    <Button
                      type="submit"
                      size="sm"
                      disabled={createMut.isPending || !newKey.trim() || !newName.trim()}
                    >
                      {createMut.isPending ? t("creating") : tCommon("create")}
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            {isLoading ? (
              <p className="px-2 py-3 text-sm text-muted-foreground">{t("loading")}</p>
            ) : !topLevelItems.length ? (
              <div className="flex flex-col items-center gap-2 py-6">
                <Menu size={24} className="text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">{t("noItemsTitle")}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-0.5">
                {topLevelItems.map((item) => {
                  const children = childrenMap.get(item.id) ?? [];
                  return (
                    <div key={item.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(item.id)}
                        className={cn(
                          "w-full cursor-pointer rounded-lg border px-3 py-2.5 text-left transition-all",
                          selectedId === item.id
                            ? "border-primary/30 bg-primary/5"
                            : "border-transparent hover:bg-muted",
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {item.icon && (
                            <span className="text-xs text-muted-foreground/50">{item.icon}</span>
                          )}
                          <span className="text-sm font-medium">{item.name}</span>
                          {!item.isActive && (
                            <span className="rounded border border-border px-1 text-[10px] leading-[16px] text-muted-foreground">
                              {t("inactive")}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {item.route ?? "—"} · p{item.priority}
                        </span>
                      </button>
                      {children.length > 0 && (
                        <div className="ml-4 mt-0.5 border-l-2 border-border pl-2">
                          <div className="flex flex-col gap-0.5">
                            {children.map((child) => (
                              <button
                                type="button"
                                key={child.id}
                                onClick={() => setSelectedId(child.id)}
                                className={cn(
                                  "w-full cursor-pointer rounded-lg border px-3 py-2 text-left text-sm transition-all",
                                  selectedId === child.id
                                    ? "border-primary/30 bg-primary/5"
                                    : "border-transparent text-muted-foreground hover:bg-muted",
                                )}
                              >
                                {child.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Detail / Edit */}
        <div className="flex-1">
          {!selectedId ? (
            <div className="flex h-64 items-center justify-center rounded-xl border-2 border-dashed border-border">
              <p className="text-sm text-muted-foreground">
                Select a menu item or create one to get started.
              </p>
            </div>
          ) : !selectedItem ? (
            <div className="flex h-64 items-center justify-center">
              <p className="text-sm text-muted-foreground">{t("loading")}</p>
            </div>
          ) : (
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  {t("editItem", { name: selectedItem.name })}
                </h2>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    askConfirm({
                      message: t("deleteConfirm", { name: selectedItem.name }),
                      onConfirm: () => removeMut.mutate({ id: selectedId }),
                    });
                  }}
                >
                  <Trash2 className="mr-2 size-4" />
                  {t("deleteItem")}
                </Button>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {/* Key (read-only) */}
                <div>
                  <p className="text-xs text-muted-foreground">{t("fields.key")}</p>
                  <code className="mt-1 block rounded-md bg-muted/50 px-3 py-1.5 text-[13px]">
                    {selectedItem.key}
                  </code>
                </div>

                <div className="self-end flex flex-col gap-1.5">
                  <Label htmlFor="edit-name">{t("fields.name")}</Label>
                  <Input
                    id="edit-name"
                    defaultValue={selectedItem.name}
                    onBlur={(e) => {
                      if (e.target.value !== selectedItem.name) {
                        updateMut.mutate({ id: selectedId, name: e.target.value });
                      }
                    }}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="edit-icon">{t("fields.icon")}</Label>
                  <Input
                    id="edit-icon"
                    defaultValue={selectedItem.icon ?? ""}
                    onBlur={(e) => {
                      updateMut.mutate({ id: selectedId, icon: e.target.value || undefined });
                    }}
                    placeholder="ti ti-home"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="edit-route">{t("fields.route")}</Label>
                  <Input
                    id="edit-route"
                    defaultValue={selectedItem.route ?? ""}
                    onBlur={(e) => {
                      updateMut.mutate({ id: selectedId, route: e.target.value || undefined });
                    }}
                    placeholder="/..."
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="edit-priority">{t("fields.priority")}</Label>
                  <Input
                    id="edit-priority"
                    type="number"
                    defaultValue={selectedItem.priority}
                    onBlur={(e) => {
                      const val = Number.parseInt(e.target.value, 10);
                      if (!Number.isNaN(val) && val !== selectedItem.priority) {
                        updateMut.mutate({ id: selectedId, priority: val });
                      }
                    }}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label>{t("fields.active")}</Label>
                  <Select
                    value={selectedItem.isActive ? "true" : "false"}
                    onValueChange={(v) => {
                      updateMut.mutate({ id: selectedId, isActive: v === "true" });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">{t("active.yes")}</SelectItem>
                      <SelectItem value="false">{t("active.no")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label>{t("fields.childrenDisplay")}</Label>
                  <Select
                    value={selectedItem.childrenDisplay ?? "sidebar"}
                    onValueChange={(v) => {
                      updateMut.mutate({
                        id: selectedId,
                        childrenDisplay: v as "sidebar" | "panel",
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sidebar">{t("display.sidebar")}</SelectItem>
                      <SelectItem value="panel">{t("display.panel")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label>{t("fields.parent")}</Label>
                  <Select
                    value={selectedItem.parentId ? String(selectedItem.parentId) : "NONE"}
                    onValueChange={(v) => {
                      updateMut.mutate({
                        id: selectedId,
                        parentId: v === "NONE" ? null : Number(v),
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">{t("noneTopLevel")}</SelectItem>
                      {topLevelItems
                        .filter((i) => i.id !== selectedId)
                        .map((item) => (
                          <SelectItem key={item.id} value={String(item.id)}>
                            {item.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Permissions */}
              <div className="mt-4">
                <p className="text-xs text-muted-foreground">{t("permissionsJson")}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedItem.permissions
                    ? JSON.stringify(selectedItem.permissions)
                    : t("noPermissions")}
                </p>
              </div>

              {/* Translations */}
              {selectedItem.translations && selectedItem.translations.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 font-semibold text-sm">{t("translations")}</p>
                  <div className="flex flex-col gap-1.5">
                    {selectedItem.translations.map((tr) => (
                      <div
                        key={tr.id}
                        className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-1.5"
                      >
                        <code className="text-xs font-semibold text-muted-foreground">
                          {tr.langCode}
                        </code>
                        <span className="text-sm">{tr.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Children preview */}
              {selectedItem.children && selectedItem.children.length > 0 && (
                <div className="mt-4">
                  <Separator className="mb-3" />
                  <p className="mb-2 font-semibold text-sm">
                    {t("children", { count: selectedItem.children.length })}
                  </p>
                  <div className="flex flex-col gap-1">
                    {selectedItem.children.map((child) => (
                      <button
                        type="button"
                        key={child.id}
                        onClick={() => setSelectedId(child.id)}
                        className="w-full cursor-pointer rounded-lg border-0 bg-transparent px-3 py-2 text-left text-sm text-primary transition-all hover:bg-primary/5"
                      >
                        {child.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>
        <ConfirmDialog {...confirmDialogProps} />
      </div>
    </PermissionGuard>
  );
}
