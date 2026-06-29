"use client";

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
import { cn } from "@ecom/ui/lib/utils";
import { ExternalLink, Globe, ImageIcon, Info, Loader2, Save, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

const PERMALINK_PREFIX = "/";

type PageStatus = "DRAFT" | "PENDING" | "PUBLISHED" | "ARCHIVED";

interface PageFormData {
  title: string;
  slug?: string;
  content?: string;
  excerpt?: string;
  featuredImage?: string;
  bannerImage?: string;
  heroBanner?: string;
  template: string;
  order: number;
  parentId?: number | null;
  status: PageStatus;
  seoTitle: string;
  seoDescription: string;
  seoImage: string;
  indexMode: string;
  // Custom columns
  layout: string;
  hideTitle: boolean;
  hideBreadcrumb: boolean;
  hideSidebar: boolean;
  hideFooter: boolean;
  gallery: string[];
  subtitle: string;
  ctaText: string;
  ctaLink: string;
}

interface PageFormProps {
  mode: "create" | "edit";
  pageId?: number;
  initialData?: Partial<PageFormData> & { createdAt?: string | Date | null };
  translationMode?: string | null;
  originLangCode?: string;
}

const STATUS_OPTIONS: { value: PageStatus; label: string }[] = [
  { value: "PUBLISHED", label: "Published" },
  { value: "DRAFT", label: "Draft" },
  { value: "PENDING", label: "Pending" },
];

const TEMPLATE_OPTIONS = [
  { value: "default", label: "Default" },
  { value: "no-sidebar", label: "No sidebar" },
];

function getFlagEmoji(countryCode: string): string {
  const code = countryCode.toUpperCase();
  if (code.length !== 2) return countryCode;
  const codePoints = [...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65);
  return String.fromCodePoint(...codePoints);
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: handles complex form lifecycle, media pickers, and SEO/translations
export function PageForm({
  mode,
  pageId,
  initialData,
  translationMode,
  originLangCode,
}: PageFormProps) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { toast } = useToast();
  const tPage = useTranslations("pages");
  const t = useTranslations("common");
  const locale = useLocale();

  const { data: activeLanguages } = trpc.viewer.languages.getActive.useQuery();

  const bannerLangCode =
    translationMode ||
    (mode === "create"
      ? activeLanguages?.find((l) => l.locale === locale)?.code || locale
      : originLangCode || activeLanguages?.find((l) => l.isDefault)?.code || locale);

  const activeLanguageName =
    activeLanguages?.find((l) => l.code === bannerLangCode)?.name ?? bannerLangCode;

  const [formData, setFormData] = useState<PageFormData>({
    title: initialData?.title ?? "",
    slug: initialData?.slug ?? "",
    content: initialData?.content ?? "",
    excerpt: initialData?.excerpt ?? "",
    featuredImage: initialData?.featuredImage ?? "",
    bannerImage: initialData?.bannerImage ?? "",
    heroBanner: initialData?.heroBanner ?? "",
    template: initialData?.template ?? "default",
    order: initialData?.order ?? 0,
    parentId: initialData?.parentId ?? null,
    status: initialData?.status ?? "DRAFT",
    seoTitle: "",
    seoDescription: "",
    seoImage: "",
    indexMode: "index",
    layout: initialData?.layout ?? "default",
    hideTitle: initialData?.hideTitle ?? false,
    hideBreadcrumb: initialData?.hideBreadcrumb ?? false,
    hideSidebar: initialData?.hideSidebar ?? false,
    hideFooter: initialData?.hideFooter ?? false,
    gallery: initialData?.gallery ?? [],
    subtitle: initialData?.subtitle ?? "",
    ctaText: initialData?.ctaText ?? "",
    ctaLink: initialData?.ctaLink ?? "",
  });

  const [origin, setOrigin] = useState("http://127.0.0.1:8000");
  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const [showEditor, setShowEditor] = useState(true);
  const [seoOpen, setSeoOpen] = useState(false);
  const [mediaPickerTarget, setMediaPickerTarget] = useState<
    "featured" | "banner" | "hero" | "gallery" | "seo" | null
  >(null);

  const { data: seoMeta } = trpc.viewer.seo.get.useQuery(
    { entityType: "page", entityId: pageId ?? 0 },
    { enabled: mode === "edit" && !!pageId },
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

  const saveSeo = (targetPageId: number, callback: () => void) => {
    if (translationMode) {
      callback();
      return;
    }
    saveSeoMetaMutation.mutate(
      {
        entityType: "page",
        entityId: targetPageId,
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
          toast(`Page saved, but SEO failed: ${err.message}`, "error");
          callback();
        },
      },
    );
  };

  const createMutation = trpc.viewer.pages.create.useMutation({
    onSuccess: (data) => {
      saveSeo(data.id, () => {
        toast(tPage("createSuccess"), "success");
        utils.viewer.pages.list.invalidate();
        router.push(`/pages/${data.id}/edit`);
      });
    },
    onError: (err) => toast(err.message, "error"),
  });

  const createAndExitMutation = trpc.viewer.pages.create.useMutation({
    onSuccess: (data) => {
      saveSeo(data.id, () => {
        toast(tPage("createSuccess"), "success");
        utils.viewer.pages.list.invalidate();
        router.push("/pages");
      });
    },
    onError: (err) => toast(err.message, "error"),
  });

  const updateMutation = trpc.viewer.pages.update.useMutation({
    onSuccess: () => {
      if (pageId) {
        saveSeo(pageId, () => {
          toast(tPage("updateSuccess"), "success");
          utils.viewer.pages.list.invalidate();
          utils.viewer.pages.get.invalidate({ id: pageId });
          utils.viewer.translations.translationStatus.invalidate();
          utils.viewer.translations.batchTranslationStatus.invalidate();
        });
      }
    },
    onError: (err) => toast(err.message, "error"),
  });

  const updateAndExitMutation = trpc.viewer.pages.update.useMutation({
    onSuccess: () => {
      if (pageId) {
        saveSeo(pageId, () => {
          toast(tPage("updateSuccess"), "success");
          utils.viewer.pages.list.invalidate();
          utils.viewer.pages.get.invalidate({ id: pageId });
          utils.viewer.translations.translationStatus.invalidate();
          utils.viewer.translations.batchTranslationStatus.invalidate();
          router.push("/pages");
        });
      }
    },
    onError: (err) => toast(err.message, "error"),
  });

  const saveTranslationMut = trpc.viewer.translations.save.useMutation({
    onSuccess: () => {
      toast(tPage("updateSuccess"), "success");
      utils.viewer.translations.list.invalidate();
      utils.viewer.translations.translationStatus.invalidate();
      utils.viewer.translations.batchTranslationStatus.invalidate();
    },
    onError: (err) => toast(err.message, "error"),
  });

  const saveTranslationAndExitMut = trpc.viewer.translations.save.useMutation({
    onSuccess: () => {
      toast(tPage("updateSuccess"), "success");
      utils.viewer.translations.list.invalidate();
      utils.viewer.translations.translationStatus.invalidate();
      utils.viewer.translations.batchTranslationStatus.invalidate();
      router.push("/pages");
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
    formData.title
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
      title: formData.title,
      slug: formData.slug || undefined,
      content: formData.content || undefined,
      excerpt: formData.excerpt || undefined,
      featuredImage: formData.featuredImage || undefined,
      bannerImage: formData.bannerImage || undefined,
      heroBanner: formData.heroBanner || undefined,
      template: formData.template,
      order: Number(formData.order),
      parentId: formData.parentId ?? undefined,
      status: formData.status,
      layout: formData.layout,
      hideTitle: formData.hideTitle,
      hideBreadcrumb: formData.hideBreadcrumb,
      hideSidebar: formData.hideSidebar,
      hideFooter: formData.hideFooter,
      gallery: formData.gallery,
      subtitle: formData.subtitle || undefined,
      ctaText: formData.ctaText || undefined,
      ctaLink: formData.ctaLink || undefined,
    };
  }

  function handleSaveAndContinue(e: React.FormEvent) {
    e.preventDefault();
    if (translationMode && pageId) {
      saveTranslationMut.mutate({
        entityType: "page",
        entityId: pageId,
        langCode: translationMode,
        data: {
          title: formData.title,
          slug: formData.slug || undefined,
          content: formData.content || undefined,
          excerpt: formData.excerpt || undefined,
          subtitle: formData.subtitle || undefined,
          ctaText: formData.ctaText || undefined,
          ctaLink: formData.ctaLink || undefined,
        },
      });
      return;
    }
    const payload = buildPayload();
    if (mode === "edit" && pageId) {
      updateMutation.mutate({ id: pageId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  function handleSave() {
    if (translationMode && pageId) {
      saveTranslationAndExitMut.mutate({
        entityType: "page",
        entityId: pageId,
        langCode: translationMode,
        data: {
          title: formData.title,
          slug: formData.slug || undefined,
          content: formData.content || undefined,
          excerpt: formData.excerpt || undefined,
          subtitle: formData.subtitle || undefined,
          ctaText: formData.ctaText || undefined,
          ctaLink: formData.ctaLink || undefined,
        },
      });
      return;
    }
    const payload = buildPayload();
    if (mode === "edit" && pageId) {
      updateAndExitMutation.mutate({ id: pageId, ...payload });
    } else {
      createAndExitMutation.mutate(payload);
    }
  }

  const handleAddFromUrl = (target: "featured" | "banner" | "hero") => {
    const url = prompt("Enter image URL:");
    if (url) {
      if (target === "featured") setFormData((p) => ({ ...p, featuredImage: url }));
      if (target === "banner") setFormData((p) => ({ ...p, bannerImage: url }));
      if (target === "hero") setFormData((p) => ({ ...p, heroBanner: url }));
    }
  };

  const renderImagePicker = (
    label: string,
    value: string | undefined,
    target: "featured" | "banner" | "hero",
    description?: string,
  ) => {
    return (
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => setMediaPickerTarget(target)}
          className="w-full text-left group relative border border-dashed border-input rounded-md flex flex-col items-center justify-center bg-muted/5 h-36 overflow-hidden transition-all hover:bg-muted/10 cursor-pointer"
        >
          {value ? (
            <>
              <Image src={value} alt={label} fill className="object-cover" unoptimized />
              <Button
                type="button"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  if (target === "featured") setFormData((p) => ({ ...p, featuredImage: "" }));
                  if (target === "banner") setFormData((p) => ({ ...p, bannerImage: "" }));
                  if (target === "hero") setFormData((p) => ({ ...p, heroBanner: "" }));
                }}
                className="absolute top-2 right-2 bg-background/90 hover:bg-background rounded-full p-1 shadow-sm h-7 w-7 flex items-center justify-center cursor-pointer z-10 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center p-4 text-muted-foreground/60 w-full">
              <ImageIcon className="size-10 stroke-1 mb-2 mx-auto" />
              <span className="text-xs text-center block">No image selected</span>
            </div>
          )}
        </button>
        <div className="flex items-center justify-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setMediaPickerTarget(target)}
            className="text-primary hover:underline font-semibold"
          >
            Choose image
          </button>
          <span className="text-muted-foreground/55">or</span>
          <button
            type="button"
            onClick={() => handleAddFromUrl(target)}
            className="text-primary hover:underline font-semibold"
          >
            Add from URL
          </button>
        </div>
        {description && <p className="text-xs text-muted-foreground/80 mt-1">{description}</p>}
      </div>
    );
  };

  return (
    <form onSubmit={handleSaveAndContinue} className="flex flex-col gap-6">
      {error && (
        <div className="rounded-md border border-destructive/30 bg-red-50 px-4 py-3 text-sm text-destructive dark:bg-red-950">
          {error.message}
        </div>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_280px]">
        {/* Main Column */}
        <div className="flex flex-col gap-5">
          <Card>
            <CardContent className="flex flex-col gap-5 p-5">
              <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
                <Info className="size-4 shrink-0" />
                <span>
                  {tPage("editingVersion", {
                    language: activeLanguageName,
                  })}
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <Label htmlFor="page-title">
                    {tPage("fields.title")} <span className="text-destructive">*</span>
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    ({formData.title.length}/120)
                  </span>
                </div>
                <Input
                  id="page-title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, title: e.target.value.slice(0, 120) }))
                  }
                  placeholder="Name"
                  required
                  maxLength={120}
                />
              </div>

              {/* Permalink / Slug */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="page-slug" className="text-sm font-semibold">
                  {tPage("fields.slug")} <span className="text-destructive">*</span>
                </Label>
                <div className="flex items-center rounded-md border border-input bg-background focus-within:ring-1 focus-within:ring-ring">
                  <span className="select-none px-3 text-sm text-muted-foreground bg-muted border-r border-input py-2 rounded-l-md">
                    {origin}/
                  </span>
                  <input
                    id="page-slug"
                    className="flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
                    value={formData.slug}
                    onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                    placeholder="slug"
                    required
                  />
                </div>
                {slugPreview && (
                  <p className="text-xs text-muted-foreground">
                    Preview:{" "}
                    <a
                      href={`${origin}/${slugPreview}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline font-medium"
                    >
                      {origin}/{slugPreview}
                    </a>
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="page-excerpt">Description</Label>
                <Textarea
                  id="page-excerpt"
                  value={formData.excerpt}
                  onChange={(e) => setFormData((prev) => ({ ...prev, excerpt: e.target.value }))}
                  placeholder="Short description"
                  rows={3}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="page-content">{tPage("fields.content")}</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowEditor(!showEditor)}
                      className="h-8 px-3 text-xs"
                    >
                      {showEditor ? "Show HTML" : "Show Visual Editor"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setMediaPickerTarget("gallery")}
                      className="h-8 px-3 text-xs"
                    >
                      Add media
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="h-8 px-3 text-xs">
                      UI Blocks
                    </Button>
                  </div>
                </div>
                {showEditor ? (
                  <RichTextEditor
                    id="page-content"
                    value={formData.content}
                    onChange={(val) => setFormData((prev) => ({ ...prev, content: val }))}
                    placeholder="Write page content here..."
                    minHeight={350}
                  />
                ) : (
                  <Textarea
                    id="page-content-text"
                    value={formData.content}
                    onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
                    placeholder="Write HTML content here..."
                    rows={15}
                    className="min-h-[350px]"
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Page Custom Fields */}
          <Card>
            <CardHeader className="border-b border-border px-5 py-4">
              <CardTitle className="text-base font-semibold">Page Custom Fields</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-5 p-6">
              <div className="flex flex-col gap-1.5">
                <Label>Hero Banner</Label>
                <div className="max-w-[280px]">
                  {renderImagePicker(
                    "Hero Banner",
                    formData.heroBanner,
                    "hero",
                    "Upload a hero banner image for this page",
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="page-subtitle">Page Subtitle</Label>
                <Input
                  id="page-subtitle"
                  value={formData.subtitle}
                  onChange={(e) => setFormData((prev) => ({ ...prev, subtitle: e.target.value }))}
                  placeholder="Enter page subtitle"
                />
                <p className="text-xs text-muted-foreground">
                  Add a subtitle or tagline for this page
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="page-cta-text">Call to Action</Label>
                <Input
                  id="page-cta-text"
                  value={formData.ctaText}
                  onChange={(e) => setFormData((prev) => ({ ...prev, ctaText: e.target.value }))}
                  placeholder="Learn More"
                />
                <p className="text-xs text-muted-foreground">Call to action button text</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="page-cta-link">CTA Link</Label>
                <Input
                  id="page-cta-link"
                  value={formData.ctaLink}
                  onChange={(e) => setFormData((prev) => ({ ...prev, ctaLink: e.target.value }))}
                  placeholder="https://example.com/contact"
                />
                <p className="text-xs text-muted-foreground">URL for the call to action button</p>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="font-semibold">Page Layout</Label>
                <div className="flex flex-col gap-2 mt-1">
                  {[
                    { value: "default", label: "Default Layout" },
                    { value: "left-sidebar", label: "Left Sidebar" },
                    { value: "right-sidebar", label: "Right Sidebar" },
                    { value: "full-width", label: "Full Width" },
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none"
                    >
                      <input
                        type="radio"
                        name="page-layout"
                        value={opt.value}
                        checked={formData.layout === opt.value}
                        onChange={() => setFormData((prev) => ({ ...prev, layout: opt.value }))}
                        className="size-4 border-input text-primary focus:ring-primary"
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Select the page layout</p>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="font-semibold">Page Settings</Label>
                <div className="flex flex-col gap-2 mt-1">
                  {[
                    { key: "hideTitle", label: "Hide page title" },
                    { key: "hideBreadcrumb", label: "Hide breadcrumb" },
                    { key: "hideSidebar", label: "Hide sidebar" },
                    { key: "hideFooter", label: "Hide footer" },
                  ].map((opt) => (
                    <label
                      key={opt.key}
                      className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={
                          formData[
                            opt.key as "hideTitle" | "hideBreadcrumb" | "hideSidebar" | "hideFooter"
                          ]
                        }
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, [opt.key]: e.target.checked }))
                        }
                        className="size-4 rounded border-input text-primary focus:ring-primary"
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Select page display options</p>
              </div>
            </CardContent>
          </Card>

          {/* Gallery Images */}
          <Card>
            <CardHeader className="border-b border-border px-5 py-4">
              <CardTitle className="text-base font-semibold">Gallery Images</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMediaPickerTarget("gallery")}
              >
                Select images
              </Button>
              {formData.gallery.length > 0 && (
                <div className="grid grid-cols-4 gap-4 mt-4">
                  {formData.gallery.map((url, index) => (
                    <div
                      // biome-ignore lint/suspicious/noArrayIndexKey: order is stable and keys are unique with URL prefix
                      key={`${url}-${index}`}
                      className="relative group aspect-square rounded-md border border-border overflow-hidden bg-muted"
                    >
                      <Image
                        src={url}
                        alt={`Gallery image ${index + 1}`}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            gallery: prev.gallery.filter((_, i) => i !== index),
                          }));
                        }}
                        className="absolute top-1 right-1 bg-background/90 hover:bg-background rounded-full p-1 shadow-sm h-6 w-6 flex items-center justify-center cursor-pointer z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="size-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Search Engine Optimize */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between border-b border-border px-5 py-4">
              <CardTitle className="text-base font-semibold">Search Engine Optimize</CardTitle>
              <button
                type="button"
                onClick={() => setSeoOpen(!seoOpen)}
                className="text-sm font-semibold text-primary hover:underline"
              >
                {seoOpen ? "Hide SEO meta" : "Edit SEO meta"}
              </button>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-4">
                Setup meta title & description to make your site easy to discovered on search
                engines such as Google
              </p>
              {seoOpen && (
                <div className="border-t border-border pt-4">
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
                    onChangeIndexMode={(val) =>
                      setFormData((prev) => ({ ...prev, indexMode: val }))
                    }
                    defaultTitle={formData.title}
                    defaultUrl={`${PERMALINK_PREFIX}${slugPreview}`}
                    publishDate={initialData?.createdAt ?? (mode === "create" ? new Date() : null)}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Column */}
        <div className="flex flex-col gap-5">
          {/* Action Card */}
          <Card>
            <CardHeader className="border-b border-border px-4 py-3">
              <CardTitle className="text-sm font-semibold">{tPage("form.publish")}</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-2 p-4">
              <Button
                id="page-save-continue"
                type="submit"
                disabled={isPending || !formData.title.trim()}
                size="sm"
                className="flex-1 font-semibold bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isPending ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Save className="mr-2 size-4" />
                )}
                {t("saveAndEdit")}
              </Button>
              <Button
                id="page-save"
                type="button"
                variant="outline"
                disabled={isPending || !formData.title.trim()}
                onClick={handleSave}
                size="sm"
                className="font-semibold"
              >
                <Save className="mr-2 size-4" />
                {t("save")}
              </Button>
            </CardContent>
          </Card>

          {/* Languages card */}
          {mode === "edit" && pageId && (
            <Card>
              <CardHeader className="border-b border-border px-4 py-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Globe className="size-4 text-muted-foreground" />
                  {tPage("languages")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 flex flex-col gap-3">
                {activeLanguages?.map((lang) => {
                  const link =
                    lang.locale === locale
                      ? `/pages/${pageId}/edit`
                      : `/pages/${pageId}/edit?ref_lang=${lang.code}`;
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

          {/* Status */}
          <Card>
            <CardHeader className="border-b border-border px-4 py-3">
              <CardTitle className="text-sm font-semibold">
                Status <span className="text-destructive">*</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <Select
                value={formData.status}
                onValueChange={(v) => setFormData((prev) => ({ ...prev, status: v as PageStatus }))}
              >
                <SelectTrigger id="page-status">
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
            </CardContent>
          </Card>

          {/* Template */}
          <Card>
            <CardHeader className="border-b border-border px-4 py-3">
              <CardTitle className="text-sm font-semibold">
                Template <span className="text-destructive">*</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <Select
                value={formData.template}
                onValueChange={(v) => setFormData((prev) => ({ ...prev, template: v }))}
              >
                <SelectTrigger id="page-template">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Featured Image */}
          {!translationMode && (
            <Card>
              <CardHeader className="border-b border-border px-4 py-3">
                <CardTitle className="text-sm font-semibold">Image</CardTitle>
              </CardHeader>
              <CardContent className="p-4 flex flex-col gap-3">
                {renderImagePicker("Featured Image", formData.featuredImage, "featured")}
              </CardContent>
            </Card>
          )}

          {/* Banner Image */}
          {!translationMode && (
            <Card>
              <CardHeader className="border-b border-border px-4 py-3">
                <CardTitle className="text-sm font-semibold">Banner image (1920×170px)</CardTitle>
              </CardHeader>
              <CardContent className="p-4 flex flex-col gap-3">
                {renderImagePicker("Banner Image", formData.bannerImage, "banner")}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <MediaPickerDialog
        open={mediaPickerTarget !== null}
        onOpenChange={(open) => !open && setMediaPickerTarget(null)}
        // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: handles multiple media targets cleanly
        onInsert={(items) => {
          if (items.length > 0) {
            if (mediaPickerTarget === "gallery") {
              const urls = items
                .map((item) => item.full_url || item.preview_url || "")
                .filter(Boolean);
              setFormData((prev) => ({
                ...prev,
                gallery: [...prev.gallery, ...urls],
              }));
            } else {
              const url = items[0].full_url || items[0].preview_url || "";
              if (mediaPickerTarget === "featured") {
                setFormData((prev) => ({ ...prev, featuredImage: url }));
              } else if (mediaPickerTarget === "banner") {
                setFormData((prev) => ({ ...prev, bannerImage: url }));
              } else if (mediaPickerTarget === "hero") {
                setFormData((prev) => ({ ...prev, heroBanner: url }));
              } else if (mediaPickerTarget === "seo") {
                setFormData((prev) => ({ ...prev, seoImage: url }));
              }
            }
          }
          setMediaPickerTarget(null);
        }}
      />
    </form>
  );
}
