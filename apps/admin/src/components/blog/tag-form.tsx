"use client";

import type { MediaItem } from "@admin/app/(main)/media/model/media.model";
import { MediaPickerDialog } from "@admin/components/base/MediaPickerDialog";
import { SearchEngineOptimize } from "@admin/components/blog/SearchEngineOptimize";
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
import { Textarea } from "@ecom/ui/components/textarea";
import type { Editor } from "@tiptap/react";
import { ExternalLink, Globe, ImagePlus, Info, Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

type TagStatus = "DRAFT" | "PENDING" | "PUBLISHED";

interface TagFormData {
  name: string;
  slug?: string;
  description?: string;
  status: TagStatus;
  seoTitle: string;
  seoDescription: string;
  seoImage: string;
  indexMode: string;
}

interface TagFormProps {
  mode: "create" | "edit";
  tagId?: number;
  initialData?: Partial<TagFormData> & { createdAt?: string | Date | null };
  translationMode?: string | null;
}

const STATUS_OPTIONS: { value: TagStatus; labelKey: string }[] = [
  { value: "PUBLISHED", labelKey: "status.published" },
  { value: "DRAFT", labelKey: "status.draft" },
  { value: "PENDING", labelKey: "status.pending" },
];

const PERMALINK_PREFIX = "/tag/";

function getFlagEmoji(countryCode: string): string {
  const code = countryCode.toUpperCase();
  if (code.length !== 2) return countryCode;
  const codePoints = [...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65);
  return String.fromCodePoint(...codePoints);
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: form with create/edit modes, validation, slug preview, translation mode, and conditional sidebar
export function TagForm({ mode, tagId, initialData, translationMode }: TagFormProps) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { toast } = useToast();
  const t = useTranslations("tags");
  const { data: activeLanguages } = trpc.viewer.languages.getActive.useQuery();
  const locale = useLocale();
  const bannerLangCode =
    translationMode ||
    (mode === "create" ? locale : activeLanguages?.find((l) => l.isDefault)?.code || locale);

  const [formData, setFormData] = useState<TagFormData>({
    name: initialData?.name ?? "",
    slug: initialData?.slug ?? "",
    description: initialData?.description ?? "",
    status: initialData?.status ?? "PUBLISHED",
    seoTitle: "",
    seoDescription: "",
    seoImage: "",
    indexMode: "index",
  });

  const [showEditor, setShowEditor] = useState(true);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const editorRef = useRef<Editor | null>(null);

  // tRPC query to load SEO Meta
  const { data: seoMeta } = trpc.viewer.seo.get.useQuery(
    { entityType: "tag", entityId: tagId ?? 0 },
    { enabled: mode === "edit" && !!tagId },
  );

  // Sync SEO Meta to form state
  useEffect(() => {
    if (seoMeta) {
      setFormData((prev) => ({
        ...prev,
        seoTitle: seoMeta.seoTitle ?? "",
        seoDescription: seoMeta.seoDescription ?? "",
        seoImage: seoMeta.seoImage ?? "",
        indexMode: seoMeta.indexMode ?? "index",
      }));
    }
  }, [seoMeta]);

  const saveSeoMetaMutation = trpc.viewer.seo.save.useMutation();

  const saveSeo = (targetTagId: number, callback: () => void) => {
    if (translationMode) {
      callback();
      return;
    }
    saveSeoMetaMutation.mutate(
      {
        entityType: "tag",
        entityId: targetTagId,
        data: {
          seoTitle: formData.seoTitle || undefined,
          seoDescription: formData.seoDescription || undefined,
          seoImage: formData.seoImage || undefined,
          indexMode: (formData.indexMode as "index" | "noindex") || undefined,
        },
      },
      {
        onSuccess: () => {
          callback();
        },
        onError: (err) => {
          toast(`Tag saved, but SEO failed: ${err.message}`, "error");
          callback();
        },
      },
    );
  };

  const createMutation = trpc.viewer.tags.create.useMutation({
    onSuccess: (data) => {
      saveSeo(data.id, () => {
        toast(t("createSuccess"), "success");
        utils.viewer.tags.list.invalidate();
        router.push(`/tags/${data.id}/edit`);
      });
    },
    onError: (err) => toast(err.message, "error"),
  });

  const createAndExitMutation = trpc.viewer.tags.create.useMutation({
    onSuccess: (data) => {
      saveSeo(data.id, () => {
        toast(t("createSuccess"), "success");
        utils.viewer.tags.list.invalidate();
        router.push("/tags");
      });
    },
    onError: (err) => toast(err.message, "error"),
  });

  const updateMutation = trpc.viewer.tags.update.useMutation({
    onSuccess: () => {
      if (tagId) {
        saveSeo(tagId, () => {
          toast(t("updateSuccess"), "success");
          utils.viewer.tags.list.invalidate();
          utils.viewer.tags.get.invalidate({ id: tagId });
        });
      }
    },
    onError: (err) => toast(err.message, "error"),
  });

  const updateAndExitMutation = trpc.viewer.tags.update.useMutation({
    onSuccess: () => {
      if (tagId) {
        saveSeo(tagId, () => {
          toast(t("updateSuccess"), "success");
          utils.viewer.tags.list.invalidate();
          utils.viewer.tags.get.invalidate({ id: tagId });
          router.push("/tags");
        });
      }
    },
    onError: (err) => toast(err.message, "error"),
  });

  const saveTranslationMut = trpc.viewer.translations.save.useMutation({
    onSuccess: () => {
      toast(t("updateSuccess"), "success");
      utils.viewer.translations.list.invalidate();
      utils.viewer.translations.translationStatus.invalidate();
    },
    onError: (err) => toast(err.message, "error"),
  });

  const saveTranslationAndExitMut = trpc.viewer.translations.save.useMutation({
    onSuccess: () => {
      toast(t("updateSuccess"), "success");
      utils.viewer.translations.list.invalidate();
      utils.viewer.translations.translationStatus.invalidate();
      router.push("/tags");
    },
    onError: (err) => toast(err.message, "error"),
  });

  const isPending =
    createMutation.isPending ||
    createAndExitMutation.isPending ||
    updateMutation.isPending ||
    updateAndExitMutation.isPending ||
    saveTranslationMut.isPending ||
    saveTranslationAndExitMut.isPending;

  const error =
    createMutation.error ||
    createAndExitMutation.error ||
    updateMutation.error ||
    updateAndExitMutation.error ||
    saveTranslationMut.error ||
    saveTranslationAndExitMut.error;

  function buildPayload() {
    return {
      name: formData.name,
      slug: formData.slug || undefined,
      description: formData.description || undefined,
      status: formData.status,
    };
  }

  function handleSaveAndContinue(e: React.FormEvent) {
    e.preventDefault();
    if (translationMode && tagId) {
      saveTranslationMut.mutate({
        entityType: "tag",
        entityId: tagId,
        langCode: translationMode,
        data: {
          name: formData.name,
          description: formData.description || undefined,
        },
      });
      return;
    }
    const payload = buildPayload();
    if (mode === "edit" && tagId) {
      updateMutation.mutate({ id: tagId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  function handleSave() {
    if (translationMode && tagId) {
      saveTranslationAndExitMut.mutate({
        entityType: "tag",
        entityId: tagId,
        langCode: translationMode,
        data: {
          name: formData.name,
          description: formData.description || undefined,
        },
      });
      return;
    }
    const payload = buildPayload();
    if (mode === "edit" && tagId) {
      updateAndExitMutation.mutate({ id: tagId, ...payload });
    } else {
      createAndExitMutation.mutate(payload);
    }
  }

  const handleMediaInsert = useCallback((items: MediaItem[]) => {
    const editor = editorRef.current;
    if (!editor) return;

    for (const item of items) {
      const isImage = item.mime_type?.startsWith("image/");
      const url = item.full_url || item.preview_url || "";
      if (!url) continue;

      if (isImage) {
        editor.chain().focus().setImage({ src: url, alt: item.name }).run();
      } else {
        editor
          .chain()
          .focus()
          .insertContent(
            `<a href="${url}" target="_blank" rel="noopener noreferrer">${item.name || url}</a> `,
          )
          .run();
      }
    }
  }, []);

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
    <form onSubmit={handleSaveAndContinue}>
      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-red-50 px-4 py-3 text-sm text-destructive dark:bg-red-950">
          {error.message}
        </div>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_280px]">
        {/* ── Left: Main Content ── */}
        <div className="flex flex-col gap-5">
          <Card>
            <CardContent className="flex flex-col gap-5 p-5">
              <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
                <Info className="size-4 shrink-0" />
                <span>
                  {t("editingVersion", {
                    language:
                      activeLanguages?.find((l) => l.code === bannerLangCode)?.name ??
                      bannerLangCode,
                  })}
                </span>
              </div>
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
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">{t("fields.content")}</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowEditor((prev) => !prev)}
                      className="h-8 px-3 text-xs"
                    >
                      {showEditor ? t("hideEditor") : t("showEditor")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setMediaPickerOpen(true)}
                      className="h-8 px-3 text-xs flex items-center gap-1"
                    >
                      <ImagePlus className="size-3.5" />
                      {t("addMedia")}
                    </Button>
                  </div>
                </div>

                {showEditor ? (
                  <RichTextEditor
                    id="tag-content"
                    ref={editorRef}
                    value={formData.description ?? ""}
                    onChange={(val) => setFormData((prev) => ({ ...prev, description: val }))}
                    placeholder={t("form.contentPlaceholder")}
                    minHeight={250}
                  />
                ) : (
                  <Textarea
                    id="tag-content-text"
                    value={formData.description ?? ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, description: e.target.value }))
                    }
                    placeholder={t("form.contentPlaceholder")}
                    rows={12}
                    className="min-h-[250px]"
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {!translationMode && (
            <SearchEngineOptimize
              seoTitle={formData.seoTitle}
              onChangeSeoTitle={(val) => setFormData((prev) => ({ ...prev, seoTitle: val }))}
              seoDescription={formData.seoDescription}
              onChangeSeoDescription={(val) =>
                setFormData((prev) => ({ ...prev, seoDescription: val }))
              }
              seoImage={formData.seoImage}
              onChangeSeoImage={(val) => setFormData((prev) => ({ ...prev, seoImage: val }))}
              indexMode={formData.indexMode}
              onChangeIndexMode={(val) => setFormData((prev) => ({ ...prev, indexMode: val }))}
              defaultTitle={formData.name}
              defaultUrl={`${PERMALINK_PREFIX}${slugPreview}`}
              publishDate={initialData?.createdAt ?? (mode === "create" ? new Date() : null)}
            />
          )}
        </div>

        {/* ── Right: Sidebar ── */}
        <div className="flex flex-col gap-4">
          {/* Publish */}
          <Card>
            <CardHeader className="border-b border-border px-4 py-3">
              <CardTitle className="text-sm font-semibold">{t("form.publish")}</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-2 p-4">
              <Button
                id="tag-save-continue"
                type="submit"
                disabled={isPending || !formData.name.trim()}
                size="sm"
                className="flex-1 font-semibold"
              >
                {isPending ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Save className="mr-2 size-4" />
                )}
                {t("form.saveAndContinue")}
              </Button>
              <Button
                id="tag-save"
                type="button"
                variant="outline"
                disabled={isPending || !formData.name.trim()}
                onClick={handleSave}
                size="sm"
              >
                <Save className="mr-2 size-4" />
                {t("form.save")}
              </Button>
            </CardContent>
          </Card>

          {/* Languages */}
          {mode === "edit" && tagId && (
            <Card>
              <CardHeader className="border-b border-border px-4 py-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Globe className="size-4 text-muted-foreground" />
                  {t("languages")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 flex flex-col gap-3">
                {activeLanguages?.map((lang) => {
                  const isDefault = lang.isDefault;
                  const link = isDefault
                    ? `/tags/${tagId}/edit`
                    : `/tags/${tagId}/edit?ref_lang=${lang.code}`;
                  return (
                    <div key={lang.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 font-medium">
                        {lang.flag && (
                          <span className="text-base" role="img" aria-label={lang.name}>
                            {getFlagEmoji(lang.flag)}
                          </span>
                        )}
                        <span>{lang.name}</span>
                        {lang.code === translationMode && (
                          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            editing
                          </span>
                        )}
                        {lang.isDefault && !translationMode && (
                          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            editing
                          </span>
                        )}
                      </div>
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary transition-colors animate-pulse-subtle"
                      >
                        <ExternalLink className="size-3.5" />
                      </a>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Status */}
          {!translationMode && (
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
          )}
        </div>
      </div>

      <MediaPickerDialog
        open={mediaPickerOpen}
        onOpenChange={setMediaPickerOpen}
        onInsert={handleMediaInsert}
      />
    </form>
  );
}
