"use client";

import { ALL_PERMISSIONS } from "@ecom/lib/permissions";
import { Card } from "@ecom/ui/components/card";
import { Input } from "@ecom/ui/components/input";
import { Skeleton } from "@ecom/ui/components/skeleton";
import { cn } from "@ecom/ui/lib/utils";
import { Check, ChevronDown, ChevronRight, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

export interface PermissionItem {
  id: string;
  name: string;
  displayName: string;
}

export interface TreeSubmodule {
  key: string;
  parentPerm?: PermissionItem;
  childPerms: PermissionItem[];
}

export interface TreeModule {
  key: string;
  submodules: { [submoduleKey: string]: TreeSubmodule };
}

export interface TreeSection {
  key: string;
  modules: { [moduleKey: string]: TreeModule };
}

// ── Custom Checkbox Component ───────────────────────────────────────────────

interface CustomCheckboxProps {
  id: string;
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  disabled?: boolean;
  type: "green" | "blue" | "orange";
}

function CustomCheckbox({
  id,
  checked,
  indeterminate,
  onChange,
  disabled,
  type,
}: CustomCheckboxProps) {
  const styles = {
    green: {
      border: "border-green-600 dark:border-green-500",
      bg: "bg-green-600 dark:bg-green-500",
    },
    blue: {
      border: "border-blue-600 dark:border-blue-500",
      bg: "bg-blue-600 dark:bg-blue-500",
    },
    orange: {
      border: "border-amber-500 dark:border-amber-400",
      bg: "bg-amber-500 dark:bg-amber-400",
    },
  }[type];

  const isCheckedOrIndeterminate = checked || indeterminate;

  return (
    <div className="relative flex items-center size-4 shrink-0">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        ref={(el) => {
          if (el) {
            el.indeterminate = !!indeterminate;
          }
        }}
        onChange={onChange}
        disabled={disabled}
        className="peer absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
      />
      <div
        className={cn(
          "flex size-4 items-center justify-center rounded border transition-all duration-150 pointer-events-none peer-focus-visible:ring-1 peer-focus-visible:ring-ring",
          isCheckedOrIndeterminate
            ? `${styles.bg} ${styles.border} text-white`
            : "border-muted-foreground/30 bg-background peer-hover:border-muted-foreground/60",
          disabled && "opacity-50",
        )}
      >
        {checked && <Check className="size-2.5 stroke-[4.5]" />}
        {!checked && indeterminate && <span className="h-[2px] w-2 bg-white rounded-full" />}
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const getOrCreateSection = (tree: { [key: string]: TreeSection }, sectionKey: string) => {
  if (!tree[sectionKey]) {
    tree[sectionKey] = { key: sectionKey, modules: {} };
  }
  return tree[sectionKey];
};

const getOrCreateModule = (section: TreeSection, moduleKey: string) => {
  if (!section.modules[moduleKey]) {
    section.modules[moduleKey] = { key: moduleKey, submodules: {} };
  }
  return section.modules[moduleKey];
};

const getOrCreateSubmodule = (mod: TreeModule, submoduleKey: string) => {
  if (!mod.submodules[submoduleKey]) {
    mod.submodules[submoduleKey] = { key: submoduleKey, childPerms: [] };
  }
  return mod.submodules[submoduleKey];
};

function buildPermissionTree(
  dbPermissionMap: Map<string, { id: string; name: string; displayName: string | null }>,
) {
  const tree: { [sectionKey: string]: TreeSection } = {};

  for (const permMeta of ALL_PERMISSIONS) {
    const dbPerm = dbPermissionMap.get(permMeta.name);
    if (!dbPerm) continue;

    const node: PermissionItem = {
      id: dbPerm.id,
      name: permMeta.name,
      displayName: dbPerm.displayName ?? permMeta.displayName,
    };

    const section = getOrCreateSection(tree, permMeta.section);
    const mod = getOrCreateModule(section, permMeta.group);
    const sub = getOrCreateSubmodule(mod, permMeta.module);

    if (!permMeta.parent) {
      if (!sub.parentPerm) {
        sub.parentPerm = node;
      } else {
        sub.childPerms.push(node);
      }
    } else {
      sub.childPerms.push(node);
    }
  }

  return tree;
}

function isTextMatching(query: string, text: string) {
  return text.toLowerCase().includes(query.toLowerCase());
}

function matchSubmodule(
  sub: TreeSubmodule,
  query: string,
  t: { (key: string): string; has: (key: string) => boolean },
) {
  const subName = t.has(`modules.${sub.key}`) ? t(`modules.${sub.key}`) : sub.key;
  if (isTextMatching(query, subName)) return { matched: true, matchingChildren: sub.childPerms };

  const hasMatchingParent =
    sub.parentPerm &&
    (isTextMatching(query, sub.parentPerm.displayName) ||
      isTextMatching(
        query,
        t.has(`permissionsList.${sub.parentPerm.name}`)
          ? t(`permissionsList.${sub.parentPerm.name}`)
          : sub.parentPerm.displayName,
      ));

  const matchingChildren = sub.childPerms.filter(
    (c) =>
      isTextMatching(query, c.displayName) ||
      isTextMatching(
        query,
        t.has(`permissionsList.${c.name}`) ? t(`permissionsList.${c.name}`) : c.displayName,
      ),
  );

  if (hasMatchingParent || matchingChildren.length > 0) {
    return { matched: true, matchingChildren };
  }

  return { matched: false, matchingChildren: [] };
}

function addParentPermissions(
  ids: string[],
  dbPermissions: { id: string; name: string }[],
): string[] {
  const result = new Set(ids);
  for (const id of ids) {
    const perm = dbPermissions.find((p) => p.id === id);
    if (!perm) continue;
    const meta = ALL_PERMISSIONS.find((ap) => ap.name === perm.name);
    if (meta?.parent) {
      const parentPerm = dbPermissions.find((p) => p.name === meta.parent);
      if (parentPerm) {
        result.add(parentPerm.id);
      }
    }
  }
  return [...result];
}

function removeChildPermissions(
  ids: string[],
  dbPermissions: { id: string; name: string }[],
): string[] {
  let result = [...ids];
  let changed = true;
  while (changed) {
    changed = false;
    const currentIds = [...result];
    for (const id of currentIds) {
      const perm = dbPermissions.find((p) => p.id === id);
      if (!perm) continue;
      const meta = ALL_PERMISSIONS.find((ap) => ap.name === perm.name);
      if (meta?.parent) {
        const parentPerm = dbPermissions.find((p) => p.name === meta.parent);
        if (parentPerm && !result.includes(parentPerm.id)) {
          result = result.filter((x) => x !== id);
          changed = true;
        }
      }
    }
  }
  return result;
}

function filterSubmodules(
  submodules: { [key: string]: TreeSubmodule },
  searchQuery: string,
  modMatches: boolean,
  secMatches: boolean,
  t: { (key: string): string; has: (key: string) => boolean },
) {
  const filteredSubs: { [key: string]: TreeSubmodule } = {};
  for (const [subKey, sub] of Object.entries(submodules)) {
    const { matched, matchingChildren } = matchSubmodule(sub, searchQuery, t);

    if (matched || modMatches || secMatches) {
      filteredSubs[subKey] = {
        ...sub,
        childPerms:
          modMatches || secMatches || matchingChildren.length === sub.childPerms.length
            ? sub.childPerms
            : matchingChildren,
      };
    }
  }
  return filteredSubs;
}

function filterModules(
  modules: { [key: string]: TreeModule },
  searchQuery: string,
  secMatches: boolean,
  t: { (key: string): string; has: (key: string) => boolean },
) {
  const filteredMods: { [key: string]: TreeModule } = {};
  for (const [mKey, mod] of Object.entries(modules)) {
    const modName = t.has(`modules.${mKey}`) ? t(`modules.${mKey}`) : mKey;
    const modMatches = isTextMatching(searchQuery, modName);

    const filteredSubs = filterSubmodules(mod.submodules, searchQuery, modMatches, secMatches, t);

    if (Object.keys(filteredSubs).length > 0) {
      filteredMods[mKey] = {
        ...mod,
        submodules: filteredSubs,
      };
    }
  }
  return filteredMods;
}

// ── Main Component ───────────────────────────────────────────────────────────

interface PermissionTreeProps {
  dbPermissions: { id: string; name: string; displayName: string | null }[];
  selectedPermissionIds: string[];
  onChange: (ids: string[]) => void;
  isPending?: boolean;
  isLoading?: boolean;
}

export function PermissionTree({
  dbPermissions,
  selectedPermissionIds,
  onChange,
  isPending = false,
  isLoading = false,
}: PermissionTreeProps) {
  const t = useTranslations("roles");

  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedNodes, setCollapsedNodes] = useState<string[]>([]);

  // Maps and tree builders
  const dbPermissionMap = useMemo(() => {
    return new Map(dbPermissions.map((p) => [p.name, p]));
  }, [dbPermissions]);

  const permissionTree = useMemo(() => {
    return buildPermissionTree(dbPermissionMap);
  }, [dbPermissionMap]);

  // Recursively collect paths to collapse all
  const allExpandablePaths = useMemo(() => {
    const paths: string[] = [];
    for (const [sKey, sec] of Object.entries(permissionTree)) {
      paths.push(sKey);
      for (const [mKey, mod] of Object.entries(sec.modules)) {
        paths.push(`${sKey}/${mKey}`);
        for (const subKey of Object.keys(mod.submodules)) {
          paths.push(`${sKey}/${mKey}/${subKey}`);
        }
      }
    }
    return paths;
  }, [permissionTree]);

  const isAllSelected = useMemo(() => {
    return dbPermissions.length > 0 && selectedPermissionIds.length === dbPermissions.length;
  }, [dbPermissions, selectedPermissionIds]);

  // Collapsed status check helpers
  const isNodeCollapsed = useCallback(
    (path: string) => collapsedNodes.includes(path),
    [collapsedNodes],
  );

  const togglePathCollapse = useCallback((path: string) => {
    setCollapsedNodes((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path],
    );
  }, []);

  const expandAll = () => setCollapsedNodes([]);
  const collapseAll = () => setCollapsedNodes(allExpandablePaths);

  // Check state calculation
  const getSelectionState = useCallback(
    (targetIds: string[]) => {
      if (targetIds.length === 0) return { checked: false, indeterminate: false };
      const checkedCount = targetIds.filter((id) => selectedPermissionIds.includes(id)).length;
      return {
        checked: checkedCount === targetIds.length,
        indeterminate: checkedCount > 0 && checkedCount < targetIds.length,
      };
    },
    [selectedPermissionIds],
  );

  // Core checkbox toggle handler (respects parent-child dependencies)
  const handleTogglePermissions = useCallback(
    (targetIds: string[], isChecking: boolean) => {
      let newIds = [...selectedPermissionIds];
      if (isChecking) {
        newIds = addParentPermissions([...newIds, ...targetIds], dbPermissions);
      } else {
        newIds = removeChildPermissions(
          newIds.filter((id) => !targetIds.includes(id)),
          dbPermissions,
        );
      }
      onChange([...new Set(newIds)]);
    },
    [selectedPermissionIds, dbPermissions, onChange],
  );

  const toggleSelectAllGlobal = () => {
    if (isAllSelected) {
      onChange([]);
    } else {
      onChange(dbPermissions.map((p) => p.id));
    }
  };

  // Search Filter logic
  const filteredPermissionTree = useMemo(() => {
    if (!searchQuery) return permissionTree;

    const filteredSecs: { [key: string]: TreeSection } = {};

    for (const [sKey, sec] of Object.entries(permissionTree)) {
      const secName = t.has(`sections.${sKey}`) ? t(`sections.${sKey}`) : sKey;
      const secMatches = isTextMatching(searchQuery, secName);

      const filteredMods = filterModules(sec.modules, searchQuery, secMatches, t);

      if (Object.keys(filteredMods).length > 0) {
        filteredSecs[sKey] = {
          ...sec,
          modules: filteredMods,
        };
      }
    }

    return filteredSecs;
  }, [permissionTree, searchQuery, t]);

  // Helper selectors for target IDs
  const getSubmoduleIds = (sub: TreeSubmodule) => {
    return [...(sub.parentPerm ? [sub.parentPerm.id] : []), ...sub.childPerms.map((c) => c.id)];
  };

  const getModuleIds = (mod: TreeModule) => {
    return Object.values(mod.submodules).flatMap(getSubmoduleIds);
  };

  const getSectionIds = (sec: TreeSection) => {
    return Object.values(sec.modules).flatMap(getModuleIds);
  };

  return (
    <Card className="p-6 border-border/80">
      {/* Card Header with Right Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border/60 pb-3 mb-4 gap-3">
        <div>
          <h2 className="text-base font-semibold">{t("permissions")}</h2>
          <p className="text-xs text-muted-foreground">{t("togglePermissions")}</p>
        </div>
        {!isLoading && (
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={toggleSelectAllGlobal}
                disabled={isPending}
                className="size-4 rounded border-border text-primary"
              />
              <span>Tất cả phân quyền</span>
            </label>
            <div className="flex items-center gap-2 text-xs font-semibold text-primary select-none">
              <button type="button" onClick={expandAll} className="hover:underline">
                Mở rộng tất cả
              </button>
              <span className="text-muted-foreground/45">|</span>
              <button type="button" onClick={collapseAll} className="hover:underline">
                Thu gọn tất cả
              </button>
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3 py-4">
          {Array.from({ length: 3 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton items
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("form.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* Permission Tree */}
          <div className="flex flex-col gap-4">
            {Object.entries(filteredPermissionTree).map(([sectionKey, section]) => {
              const sectionName = t.has(`sections.${sectionKey}`)
                ? t(`sections.${sectionKey}`)
                : sectionKey;
              const sectionIds = getSectionIds(section);
              const secState = getSelectionState(sectionIds);
              const isSecCollapsed = isNodeCollapsed(sectionKey);

              return (
                <div
                  key={sectionKey}
                  className="rounded-lg border border-border overflow-hidden bg-card/10 shadow-sm"
                >
                  {/* Section Header */}
                  <div className="flex items-center justify-between bg-green-50/30 dark:bg-green-950/15 border-b border-border/80 px-4 py-3 select-none">
                    <label
                      htmlFor={`perm-sec-${sectionKey}`}
                      className="flex items-center gap-2.5 cursor-pointer select-none"
                    >
                      <CustomCheckbox
                        id={`perm-sec-${sectionKey}`}
                        type="green"
                        checked={secState.checked}
                        indeterminate={secState.indeterminate}
                        onChange={() => handleTogglePermissions(sectionIds, !secState.checked)}
                        disabled={isPending}
                      />
                      <span className="text-xs font-bold uppercase tracking-wider text-green-700 dark:text-green-400">
                        {sectionName}
                      </span>
                    </label>
                    <button
                      type="button"
                      className="p-1 hover:bg-muted/60 dark:hover:bg-muted/30 rounded text-muted-foreground transition-colors"
                      onClick={() => togglePathCollapse(sectionKey)}
                    >
                      {isSecCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>

                  {/* Modules list */}
                  {!isSecCollapsed && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 p-5 bg-card/25 dark:bg-muted/5">
                      {Object.entries(section.modules).map(([moduleKey, mod]) => {
                        const moduleName = t.has(`modules.${moduleKey}`)
                          ? t(`modules.${moduleKey}`)
                          : moduleKey;
                        const moduleIds = getModuleIds(mod);
                        const modState = getSelectionState(moduleIds);
                        const modPath = `${sectionKey}/${moduleKey}`;
                        const isModCollapsed = isNodeCollapsed(modPath);

                        const submodulesList = Object.values(mod.submodules);
                        const isMerged =
                          submodulesList.length === 1 && submodulesList[0].key === moduleKey;

                        return (
                          <div key={moduleKey} className="flex flex-col gap-2">
                            {/* Module header */}
                            <div className="flex items-center gap-2">
                              {!isMerged && (
                                <button
                                  type="button"
                                  onClick={() => togglePathCollapse(modPath)}
                                  className="size-4 border border-border/80 hover:border-border rounded flex items-center justify-center bg-muted/40 hover:bg-muted text-[10px] font-bold text-muted-foreground transition-all shrink-0"
                                >
                                  {isModCollapsed ? "+" : "-"}
                                </button>
                              )}
                              <label
                                htmlFor={`perm-mod-${sectionKey}-${moduleKey}`}
                                className="flex items-center gap-2 select-none cursor-pointer truncate"
                              >
                                <CustomCheckbox
                                  id={`perm-mod-${sectionKey}-${moduleKey}`}
                                  type="blue"
                                  checked={modState.checked}
                                  indeterminate={modState.indeterminate}
                                  onChange={() =>
                                    handleTogglePermissions(moduleIds, !modState.checked)
                                  }
                                  disabled={isPending}
                                />
                                <span className="bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 rounded px-1.5 py-0.5 text-xs font-bold truncate">
                                  {moduleName}
                                </span>
                              </label>
                            </div>

                            {/* Submodules list / child permissions (if not collapsed) */}
                            {!isModCollapsed && (
                              <div className="pl-3.5 ml-2 border-l border-dashed border-border/80 flex flex-col gap-3 mt-1">
                                {isMerged
                                  ? // Renders leaf actions directly at orange-badge level when submodule is merged
                                    submodulesList[0].childPerms.map((child) => {
                                      const isChecked = selectedPermissionIds.includes(child.id);
                                      const childLabel = t.has(`permissionsList.${child.name}`)
                                        ? t(`permissionsList.${child.name}`)
                                        : child.displayName;

                                      return (
                                        <label
                                          key={child.id}
                                          htmlFor={`perm-child-${child.id}`}
                                          className="flex items-center gap-2 select-none cursor-pointer"
                                        >
                                          <CustomCheckbox
                                            id={`perm-child-${child.id}`}
                                            type="orange"
                                            checked={isChecked}
                                            onChange={() =>
                                              handleTogglePermissions([child.id], !isChecked)
                                            }
                                            disabled={isPending}
                                          />
                                          <span className="bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 rounded px-1.5 py-0.5 text-[11px] font-bold">
                                            {childLabel}
                                          </span>
                                        </label>
                                      );
                                    })
                                  : // Standard multi-submodule rendering
                                    submodulesList.map((sub) => {
                                      const subName = t.has(`modules.${sub.key}`)
                                        ? t(`modules.${sub.key}`)
                                        : sub.key;
                                      const subIds = getSubmoduleIds(sub);
                                      const subState = getSelectionState(subIds);
                                      const subPath = `${sectionKey}/${moduleKey}/${sub.key}`;
                                      const isSubCollapsed = isNodeCollapsed(subPath);
                                      const hasChildren = sub.childPerms.length > 0;

                                      return (
                                        <div key={sub.key} className="flex flex-col gap-2">
                                          <div className="flex items-center gap-2">
                                            {hasChildren && (
                                              <button
                                                type="button"
                                                onClick={() => togglePathCollapse(subPath)}
                                                className="size-4 border border-border/80 hover:border-border rounded flex items-center justify-center bg-muted/40 hover:bg-muted text-[10px] font-bold text-muted-foreground transition-all shrink-0"
                                              >
                                                {isSubCollapsed ? "+" : "-"}
                                              </button>
                                            )}
                                            <label
                                              htmlFor={`perm-sub-${sectionKey}-${moduleKey}-${sub.key}`}
                                              className="flex items-center gap-2 select-none cursor-pointer truncate"
                                            >
                                              <CustomCheckbox
                                                id={`perm-sub-${sectionKey}-${moduleKey}-${sub.key}`}
                                                type="orange"
                                                checked={subState.checked}
                                                indeterminate={subState.indeterminate}
                                                onChange={() =>
                                                  handleTogglePermissions(subIds, !subState.checked)
                                                }
                                                disabled={isPending}
                                              />
                                              <span className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 rounded px-1.5 py-0.5 text-xs font-bold truncate">
                                                {subName}
                                              </span>
                                            </label>
                                          </div>

                                          {/* Action items under submodule */}
                                          {hasChildren && !isSubCollapsed && (
                                            <div className="pl-3.5 ml-2 border-l border-dashed border-border/80 flex flex-col gap-2.5 mt-1">
                                              {sub.childPerms.map((child) => {
                                                const isChecked = selectedPermissionIds.includes(
                                                  child.id,
                                                );
                                                const actionLabel = t.has(
                                                  `permissionsList.${child.name}`,
                                                )
                                                  ? t(`permissionsList.${child.name}`)
                                                  : child.displayName;

                                                return (
                                                  <label
                                                    key={child.id}
                                                    htmlFor={`perm-child-${child.id}`}
                                                    className="flex items-center gap-2 select-none cursor-pointer"
                                                  >
                                                    <CustomCheckbox
                                                      id={`perm-child-${child.id}`}
                                                      type="blue"
                                                      checked={isChecked}
                                                      onChange={() =>
                                                        handleTogglePermissions(
                                                          [child.id],
                                                          !isChecked,
                                                        )
                                                      }
                                                      disabled={isPending}
                                                    />
                                                    <span className="text-xs text-foreground font-medium hover:text-primary transition-colors">
                                                      {actionLabel}
                                                    </span>
                                                  </label>
                                                );
                                              })}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}
