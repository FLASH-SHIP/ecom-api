"use client";

import { StickyPublishBar } from "@admin/components/layout/StickyPublishBar";
import { SearchEngineOptimize } from "@admin/components/blog/SearchEngineOptimize";
import { useToast } from "@admin/components/toast-provider";
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
import { Switch } from "@ecom/ui/components/switch";
import { Textarea } from "@ecom/ui/components/textarea";
import { cn } from "@ecom/ui/lib/utils";
import { ExternalLink, Globe, Info, Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useMemo, useRef, useState, useEffect } from "react";

const PERMALINK_PREFIX = "/category/";

type CategoryStatus = "DRAFT" | "PENDING" | "PUBLISHED" | "ARCHIVED";

interface CategoryFormData {
  name: string;
  slug?: string;
  description?: string;
  icon?: string;
  status: CategoryStatus;
  isFeatured: boolean;
  isDefault: boolean;
  parentId?: number | null;
  order: number;
  seoTitle: string;
  seoDescription: string;
  seoImage: string;
  indexMode: string;
}

interface CategoryFormProps {
  mode: "create" | "edit";
  categoryId?: number;
  initialData?: Partial<CategoryFormData> & { createdAt?: string | Date | null };
  translationMode?: string | null;
  originLangCode?: string;
}

const STATUS_OPTIONS: { value: CategoryStatus; label: string }[] = [
  { value: "PUBLISHED", label: "Published" },
  { value: "DRAFT", label: "Draft" },
  { value: "ARCHIVED", label: "Archived" },
];

// Module-level function for stable useMemo deps — categoryId is passed explicitly to exclude self
type TreeItem = { id: number; name: string; children?: TreeItem[] };
function flattenCategories(
  cats: TreeItem[] | undefined,
  excludeId: number | undefined,
  depth = 0,
): { id: number; name: string; depth: number }[] {
  if (!cats) return [];
  return cats.flatMap((cat) => [
    ...(cat.id === excludeId ? [] : [{ id: cat.id, name: cat.name, depth }]),
    ...flattenCategories(cat.children, excludeId, depth + 1),
  ]);
}

function getFlagEmoji(countryCode: string): string {
  const code = countryCode.toUpperCase();
  if (code.length !== 2) return countryCode;
  const codePoints = [...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65);
  return String.fromCodePoint(...codePoints);
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: rich editor form with create/edit modes, validation, image upload, and i18n fields
export function CategoryForm({
  mode,
  categoryId,
  initialData,
  translationMode,
  originLangCode,
}: CategoryFormProps) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { toast } = useToast();
  const t = useTranslations("common");
  const publishCardRef = useRef<HTMLDivElement>(null);
  const tCat = useTranslations("categories");
  const locale = useLocale();

  const { data: activeLanguages } = trpc.viewer.languages.getActive.useQuery();

  const bannerLangCode =
    translationMode ||
    (mode === "create"
      ? activeLanguages?.find((l) => l.locale === locale)?.code || locale
      : originLangCode || activeLanguages?.find((l) => l.isDefault)?.code || locale);

  const activeLanguageName =
    activeLanguages?.find((l) => l.code === bannerLangCode)?.name ?? bannerLangCode;

  const [formData, setFormData] = useState<CategoryFormData>({
    name: initialData?.name ?? "",
    slug: initialData?.slug ?? "",
    description: initialData?.description ?? "",
    icon: initialData?.icon ?? "",
    status: initialData?.status ?? "PUBLISHED",
    isFeatured: initialData?.isFeatured ?? false,
    isDefault: initialData?.isDefault ?? false,
    parentId: initialData?.parentId ?? null,
    order: initialData?.order ?? 0,
    seoTitle: "",
    seoDescription: "",
    seoImage: "",
    indexMode: "index",
  });

  const { data: categories } = trpc.viewer.categories.tree.useQuery();

  // tRPC query to load SEO Meta
  const { data: seoMeta } = trpc.viewer.seo.get.useQuery(
    { entityType: "category", entityId: categoryId ?? 0 },
    { enabled: mode === "edit" && !!categoryId },
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

  const saveSeo = (targetCategoryId: number, callback: () => void) => {
    if (translationMode) {
      callback();
      return;
    }
    saveSeoMetaMutation.mutate(
      {
        entityType: "category",
        entityId: targetCategoryId,
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
          toast(`Category saved, but SEO failed: ${err.message}`, "error");
          callback();
        },
      },
    );
  };

  const createMutation = trpc.viewer.categories.create.useMutation({
    onSuccess: (data) => {
      saveSeo(data.id, () => {
        toast(tCat("createSuccess"), "success");
        utils.viewer.categories.list.invalidate();
        utils.viewer.categories.tree.invalidate();
        router.push(`/categories/${data.id}/edit`);
      });
    },
    onError: (err) => toast(err.message, "error"),
  });

  const createAndExitMutation = trpc.viewer.categories.create.useMutation({
    onSuccess: (data) => {
      saveSeo(data.id, () => {
        toast(tCat("createSuccess"), "success");
        utils.viewer.categories.list.invalidate();
        utils.viewer.categories.tree.invalidate();
        router.push("/categories");
      });
    },
    onError: (err) => toast(err.message, "error"),
  });

  const updateMutation = trpc.viewer.categories.update.useMutation({
    onSuccess: () => {
      if (categoryId) {
        saveSeo(categoryId, () => {
          toast(tCat("updateSuccess"), "success");
          utils.viewer.categories.list.invalidate();
          utils.viewer.categories.tree.invalidate();
          utils.viewer.categories.get.invalidate({ id: categoryId });
          utils.viewer.translations.translationStatus.invalidate();
          utils.viewer.translations.batchTranslationStatus.invalidate();
        });
      }
    },
    onError: (err) => toast(err.message, "error"),
  });

  const updateAndExitMutation = trpc.viewer.categories.update.useMutation({
    onSuccess: () => {
      if (categoryId) {
        saveSeo(categoryId, () => {
          toast(tCat("updateSuccess"), "success");
          utils.viewer.categories.list.invalidate();
          utils.viewer.categories.tree.invalidate();
          utils.viewer.categories.get.invalidate({ id: categoryId });
          utils.viewer.translations.translationStatus.invalidate();
          utils.viewer.translations.batchTranslationStatus.invalidate();
          router.push("/categories");
        });
      }
    },
    onError: (err) => toast(err.message, "error"),
  });

  const saveTranslationMut = trpc.viewer.translations.save.useMutation({
    onSuccess: () => {
      toast(tCat("updateSuccess"), "success");
      utils.viewer.translations.list.invalidate();
      utils.viewer.translations.translationStatus.invalidate();
      utils.viewer.translations.batchTranslationStatus.invalidate();
    },
    onError: (err) => toast(err.message, "error"),
  });

  const saveTranslationAndExitMut = trpc.viewer.translations.save.useMutation({
    onSuccess: () => {
      toast(tCat("updateSuccess"), "success");
      utils.viewer.translations.list.invalidate();
      utils.viewer.translations.translationStatus.invalidate();
      utils.viewer.translations.batchTranslationStatus.invalidate();
      router.push("/categories");
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

  function buildPayload() {
    return {
      name: formData.name,
      slug: formData.slug || undefined,
      description: formData.description || undefined,
      icon: formData.icon || undefined,
      status: formData.status,
      isFeatured: formData.isFeatured ? 1 : 0,
      isDefault: formData.isDefault ? 1 : 0,
      parentId: formData.parentId ?? undefined,
      order: formData.order,
    };
  }

  function handleSaveAndContinue(e: React.FormEvent) {
    e.preventDefault();
    if (translationMode && categoryId) {
      saveTranslationMut.mutate({
        entityType: "category",
        entityId: categoryId,
        langCode: translationMode,
        data: {
          name: formData.name,
          description: formData.description || undefined,
        },
      });
      return;
    }
    const payload = buildPayload();
    if (mode === "edit" && categoryId) {
      updateMutation.mutate({ id: categoryId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  function handleSave() {
    if (translationMode && categoryId) {
      saveTranslationAndExitMut.mutate({
        entityType: "category",
        entityId: categoryId,
        langCode: translationMode,
        data: {
          name: formData.name,
          description: formData.description || undefined,
        },
      });
      return;
    }
    const payload = buildPayload();
    if (mode === "edit" && categoryId) {
      updateAndExitMutation.mutate({ id: categoryId, ...payload });
    } else {
      createAndExitMutation.mutate(payload);
    }
  }

  // Memoize tree traversal — avoids re-running recursive flatten on every render
  // flattenCategories is defined outside the component, so deps are stable
  const flatCategories = useMemo(
    () => flattenCategories(categories, categoryId),
    [categories, categoryId],
  );

  return (
    <form onSubmit={handleSaveAndContinue} className="flex flex-col gap-6">
      {!translationMode && (
        <StickyPublishBar
          publishCardRef={publishCardRef}
          title={formData.name}
          label={mode === "create" ? "Tạo danh mục" : "Sửa danh mục"}
          isPending={isPending}
          onSave={() => {}}
          saveLabel={isPending ? "Đang lưu..." : mode === "create" ? "Tạo danh mục" : "Cập nhật"}
        />
      )}
      {error && (
        <div className="rounded-md border border-destructive/30 bg-red-50 px-4 py-3 text-sm text-destructive dark:bg-red-950">
          {error.message}
        </div>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_280px]">
        {/* Main */}
        <div className="flex flex-col gap-5">
          <Card>
            <CardContent className="flex flex-col gap-5 p-5">
              <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
                <Info className="size-4 shrink-0" />
                <span>
                  {tCat("editingVersion", {
                    language: activeLanguageName,
                  })}
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cat-name">Name</Label>
                <Input
                  id="cat-name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Category name"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cat-slug">
                  Slug{" "}
                  <span className="text-xs text-muted-foreground">(auto-generated if empty)</span>
                </Label>
                <Input
                  id="cat-slug"
                  value={formData.slug}
                  onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                  placeholder="custom-slug"
                />
                {slugPreview && (
                  <p className="text-xs text-muted-foreground">
                    {tCat("form.permalinkPreview")}{" "}
                    <span className="text-primary">
                      {PERMALINK_PREFIX}
                      {slugPreview}
                    </span>
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cat-description">Description</Label>
                <Textarea
                  id="cat-description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Category description..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="cat-icon">Icon (emoji)</Label>
                  <Input
                    id="cat-icon"
                    value={formData.icon}
                    onChange={(e) => setFormData((prev) => ({ ...prev, icon: e.target.value }))}
                    placeholder="📁"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="cat-order">Order</Label>
                  <Input
                    id="cat-order"
                    type="number"
                    min={0}
                    value={formData.order}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, order: Number(e.target.value) }))
                    }
                  />
                </div>
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

        {/* Sidebar */}
        <div className="flex flex-col gap-5">
          {/* Publish */}
          <Card>
            <CardHeader className="border-b border-border px-4 py-3">
              <CardTitle className="text-sm font-semibold">{tCat("form.publish")}</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-2 p-4">
              <Button
                id="cat-save-continue"
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
                {tCat("form.saveAndContinue")}
              </Button>
              <Button
                id="cat-save"
                type="button"
                variant="outline"
                disabled={isPending || !formData.name.trim()}
                onClick={handleSave}
                size="sm"
              >
                <Save className="mr-2 size-4" />
                {tCat("form.save")}
              </Button>
            </CardContent>
          </Card>

          {/* Languages */}
          {mode === "edit" && categoryId && (
            <Card>
              <CardHeader className="border-b border-border px-4 py-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Globe className="size-4 text-muted-foreground" />
                  {tCat("languages")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 flex flex-col gap-3">
                {activeLanguages?.map((lang) => {
                  const link =
                    lang.locale === locale
                      ? `/categories/${categoryId}/edit`
                      : `/categories/${categoryId}/edit?ref_lang=${lang.code}`;
                  const isCurrent =
                    (translationMode && lang.code === translationMode) ||
                    (!translationMode && lang.code === originLangCode);
                  return (
                    <a
                      key={lang.id}
                      href={link}
                      target={isCurrent ? undefined : "_blank"}
                      rel={isCurrent ? undefined : "noopener noreferrer"}
                      className={cn(
                        "flex items-center justify-between text-sm p-2 rounded-md transition-colors border border-transparent",
                        isCurrent
                          ? "bg-primary/5 text-primary font-semibold border-primary/10"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {lang.flag && (
                          <span className="text-base" role="img" aria-label={lang.name}>
                            {getFlagEmoji(lang.flag)}
                          </span>
                        )}
                        <span>{lang.name}</span>
                        {isCurrent && (
                          <span className="text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded font-normal">
                            editing
                          </span>
                        )}
                      </div>
                      <ExternalLink className="size-3.5 opacity-60" />
                    </a>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Settings — hidden in translation mode */}
          {!translationMode && (
            <Card>
              <CardHeader className="border-b border-border px-4 py-3">
                <CardTitle className="text-sm font-semibold">Settings</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 p-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="cat-status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(v) =>
                      setFormData((prev) => ({ ...prev, status: v as CategoryStatus }))
                    }
                  >
                    <SelectTrigger id="cat-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cat-parent">Parent Category</Label>
                <Select
                  value={formData.parentId?.toString() ?? ""}
                  onValueChange={(v) =>
                    setFormData((prev) => ({
                      ...prev,
                      parentId: v ? Number(v) : null,
                    }))
                  }
                >
                  <SelectTrigger id="cat-parent">
                    <SelectValue placeholder="None (Root)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None (Root)</SelectItem>
                    {flatCategories.map((cat) => (
                      <SelectItem key={cat.id} value={String(cat.id)}>
                        {"—".repeat(cat.depth)} {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="cat-featured" className="cursor-pointer text-sm">
                    Featured category
                  </Label>
                  <Switch
                    id="cat-featured"
                    checked={formData.isFeatured}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, isFeatured: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="cat-default" className="cursor-pointer text-sm">
                    Default category
                  </Label>
                  <Switch
                    id="cat-default"
                    checked={formData.isDefault}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, isDefault: checked }))
                    }
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </form>
  );
}
