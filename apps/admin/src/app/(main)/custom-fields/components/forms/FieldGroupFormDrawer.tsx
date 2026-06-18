"use client";

import { trpc } from "@admin/lib/trpc";
import { Button } from "@ecom/ui/components/button";
import { Input } from "@ecom/ui/components/input";
import { Label } from "@ecom/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ecom/ui/components/select";
import { PerfectScroll } from "@ecom/ui/components/perfect-scroll";
import { Separator } from "@ecom/ui/components/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@ecom/ui/components/sheet";
import { AlertCircle, Loader2, Save } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { FieldItemsEditor } from "./FieldItemsEditor";
import type { FieldGroupRules } from "./RulesBuilder";
import { RulesBuilder } from "./RulesBuilder";

interface FieldGroupFormDrawerProps {
  open: boolean;
  groupId: number | null; // null = create mode
  onClose: () => void;
  onSaved: () => void;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: form drawer with create/edit modes, rules builder, field items, and status management
export function FieldGroupFormDrawer({
  open,
  groupId,
  onClose,
  onSaved,
}: FieldGroupFormDrawerProps) {
  const t = useTranslations("customFields");
  const isCreate = groupId === null;

  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<"published" | "draft">("published");
  const [rules, setRules] = useState<FieldGroupRules>([]);

  const utils = trpc.useUtils();

  // Load existing group data when editing
  const { data: group, isLoading: loadingGroup } = trpc.viewer.customFields.getGroup.useQuery(
    // biome-ignore lint/style/noNonNullAssertion: enabled guard below
    { id: groupId! },
    { enabled: !isCreate && !!groupId },
  );

  // Populate form when group loads
  useEffect(() => {
    if (group) {
      setTitle(group.title);
      setStatus(group.status as "published" | "draft");
      // Parse Botble-compatible rules from DB
      const rawRules = group.rules;
      if (Array.isArray(rawRules)) {
        setRules(rawRules as unknown as FieldGroupRules);
      } else {
        setRules([]);
      }
    }
  }, [group]);

  // Reset form on open (create mode)
  useEffect(() => {
    if (open && isCreate) {
      setTitle("");
      setStatus("published");
      setRules([]);
    }
  }, [open, isCreate]);

  const createGroupMut = trpc.viewer.customFields.createGroup.useMutation({
    onSuccess: () => {
      utils.viewer.customFields.listGroups.invalidate();
      onSaved();
    },
  });

  const updateGroupMut = trpc.viewer.customFields.updateGroup.useMutation({
    onSuccess: () => {
      utils.viewer.customFields.listGroups.invalidate();
      // biome-ignore lint/style/noNonNullAssertion: onSuccess only fires in edit mode — groupId is not null
      utils.viewer.customFields.getGroup.invalidate({ id: groupId! });
      onSaved();
    },
  });

  const isPending = createGroupMut.isPending || updateGroupMut.isPending;
  const error = createGroupMut.error ?? updateGroupMut.error;

  function handleSave() {
    if (!title.trim()) return;

    if (isCreate) {
      createGroupMut.mutate({
        title: title.trim(),
        rules,
        status,
      });
    } else if (groupId) {
      updateGroupMut.mutate({
        id: groupId,
        title: title.trim(),
        rules,
        status,
      });
    }
  }

  function handleRefreshItems() {
    if (groupId) {
      utils.viewer.customFields.getGroup.invalidate({ id: groupId });
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-[800px]">
        {/* Header */}
        <SheetHeader className="border-b border-border px-6 py-4">
          <SheetTitle>{isCreate ? t("drawer.createTitle") : t("drawer.editTitle")}</SheetTitle>
        </SheetHeader>

        {/* Body */}
        {!isCreate && loadingGroup ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex flex-1 overflow-hidden">
            {/* Left: Main form (scrollable) */}
            <PerfectScroll className="flex-1 px-6 py-6">
              <div className="flex flex-col gap-8">
                {/* Title field */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="field-group-title" className="font-medium">
                    {t("fields.label")} *
                  </Label>
                  <Input
                    id="field-group-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={t("drawer.namePlaceholder")}
                    required
                  />
                </div>

                <Separator />

                {/* Rules Builder */}
                <div className="flex flex-col gap-3">
                  <p className="text-sm font-semibold">{t("drawer.rulesTitle")}</p>
                  <RulesBuilder value={rules} onChange={setRules} />
                </div>

                {/* Field Items — only shown in edit mode */}
                {!isCreate && group && (
                  <>
                    <Separator />
                    <FieldItemsEditor
                      groupId={group.id}
                      items={group.items}
                      onRefresh={handleRefreshItems}
                    />
                  </>
                )}

                {isCreate && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300">
                    {t("drawer.createHint")}
                  </div>
                )}

                {error && (
                  <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-red-50 px-4 py-3 text-sm text-destructive dark:bg-red-950">
                    <AlertCircle className="size-4 shrink-0" />
                    {error.message}
                  </div>
                )}
              </div>
            </PerfectScroll>

            {/* Right: Sidebar actions */}
            <div className="w-[200px] shrink-0 border-l border-border p-4">
              <div className="flex flex-col gap-4">
                <p className="text-sm font-semibold">{t("status.published")}</p>

                <div className="flex flex-col gap-1">
                  <Label className="text-xs">{t("fields.required")}</Label>
                  <Select
                    value={status}
                    onValueChange={(v) => setStatus(v as "published" | "draft")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="published">{t("status.published")}</SelectItem>
                      <SelectItem value="draft">{t("status.draft")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="flex flex-col gap-2">
                  <Button
                    id="field-group-save"
                    className="w-full"
                    disabled={isPending || !title.trim()}
                    onClick={handleSave}
                  >
                    {isPending ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 size-4" />
                    )}
                    {isPending ? t("drawer.saving") : t("drawer.save")}
                  </Button>

                  {!isCreate && (
                    <Button
                      id="field-group-save-edit"
                      variant="outline"
                      className="w-full"
                      disabled={isPending || !title.trim()}
                      onClick={handleSave}
                    >
                      {t("saveAndEdit")}
                    </Button>
                  )}

                  <Button variant="ghost" className="w-full" onClick={onClose}>
                    {t("drawer.cancel")}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
