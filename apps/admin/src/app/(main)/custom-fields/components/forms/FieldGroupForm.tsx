"use client";

import { StickyPublishBar } from "@admin/components/layout/StickyPublishBar";
import PageBreadcrumb from "@admin/components/PageBreadcrumb";
import { useToast } from "@admin/components/toast-provider";
import { downloadJson } from "@admin/lib/download";
import { trpc } from "@admin/lib/trpc";
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
import { AlertCircle, ArrowLeft, Download, Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { FieldItemsEditor } from "./FieldItemsEditor";
import type { FieldGroupRules } from "./RulesBuilder";
import { RulesBuilder } from "./RulesBuilder";

interface FieldGroupFormProps {
  groupId: number | null; // null = create mode
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: page-based form component with create/edit modes, rules builder, field items, status, and layout
export function FieldGroupForm({ groupId }: FieldGroupFormProps) {
  const t = useTranslations("customFields");
  const commonT = useTranslations("common");
  const router = useRouter();
  const { toast } = useToast();
  const isCreate = groupId === null;

  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<"published" | "draft">("published");
  const [rules, setRules] = useState<FieldGroupRules>([]);
  const [order, setOrder] = useState(0);

  const publishCardRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  // Load existing group data when editing
  const {
    data: group,
    isLoading: loadingGroup,
    error: queryError,
  } = trpc.viewer.customFields.getGroup.useQuery(
    // biome-ignore lint/style/noNonNullAssertion: enabled guard below
    { id: groupId! },
    { enabled: !isCreate && !!groupId },
  );

  // Populate form when group loads
  useEffect(() => {
    if (group) {
      setTitle(group.title);
      setStatus(group.status as "published" | "draft");
      setOrder(group.order ?? 0);
      const rawRules = group.rules;
      if (Array.isArray(rawRules)) {
        setRules(rawRules as unknown as FieldGroupRules);
      } else {
        setRules([]);
      }
    }
  }, [group]);

  const createGroupMut = trpc.viewer.customFields.createGroup.useMutation({
    onSuccess: () => {
      utils.viewer.customFields.listGroups.invalidate();
      toast(commonT("successCreated") ?? "Tạo thành công", "success");
    },
    onError: (err) => {
      toast(err.message, "error");
    },
  });

  const updateGroupMut = trpc.viewer.customFields.updateGroup.useMutation({
    onSuccess: () => {
      utils.viewer.customFields.listGroups.invalidate();
      // biome-ignore lint/style/noNonNullAssertion: onSuccess only fires in edit mode
      utils.viewer.customFields.getGroup.invalidate({ id: groupId! });
      toast(commonT("successUpdated") ?? "Cập nhật thành công", "success");
    },
    onError: (err) => {
      toast(err.message, "error");
    },
  });

  const isPending = createGroupMut.isPending || updateGroupMut.isPending;
  const error = createGroupMut.error ?? updateGroupMut.error;

  function handleSave() {
    if (!title.trim()) return;

    if (isCreate) {
      createGroupMut.mutate(
        {
          title: title.trim(),
          rules,
          status,
          order,
        },
        {
          onSuccess: (newGroup) => {
            router.push(`/custom-fields/${newGroup.id}/edit`);
          },
        },
      );
    } else if (groupId) {
      updateGroupMut.mutate({
        id: groupId,
        title: title.trim(),
        rules,
        status,
        order,
      });
    }
  }

  function handleRefreshItems() {
    if (groupId) {
      utils.viewer.customFields.getGroup.invalidate({ id: groupId });
    }
  }

  if (!isCreate && loadingGroup) {
    return (
      <div className="flex flex-col gap-6">
        <PageBreadcrumb className="mb-0" />
        <div className="flex items-center justify-between gap-4 mt-1 mb-2">
          <div className="flex flex-col gap-2">
            <div className="h-7 w-48 animate-pulse bg-muted rounded" />
            <div className="h-4 w-64 animate-pulse bg-muted rounded" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4 items-start">
          <div className="lg:col-span-3 flex flex-col gap-6">
            <Card className="h-32 w-full animate-pulse bg-muted/50" />
            <Card className="h-64 w-full animate-pulse bg-muted/50" />
          </div>
          <Card className="h-44 w-full animate-pulse bg-muted/50" />
        </div>
      </div>
    );
  }

  if (!isCreate && (queryError || (!loadingGroup && !group))) {
    return (
      <div className="flex flex-col gap-6">
        <PageBreadcrumb className="mb-0" />
        <Card className="flex flex-col items-center justify-center p-12 text-center border-border/80">
          <AlertCircle className="size-12 text-destructive mb-4" />
          <h2 className="text-lg font-bold text-foreground">{t("groupNotFound")}</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-6">{t("groupNotFoundHelper")}</p>
          <Button onClick={() => router.push("/custom-fields")} size="sm">
            <ArrowLeft className="mr-2 size-4" />
            {commonT("back") ?? "Quay lại"}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageBreadcrumb className="mb-0" />

      {/* Header */}
      <div className="flex items-center justify-between gap-4 mt-1 mb-2">
        <div>
          <h1 className="text-xl font-bold">
            {isCreate ? t("drawer.createTitle") : t("drawer.editTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push("/custom-fields")}>
          <ArrowLeft className="mr-2 size-4" />
          {commonT("back") ?? "Quay lại"}
        </Button>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
        className="grid grid-cols-1 gap-6 lg:grid-cols-4 items-start"
      >
        <StickyPublishBar
          publishCardRef={publishCardRef}
          title={title || (isCreate ? t("newGroup") : "")}
          label={isCreate ? t("newGroup") : t("editGroup")}
          isPending={isPending || !title.trim()}
          onSave={handleSave}
          saveLabel={isPending ? t("drawer.saving") : t("drawer.save")}
        />

        {/* Left Column: Form & Configs */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          {/* Inputs Card */}
          <Card className="p-6 border-border/80">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="field-group-title" className="font-semibold text-foreground">
                  {t("fields.label")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="field-group-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("drawer.namePlaceholder")}
                  required
                />
              </div>
            </div>
          </Card>

          {/* Rules Builder Card */}
          <Card className="p-6 border-border/80">
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">{t("drawer.rulesTitle")}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{t("rulesBuilder.ifLabel")}</p>
              </div>
              <Separator className="bg-border/60" />
              <RulesBuilder value={rules} onChange={setRules} />
            </div>
          </Card>

          {/* Field Items — only shown in edit mode */}
          {!isCreate && group && (
            <Card className="p-6 border-border/80">
              <FieldItemsEditor
                groupId={group.id}
                items={group.items}
                onRefresh={handleRefreshItems}
              />
            </Card>
          )}

          {isCreate && (
            <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 text-sm text-blue-700 dark:border-blue-800/40 dark:bg-blue-950/20 dark:text-blue-300">
              {t("drawer.createHint")}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-red-50 px-4 py-3 text-sm text-destructive dark:bg-red-950/40">
              <AlertCircle className="size-4 shrink-0" />
              {error.message}
            </div>
          )}
        </div>

        {/* Right Column: Publish Sidebar */}
        <div className="flex flex-col gap-4" ref={publishCardRef}>
          {/* Card 1: Xuất bản */}
          <Card className="p-4 border-border/80">
            <div className="border-b border-border/60 pb-2 mb-3">
              <h3 className="text-sm font-semibold">{commonT("publish") ?? "Xuất bản"}</h3>
            </div>

            <div className="flex flex-col gap-3">
              {!isCreate && groupId ? (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    id="field-group-save"
                    className="h-9 px-2 text-xs font-semibold flex items-center justify-center gap-1.5"
                    disabled={isPending || !title.trim()}
                    type="submit"
                  >
                    {isPending ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Save className="size-3.5" />
                    )}
                    {t("drawer.save") ?? "Lưu"}
                  </Button>

                  <Button
                    variant="outline"
                    className="h-9 px-2 text-xs font-semibold flex items-center justify-center gap-1.5 bg-background"
                    type="button"
                    onClick={async () => {
                      try {
                        const exportData = await utils.viewer.customFields.exportGroups.fetch({
                          ids: [groupId],
                        });
                        await downloadJson(exportData, `custom-field-${groupId}.json`);
                        toast("Xuất dữ liệu thành công", "success");
                      } catch (err) {
                        const msg = err instanceof Error ? err.message : String(err);
                        toast(msg, "error");
                      }
                    }}
                  >
                    <Download className="size-3.5" />
                    Xuất dữ liệu
                  </Button>
                </div>
              ) : (
                <Button
                  id="field-group-save"
                  className="w-full h-9 text-xs font-semibold flex items-center justify-center gap-1.5"
                  disabled={isPending || !title.trim()}
                  type="submit"
                >
                  {isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  {t("drawer.save") ?? "Lưu"}
                </Button>
              )}
            </div>
          </Card>

          {/* Card 2: Trạng thái */}
          <Card className="p-4 border-border/80">
            <div className="border-b border-border/60 pb-2 mb-3">
              <h3 className="text-sm font-semibold">
                Trạng thái <span className="text-destructive">*</span>
              </h3>
            </div>
            <Select value={status} onValueChange={(v) => setStatus(v as "published" | "draft")}>
              <SelectTrigger className="h-9 w-full bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="published">{t("status.published")}</SelectItem>
                <SelectItem value="draft">{t("status.draft")}</SelectItem>
              </SelectContent>
            </Select>
          </Card>

          {/* Card 3: Thứ tự */}
          <Card className="p-4 border-border/80">
            <div className="border-b border-border/60 pb-2 mb-3">
              <h3 className="text-sm font-semibold">{t("tableColOrder")}</h3>
            </div>
            <Input
              type="number"
              className="h-9 w-full bg-background"
              value={order}
              onChange={(e) => setOrder(Number(e.target.value))}
              min={0}
            />
          </Card>
        </div>
      </form>
    </div>
  );
}
