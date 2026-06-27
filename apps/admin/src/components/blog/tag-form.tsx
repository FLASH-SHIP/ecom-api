"use client";

import { StickyPublishBar } from "@admin/components/layout/StickyPublishBar";
import { useToast } from "@admin/components/toast-provider";
import { RichTextEditor } from "@admin/components/ui/RichTextEditor";
import { trpc } from "@admin/lib/trpc";
import { Button } from "@ecom/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@ecom/ui/components/card";
import { Input } from "@ecom/ui/components/input";
import { Label } from "@ecom/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ecom/ui/components/select";
import { Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";

type TagStatus = "DRAFT" | "PENDING" | "PUBLISHED";

interface TagFormData {
  name: string;
  slug?: string;
  description?: string;
  status: TagStatus;
}

interface TagFormProps {
  mode: "create" | "edit";
  tagId?: number;
  initialData?: Partial<TagFormData>;
  translationMode?: string | null;
}

const STATUS_OPTIONS: { value: TagStatus; labelKey: string }[] = [
  { value: "PUBLISHED", labelKey: "status.published" },
  { value: "DRAFT", labelKey: "status.draft" },
  { value: "PENDING", labelKey: "status.pending" },
];

const PERMALINK_PREFIX = "/tag/";

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: form with create/edit modes, validation, slug preview, translation mode, and conditional sidebar
export function TagForm({ mode, tagId, initialData, translationMode }: TagFormProps) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { toast } = useToast();
  const t = useTranslations("tags");
  const publishCardRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<TagFormData>({
    name: initialData?.name ?? "",
    slug: initialData?.slug ?? "",
    description: initialData?.description ?? "",
    status: initialData?.status ?? "PUBLISHED",
  });

  const createMutation = trpc.viewer.tags.create.useMutation({
    onSuccess: (data) => {
      toast(t("createSuccess"), "success");
      utils.viewer.tags.list.invalidate();
      router.push(`/tags/${data.id}/edit`);
    },
    onError: (err) => toast(err.message, "error"),
  });

  const updateMutation = trpc.viewer.tags.update.useMutation({
    onSuccess: () => {
      toast(t("updateSuccess"), "success");
      utils.viewer.tags.list.invalidate();
      if (tagId) utils.viewer.tags.get.invalidate({ id: tagId });
    },
    onError: (err) => toast(err.message, "error"),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const error = createMutation.error || updateMutation.error;

  function buildPayload() {
    return {
      name: formData.name,
      slug: formData.slug || undefined,
      description: formData.description || undefined,
      status: formData.status,
    };
  }

  function handleSave(e?: React.FormEvent) {
    if (e) {
      e.preventDefault();
    }
    const payload = buildPayload();
    if (mode === "edit" && tagId) {
      updateMutation.mutate({ id: tagId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const slugPreview =
    formData.slug?.trim() ||
    formData.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[đ]/g, "d")
      .replace(/[Đ]/g, "d")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .trim();

  return (
    <form onSubmit={handleSave}>
      {!translationMode && (
        <StickyPublishBar
          publishCardRef={publishCardRef}
          title={formData.name}
          label={mode === "create" ? "Tạo thẻ" : "Sửa thẻ"}
          isPending={isPending || !formData.name.trim()}
          onSave={() => {}}
          saveLabel={isPending ? "Đang lưu..." : t("form.save")}
        />
      )}
      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-red-50 px-4 py-3 text-sm text-destructive dark:bg-red-950">
          {error.message}
        </div>
      )}

      <div
        className={`grid items-start gap-5 ${!translationMode ? "lg:grid-cols-[1fr_280px]" : ""}`}
      >
        {/* ── Left: Main Content ── */}
        <Card>
          <CardContent className="flex flex-col gap-5 p-5">
            {translationMode && (
              <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
                🌐 You are editing the <strong>{translationMode}</strong> translation.
              </div>
            )}
            {/* Name */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tag-name" className="text-sm font-medium">
                {t("fields.name")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="tag-name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder={t("form.namePlaceholder")}
                required
                maxLength={120}
              />
            </div>

            {/* Permalink */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tag-slug" className="text-sm font-medium">
                {t("fields.slug")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="tag-slug"
                value={formData.slug}
                onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                placeholder={t("form.slugPlaceholder")}
              />
              {slugPreview && (
                <p className="text-xs text-muted-foreground">
                  {t("form.permalinkPreview")}{" "}
                  <span className="text-primary">
                    {PERMALINK_PREFIX}
                    {slugPreview}
                  </span>
                </p>
              )}
            </div>

            {/* Content */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium">{t("fields.content")}</Label>
              <RichTextEditor
                id="tag-content"
                value={formData.description ?? ""}
                onChange={(val) => setFormData((prev) => ({ ...prev, description: val }))}
                placeholder={t("form.contentPlaceholder")}
                minHeight={250}
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Right: Sidebar — hidden in translation mode ── */}
        {!translationMode ? (
          <div className="flex flex-col gap-4" ref={publishCardRef}>
            {/* Publish */}
            <Card>
              <CardHeader className="border-b border-border px-4 py-3">
                <CardTitle className="text-sm font-semibold">{t("form.publish")}</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <Button
                  id="tag-save"
                  type="submit"
                  disabled={isPending || !formData.name.trim()}
                  size="sm"
                  className="w-full font-semibold"
                >
                  {isPending ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 size-4" />
                  )}
                  {t("form.save")}
                </Button>
              </CardContent>
            </Card>

            {/* Status */}
            <Card>
              <CardHeader className="border-b border-border px-4 py-3">
                <CardTitle className="text-sm font-semibold">
                  {t("fields.status")} <span className="text-destructive">*</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <Select
                  value={formData.status}
                  onValueChange={(v) =>
                    setFormData((prev) => ({ ...prev, status: v as TagStatus }))
                  }
                >
                  <SelectTrigger id="tag-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {t(opt.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="p-4">
              <Button type="submit" disabled={isPending} className="w-full font-semibold">
                {isPending ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Save className="mr-2 size-4" />
                )}
                {`Save ${translationMode.toUpperCase()} Translation`}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </form>
  );
}
