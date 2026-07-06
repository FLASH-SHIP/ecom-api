"use client";

import { MediaPickerDialog } from "@admin/components/base/MediaPickerDialog";
import { SearchEngineOptimize } from "@admin/components/blog/SearchEngineOptimize";
import { CustomFieldsPanel } from "@admin/components/custom-fields/CustomFieldsPanel";
import { StickyPublishBar } from "@admin/components/layout/StickyPublishBar";
import { useToast } from "@admin/components/toast-provider";
import { RichTextEditor } from "@admin/components/ui/RichTextEditor";
import { trpc } from "@admin/lib/trpc";
import useUser from "@auth/useUser";
import { Badge } from "@ecom/ui/components/badge";
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
import type { Editor } from "@tiptap/react";
import {
  AlertCircle,
  ExternalLink,
  Eye,
  Globe,
  ImageIcon,
  Info,
  Loader2,
  Save,
  Search,
  Tag as TagIcon,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";

type PostStatus = "DRAFT" | "PENDING" | "PUBLISHED" | "ARCHIVED";

interface PostFormData {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  featuredImage: string;
  bannerImage: string;
  status: PostStatus;
  isFeatured: boolean;
  allowComments: boolean;
  categoryIds: number[];
  tagIds: number[];
  seoTitle: string;
  seoDescription: string;
  indexMode: string;
  seoImage: string;
  authorId?: number;
  formatType?: string;
  externalSource?: string;
  sponsoredBy?: string;
}

interface PostFormProps {
  mode: "create" | "edit";
  postId?: number;
  initialData?: Partial<PostFormData>;
  translationMode?: string | null;
  originLangCode?: string;
}

function getFlagEmoji(countryCode: string): string {
  const code = countryCode.toUpperCase();
  if (code.length !== 2) return countryCode;
  const codePoints = [...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65);
  return String.fromCodePoint(...codePoints);
}

const STATUS_OPTIONS: { value: PostStatus; label: string }[] = [
  { value: "PUBLISHED", label: "Published" },
  { value: "DRAFT", label: "Draft" },
  { value: "PENDING", label: "Pending Review" },
  { value: "ARCHIVED", label: "Archived" },
];

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: handles complex edit/create form state initialization, query calls, and sidebar elements
export function PostForm({
  mode,
  postId,
  initialData,
  translationMode,
  originLangCode,
}: PostFormProps) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { toast } = useToast();
  const t = useTranslations("common");
  const publishCardRef = useRef<HTMLDivElement>(null);
  const tPost = useTranslations("posts");
  const locale = useLocale();
  const { data: currentUser } = useUser();

  const { data: activeLanguages } = trpc.viewer.languages.getActive.useQuery();

  const bannerLangCode =
    translationMode ||
    (mode === "create"
      ? activeLanguages?.find((l) => l.locale === locale)?.code || locale
      : originLangCode || activeLanguages?.find((l) => l.isDefault)?.code || locale);

  const activeLanguageName =
    activeLanguages?.find((l) => l.code === bannerLangCode)?.name ?? bannerLangCode;

  const [formData, setFormData] = useState<PostFormData>({
    title: initialData?.title ?? "",
    slug: initialData?.slug ?? "",
    content: initialData?.content ?? "",
    excerpt: initialData?.excerpt ?? "",
    featuredImage: initialData?.featuredImage ?? "",
    bannerImage: initialData?.bannerImage ?? "",
    status: initialData?.status ?? "DRAFT",
    isFeatured: initialData?.isFeatured ?? false,
    allowComments: initialData?.allowComments ?? true,
    categoryIds: initialData?.categoryIds ?? [],
    tagIds: initialData?.tagIds ?? [],
    seoTitle: initialData?.seoTitle ?? "",
    seoDescription: initialData?.seoDescription ?? "",
    indexMode: initialData?.indexMode ?? "index",
    seoImage: initialData?.seoImage ?? "",
    authorId: initialData?.authorId ?? undefined,
    formatType: initialData?.formatType ?? "Article",
  });

  // UI-only form states
  const [sticky, setSticky] = useState(false);
  const [showAuthor, setShowAuthor] = useState(true);
  const [showPublishDate, setShowPublishDate] = useState(true);
  const [readingTime, setReadingTime] = useState("5");
  const [externalSource, setExternalSource] = useState(initialData?.externalSource ?? "");
  const [sponsoredBy, setSponsoredBy] = useState(initialData?.sponsoredBy ?? "");
  const [categorySearch, setCategorySearch] = useState("");
  const [newTagInput, setNewTagInput] = useState("");
  const [showEditor, setShowEditor] = useState(true);
  const editorRef = useRef<Editor | null>(null);

  const [mediaPickerTarget, setMediaPickerTarget] = useState<
    "featured" | "banner" | "seo" | "editor" | null
  >(null);
  const [origin, setOrigin] = useState("http://127.0.0.1:8000");

  const exitAfterSaveRef = useRef(false);
  const [customFieldsCount, setCustomFieldsCount] = useState(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  // Set default author to currently logged-in user on create mode
  useEffect(() => {
    if (mode === "create" && currentUser?.id && !formData.authorId) {
      setFormData((prev) => ({ ...prev, authorId: Number(currentUser.id) }));
    }
  }, [currentUser, mode, formData.authorId]);

  // Queries
  const { data: categories } = trpc.viewer.categories.tree.useQuery();
  const { data: tagsData } = trpc.viewer.tags.list.useQuery({
    pageSize: 100,
    filters: [{ fieldKey: "status", operator: "equals", value: "PUBLISHED" }],
  });
  const { data: usersData } = trpc.viewer.users.list.useQuery({
    perPage: 100,
  });
  const { data: seoMeta } = trpc.viewer.seo.get.useQuery(
    { entityType: "post", entityId: postId ?? 0 },
    { enabled: mode === "edit" && !!postId },
  );

  const { data: customFieldsBoxes } = trpc.viewer.customFields.getFieldBoxes.useQuery(
    {
      modelName: "posts",
      modelId: postId ?? 1,
      categoryId: formData.categoryIds[0],
    },
    { enabled: true },
  );

  const [originalSeo, setOriginalSeo] = useState({
    seoTitle: "",
    seoDescription: "",
    seoImage: "",
    indexMode: "index",
  });
  const [hasSetOriginalSeo, setHasSetOriginalSeo] = useState(false);

  useEffect(() => {
    if (seoMeta && !hasSetOriginalSeo) {
      const seo = {
        seoTitle: seoMeta.seoTitle ?? "",
        seoDescription: seoMeta.seoDescription ?? "",
        seoImage: seoMeta.seoImage ?? "",
        indexMode: seoMeta.indexMode ?? "index",
      };
      setFormData((prev) => ({
        ...prev,
        ...seo,
      }));
      setOriginalSeo(seo);
      setHasSetOriginalSeo(true);
    }
  }, [seoMeta, hasSetOriginalSeo]);

  const [originalCustomFields, setOriginalCustomFields] = useState({
    sticky: false,
    showAuthor: true,
    showPublishDate: true,
    readingTime: "5",
  });
  const [hasSetOriginalCustomFields, setHasSetOriginalCustomFields] = useState(false);

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: parses checkbox arrays and initializes custom field values
  useEffect(() => {
    if (customFieldsBoxes && mode === "edit" && !hasSetOriginalCustomFields) {
      let isSticky = false;
      let isShowAuthor = true;
      let isShowPublishDate = true;
      let rTime = "5";

      for (const box of customFieldsBoxes) {
        for (const item of box.items) {
          if (item.slug === "reading_time") {
            rTime = item.value ?? "5";
          } else if (item.slug === "post_options") {
            const val = item.value ?? "";
            let activeOptions: string[] = [];
            try {
              const parsed = JSON.parse(val);
              if (Array.isArray(parsed)) {
                activeOptions = parsed;
              }
            } catch {
              activeOptions = val.split(",").map((s) => s.trim());
            }
            isSticky = activeOptions.includes("sticky");
            isShowAuthor = activeOptions.includes("show_author");
            isShowPublishDate = activeOptions.includes("show_date");
          }
        }
      }

      setSticky(isSticky);
      setShowAuthor(isShowAuthor);
      setShowPublishDate(isShowPublishDate);
      setReadingTime(rTime);

      setOriginalCustomFields({
        sticky: isSticky,
        showAuthor: isShowAuthor,
        showPublishDate: isShowPublishDate,
        readingTime: rTime,
      });
      setHasSetOriginalCustomFields(true);
    }
  }, [customFieldsBoxes, mode, hasSetOriginalCustomFields]);

  // Mutations
  const saveSeoMetaMutation = trpc.viewer.seo.save.useMutation();
  const saveCustomFieldsMutation = trpc.viewer.customFields.saveModelFields.useMutation();

  const saveSeo = (targetPostId: number, callback: () => void) => {
    saveSeoMetaMutation.mutate(
      {
        entityType: "post",
        entityId: targetPostId,
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
          toast(err.message, "error");
          callback(); // continue redirection anyway
        },
      },
    );
  };

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: maps dynamic custom fields to payload values
  const saveCustomFields = (targetPostId: number, callback: () => void) => {
    if (!customFieldsBoxes) {
      callback();
      return;
    }

    const postOptionsItem = customFieldsBoxes
      .flatMap((b) => b.items)
      .find((i) => i.slug === "post_options");
    const readingTimeItem = customFieldsBoxes
      .flatMap((b) => b.items)
      .find((i) => i.slug === "reading_time");

    const values = [];

    if (postOptionsItem) {
      const activeOptions = [];
      if (sticky) activeOptions.push("sticky");
      if (showAuthor) activeOptions.push("show_author");
      if (showPublishDate) activeOptions.push("show_date");
      if (formData.isFeatured) activeOptions.push("featured");
      if (formData.allowComments) activeOptions.push("allow_comments");

      values.push({
        fieldItemId: postOptionsItem.id,
        value: JSON.stringify(activeOptions),
      });
    }

    if (readingTimeItem) {
      values.push({
        fieldItemId: readingTimeItem.id,
        value: readingTime,
      });
    }

    if (values.length === 0) {
      callback();
      return;
    }

    saveCustomFieldsMutation.mutate(
      {
        modelName: "posts",
        modelId: targetPostId,
        values,
      },
      {
        onSuccess: () => {
          callback();
        },
        onError: (err) => {
          toast(err.message, "error");
          callback(); // continue anyway
        },
      },
    );
  };

  const createMutation = trpc.viewer.posts.create.useMutation({
    onSuccess: () => {
      utils.viewer.posts.list.invalidate();
    },
    onError: (err) => toast(err.message, "error"),
  });

  const updateMutation = trpc.viewer.posts.update.useMutation({
    onSuccess: () => {
      utils.viewer.posts.list.invalidate();
      utils.viewer.posts.get.invalidate({ id: postId });
    },
    onError: (err) => toast(err.message, "error"),
  });

  const saveTranslationMut = trpc.viewer.translations.save.useMutation({
    onSuccess: () => {
      utils.viewer.translations.list.invalidate();
      utils.viewer.translations.translationStatus.invalidate();
      utils.viewer.translations.batchTranslationStatus.invalidate();
    },
    onError: (err) => toast(err.message, "error"),
  });

  const isPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    saveTranslationMut.isPending ||
    saveCustomFieldsMutation.isPending ||
    saveSeoMetaMutation.isPending;

  const error =
    createMutation.error ||
    updateMutation.error ||
    saveTranslationMut.error ||
    saveCustomFieldsMutation.error ||
    saveSeoMetaMutation.error;

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: handles payload formatting and mapping for create/update/translation mutations
  function handleSave(exit: boolean) {
    exitAfterSaveRef.current = exit;

    const payload = {
      title: formData.title,
      slug: formData.slug || undefined,
      content: formData.content || undefined,
      excerpt: formData.excerpt || undefined,
      featuredImage: formData.featuredImage || undefined,
      bannerImage: formData.bannerImage || undefined,
      status: formData.status,
      isFeatured: formData.isFeatured,
      allowComments: formData.allowComments,
      formatType: formData.formatType || "Article",
      categoryIds: formData.categoryIds,
      tagIds: formData.tagIds,
      authorId: formData.authorId,
      externalSource: externalSource || undefined,
      sponsoredBy: sponsoredBy || undefined,
    };

    if (mode === "edit" && postId) {
      if (translationMode) {
        // Step 1: Save translation
        saveTranslationMut.mutate(
          {
            entityType: "post",
            entityId: postId,
            langCode: translationMode,
            data: {
              title: formData.title,
              slug: formData.slug || undefined,
              content: formData.content || undefined,
              excerpt: formData.excerpt || undefined,
            },
          },
          {
            onSuccess: () => {
              toast(t("successUpdated"), "success");
              if (exit) {
                router.push("/posts");
              }
            },
          },
        );
      } else {
        // Default language edit
        const updatePayload = {
          ...payload,
          featuredImage: formData.featuredImage || null,
          bannerImage: formData.bannerImage || null,
          externalSource: externalSource || null,
          sponsoredBy: sponsoredBy || null,
        };
        updateMutation.mutate(
          { id: postId, ...updatePayload },
          {
            onSuccess: (data) => {
              saveSeo(data.id, () => {
                saveCustomFields(data.id, () => {
                  toast(t("successUpdated"), "success");
                  if (exit) {
                    router.push("/posts");
                  }
                });
              });
            },
          },
        );
      }
    } else {
      // Create mode
      createMutation.mutate(payload, {
        onSuccess: (data) => {
          saveSeo(data.id, () => {
            saveCustomFields(data.id, () => {
              toast(t("successCreated"), "success");
              if (exit) {
                router.push("/posts");
              } else {
                router.push(`/posts/${data.id}/edit`);
              }
            });
          });
        },
      });
    }
  }

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: compares multiple form inputs against initialData state
  const isDirty = useMemo(() => {
    if (mode === "create") {
      return formData.title.trim().length > 0;
    }
    if (!initialData) return false;

    const arraysEqual = (a?: number[], b?: number[]) => {
      const arrA = a ?? [];
      const arrB = b ?? [];
      if (arrA.length !== arrB.length) return false;
      const sortedA = [...arrA].sort();
      const sortedB = [...arrB].sort();
      return sortedA.every((v, i) => v === sortedB[i]);
    };

    return (
      formData.title !== (initialData.title ?? "") ||
      formData.slug !== (initialData.slug ?? "") ||
      formData.content !== (initialData.content ?? "") ||
      formData.excerpt !== (initialData.excerpt ?? "") ||
      formData.featuredImage !== (initialData.featuredImage ?? "") ||
      formData.bannerImage !== (initialData.bannerImage ?? "") ||
      formData.status !== (initialData.status ?? "DRAFT") ||
      formData.isFeatured !== (initialData.isFeatured ?? false) ||
      formData.allowComments !== (initialData.allowComments ?? true) ||
      formData.seoTitle !== originalSeo.seoTitle ||
      formData.seoDescription !== originalSeo.seoDescription ||
      formData.indexMode !== originalSeo.indexMode ||
      formData.seoImage !== originalSeo.seoImage ||
      formData.authorId !== initialData.authorId ||
      formData.formatType !== (initialData.formatType ?? "Article") ||
      sticky !== originalCustomFields.sticky ||
      showAuthor !== originalCustomFields.showAuthor ||
      showPublishDate !== originalCustomFields.showPublishDate ||
      readingTime !== originalCustomFields.readingTime ||
      externalSource !== (initialData.externalSource ?? "") ||
      sponsoredBy !== (initialData.sponsoredBy ?? "") ||
      !arraysEqual(formData.categoryIds, initialData.categoryIds) ||
      !arraysEqual(formData.tagIds, initialData.tagIds)
    );
  }, [
    formData,
    initialData,
    mode,
    originalSeo,
    sticky,
    showAuthor,
    showPublishDate,
    readingTime,
    externalSource,
    sponsoredBy,
    originalCustomFields,
  ]);

  // Flatten tree categories for checkbox list
  const flattenCategories = useMemo(() => {
    if (!categories) return [];
    const flat: { id: number; name: string }[] = [];
    interface CatNode {
      id: number;
      name: string;
      children?: CatNode[] | null;
    }
    const traverse = (cats: CatNode[]) => {
      for (const cat of cats) {
        flat.push({ id: cat.id, name: cat.name });
        if (cat.children && cat.children.length > 0) {
          traverse(cat.children);
        }
      }
    };
    traverse(categories as unknown as CatNode[]);
    return flat;
  }, [categories]);

  const filteredCategories = useMemo(() => {
    return flattenCategories.filter((cat) =>
      cat.name.toLowerCase().includes(categorySearch.toLowerCase()),
    );
  }, [flattenCategories, categorySearch]);

  function toggleCategory(id: number) {
    setFormData((prev) => ({
      ...prev,
      categoryIds: prev.categoryIds.includes(id)
        ? prev.categoryIds.filter((cid) => cid !== id)
        : [...prev.categoryIds, id],
    }));
  }

  function toggleTag(id: number) {
    setFormData((prev) => ({
      ...prev,
      tagIds: prev.tagIds.includes(id)
        ? prev.tagIds.filter((tid) => tid !== id)
        : [...prev.tagIds, id],
    }));
  }

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && newTagInput.trim()) {
      e.preventDefault();
      // Simply search for matches or we can just bind/add locally
      const match = tagsData?.rows.find(
        (t) => t.name.toLowerCase() === newTagInput.trim().toLowerCase(),
      );
      if (match && !formData.tagIds.includes(match.id)) {
        toggleTag(match.id);
      }
      setNewTagInput("");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {!translationMode && (
        <StickyPublishBar
          publishCardRef={publishCardRef}
          title={formData.title}
          label={mode === "create" ? "Tạo bài viết" : "Sửa bài viết"}
          isPending={isPending}
          onSave={() => {}}
          saveLabel={isPending ? "Đang lưu..." : mode === "create" ? "Tạo bài viết" : "Cập nhật"}
        />
      )}
      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-red-50 px-4 py-3 text-sm text-destructive dark:bg-red-950">
          <AlertCircle className="size-4 shrink-0" />
          {error.message}
        </div>
      )}

      <div className="grid items-start gap-5 grid-cols-1 lg:grid-cols-[1fr_280px]">
        {/* ── Left Column: Form Details ── */}
        <div className="flex flex-col gap-6">
          <Card>
            <CardContent className="flex flex-col gap-5 p-5">
              <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
                <Info className="size-4 shrink-0" />
                <span>
                  {tPost("editingVersion", {
                    language: activeLanguageName,
                  })}
                </span>
              </div>
              {/* Name */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="post-title" className="text-sm font-semibold">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="post-title"
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Name"
                  required
                />
              </div>

              {/* Permalink */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="post-slug" className="text-sm font-semibold">
                  Permalink <span className="text-destructive">*</span>
                </Label>
                <div className="flex items-center rounded-md border border-input bg-background focus-within:ring-1 focus-within:ring-ring">
                  <span className="select-none px-3 text-sm text-muted-foreground bg-muted border-r border-input py-2 rounded-l-md">
                    {origin}/posts/
                  </span>
                  <input
                    id="post-slug"
                    className="flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
                    value={formData.slug}
                    onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                    placeholder="slug"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Preview:{" "}
                  <a
                    href={`${origin}/posts/${formData.slug || "..."}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline"
                  >
                    {origin}/posts/{formData.slug || "..."}
                  </a>
                </p>
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="post-description" className="text-sm font-semibold">
                  Description
                </Label>
                <Textarea
                  id="post-description"
                  value={formData.excerpt}
                  onChange={(e) => setFormData((prev) => ({ ...prev, excerpt: e.target.value }))}
                  placeholder="Short description"
                  rows={4}
                />
              </div>

              {/* Featured toggle switch */}
              {!translationMode && (
                <div className="flex items-center gap-2 py-1">
                  <Switch
                    id="is-featured-switch"
                    checked={formData.isFeatured}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, isFeatured: checked }))
                    }
                  />
                  <Label
                    htmlFor="is-featured-switch"
                    className="cursor-pointer text-sm font-medium"
                  >
                    Is featured?
                  </Label>
                </div>
              )}

              {/* Content Editor area */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Content</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowEditor((prev) => !prev)}
                      className="h-8 px-3 text-xs"
                    >
                      <Eye className="mr-1.5 size-3.5" />
                      {showEditor ? "Hide Editor" : "Show Editor"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setMediaPickerTarget("editor")}
                      className="h-8 px-3 text-xs flex items-center gap-1"
                    >
                      <ImageIcon className="mr-1.5 size-3.5" />
                      Add Media
                    </Button>
                  </div>
                </div>

                {showEditor ? (
                  <RichTextEditor
                    id="post-content"
                    ref={editorRef}
                    value={formData.content}
                    onChange={(val) => setFormData((prev) => ({ ...prev, content: val }))}
                    placeholder="Write post content here..."
                    minHeight={350}
                  />
                ) : (
                  <Textarea
                    id="post-content-text"
                    value={formData.content}
                    onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
                    placeholder="Write post content here..."
                    rows={15}
                    className="min-h-[350px]"
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {!translationMode && (
            <>
              {/* Post Additional Information */}
              <Card>
                <CardHeader className="border-b border-border px-5 py-4">
                  <CardTitle className="text-base font-semibold">
                    Post Additional Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-6 p-6">
                  {/* Options Checklist */}
                  <div className="flex flex-col gap-2">
                    <Label className="text-sm font-semibold text-slate-800">Post Options</Label>
                    <div className="flex flex-col gap-2.5">
                      <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                        <input
                          type="checkbox"
                          checked={formData.isFeatured}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, isFeatured: e.target.checked }))
                          }
                          className="size-4 rounded border-input text-primary focus:ring-primary mt-0.5"
                        />
                        Featured post
                      </label>
                      <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                        <input
                          type="checkbox"
                          checked={sticky}
                          onChange={(e) => setSticky(e.target.checked)}
                          className="size-4 rounded border-input text-primary focus:ring-primary mt-0.5"
                        />
                        Sticky post
                      </label>
                      <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                        <input
                          type="checkbox"
                          checked={showAuthor}
                          onChange={(e) => setShowAuthor(e.target.checked)}
                          className="size-4 rounded border-input text-primary focus:ring-primary mt-0.5"
                        />
                        Show author
                      </label>
                      <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                        <input
                          type="checkbox"
                          checked={formData.allowComments}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, allowComments: e.target.checked }))
                          }
                          className="size-4 rounded border-input text-primary focus:ring-primary mt-0.5"
                        />
                        Allow comments
                      </label>
                      <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                        <input
                          type="checkbox"
                          checked={showPublishDate}
                          onChange={(e) => setShowPublishDate(e.target.checked)}
                          className="size-4 rounded border-input text-primary focus:ring-primary mt-0.5"
                        />
                        Show publish date
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* Reading Time */}
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="post-reading-time" className="text-sm font-medium">
                        Reading Time
                      </Label>
                      <Input
                        id="post-reading-time"
                        type="number"
                        value={readingTime}
                        onChange={(e) => setReadingTime(e.target.value)}
                      />
                      <span className="text-xs text-muted-foreground">
                        Estimated reading time in minutes
                      </span>
                    </div>

                    {/* External Source */}
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="post-external-source" className="text-sm font-medium">
                        External Source
                      </Label>
                      <Input
                        id="post-external-source"
                        placeholder="https://example.com/article"
                        value={externalSource}
                        onChange={(e) => setExternalSource(e.target.value)}
                      />
                      <span className="text-xs text-muted-foreground">
                        Link to external source or reference
                      </span>
                    </div>
                  </div>

                  {/* Post Type & Sponsored */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="post-type" className="text-sm font-medium">
                        Post Type
                      </Label>
                      <Select
                        value={formData.formatType}
                        onValueChange={(v) => setFormData((prev) => ({ ...prev, formatType: v }))}
                      >
                        <SelectTrigger id="post-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Article">Article</SelectItem>
                          <SelectItem value="Video">Video</SelectItem>
                          <SelectItem value="Gallery">Gallery</SelectItem>
                          <SelectItem value="Standard">Standard</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-xs text-muted-foreground">Select the type of post</span>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="post-sponsored" className="text-sm font-medium">
                        Sponsored By
                      </Label>
                      <Input
                        id="post-sponsored"
                        placeholder="Company name"
                        value={sponsoredBy}
                        onChange={(e) => setSponsoredBy(e.target.value)}
                      />
                      <span className="text-xs text-muted-foreground">
                        Sponsor name (if applicable)
                      </span>
                    </div>
                  </div>

                  {/* Custom Excerpt */}
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="post-custom-excerpt" className="text-sm font-medium">
                      Custom Excerpt
                    </Label>
                    <Textarea
                      id="post-custom-excerpt"
                      placeholder="Enter a brief summary..."
                      value={formData.excerpt}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, excerpt: e.target.value }))
                      }
                      rows={3}
                    />
                    <span className="text-xs text-muted-foreground">
                      Custom excerpt for social media sharing
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Gallery images */}
              <Card>
                <CardHeader className="border-b border-border px-5 py-4">
                  <CardTitle className="text-base font-semibold">Gallery images</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setMediaPickerTarget("featured")}
                  >
                    Select images
                  </Button>
                </CardContent>
              </Card>

              {/* SEO meta widget */}
              <SearchEngineOptimize
                seoTitle={formData.seoTitle}
                onChangeSeoTitle={(v) => setFormData((prev) => ({ ...prev, seoTitle: v }))}
                seoDescription={formData.seoDescription}
                onChangeSeoDescription={(v) =>
                  setFormData((prev) => ({ ...prev, seoDescription: v }))
                }
                seoImage={formData.seoImage}
                onChangeSeoImage={(v) => setFormData((prev) => ({ ...prev, seoImage: v }))}
                indexMode={formData.indexMode}
                onChangeIndexMode={(v) => setFormData((prev) => ({ ...prev, indexMode: v }))}
                defaultTitle={formData.title}
                defaultUrl={formData.slug}
              />

              {/* Custom Fields panel */}
              {mode === "edit" && postId && customFieldsCount > 0 && (
                <Card>
                  <CardHeader className="border-b border-border px-5 py-4">
                    <CardTitle className="text-base font-semibold">{t("customFields")}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <CustomFieldsPanel
                      modelName="posts"
                      modelId={postId}
                      context={{ categoryId: formData.categoryIds[0] }}
                      onGroupsLoad={setCustomFieldsCount}
                    />
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>

        {/* ── Right Column: Sidebar ── */}
        <div className="flex flex-col gap-4">
          {/* Publish Control Card */}
          <Card>
            <CardHeader className="border-b border-border px-4 py-3">
              <CardTitle className="text-sm font-semibold">Publish</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-2 p-4">
              <Button
                type="button"
                disabled={
                  isPending ||
                  !formData.title.trim() ||
                  (mode === "edit" && !translationMode && !isDirty)
                }
                onClick={() => handleSave(false)}
                size="sm"
                className="flex-1 font-semibold"
              >
                {isPending ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Save className="mr-2 size-4" />
                )}
                {t("saveAndEdit")}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={
                  isPending ||
                  !formData.title.trim() ||
                  (mode === "edit" && !translationMode && !isDirty)
                }
                onClick={() => handleSave(true)}
                size="sm"
              >
                <Save className="mr-2 size-4" />
                {t("save")}
              </Button>
            </CardContent>
          </Card>

          {/* Languages */}
          {mode === "edit" && postId && (
            <Card>
              <CardHeader className="border-b border-border px-4 py-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Globe className="size-4 text-muted-foreground" />
                  {tPost("languages")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 flex flex-col gap-3">
                {activeLanguages?.map((lang) => {
                  const link =
                    lang.locale === locale
                      ? `/posts/${postId}/edit`
                      : `/posts/${postId}/edit?ref_lang=${lang.code}`;
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

          {!translationMode && (
            <>
              {/* Status Card */}
              <Card>
                <CardHeader className="border-b border-border px-4 py-3">
                  <CardTitle className="text-sm font-semibold">
                    Status <span className="text-destructive">*</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <Select
                    value={formData.status}
                    onValueChange={(v) =>
                      setFormData((prev) => ({ ...prev, status: v as PostStatus }))
                    }
                  >
                    <SelectTrigger className="w-full">
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

              {/* Author Card */}
              <Card>
                <CardHeader className="border-b border-border px-4 py-3">
                  <CardTitle className="text-sm font-semibold">Author</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2 p-4">
                  <Select
                    value={formData.authorId !== undefined ? String(formData.authorId) : ""}
                    onValueChange={(v) =>
                      setFormData((prev) => ({ ...prev, authorId: v ? Number(v) : undefined }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select author" />
                    </SelectTrigger>
                    <SelectContent>
                      {usersData?.data.map((user) => (
                        <SelectItem key={user.id} value={String(user.id)}>
                          {user.name || user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-muted-foreground">
                    The list of authors is from Admin → Members.
                  </span>
                </CardContent>
              </Card>

              {/* Categories Card */}
              <Card>
                <CardHeader className="border-b border-border px-4 py-3">
                  <CardTitle className="text-sm font-semibold">Categories</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 p-4">
                  {/* Search category */}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search..."
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                      className="pl-9 h-9"
                    />
                  </div>

                  {/* Categories checklist */}
                  <div className="flex max-h-56 flex-col gap-2 overflow-y-auto pt-1">
                    {filteredCategories.map((cat) => (
                      <label
                        key={cat.id}
                        htmlFor={`cat-select-${cat.id}`}
                        className="flex cursor-pointer items-start gap-2.5 text-sm text-slate-700"
                      >
                        <input
                          type="checkbox"
                          id={`cat-select-${cat.id}`}
                          checked={formData.categoryIds.includes(cat.id)}
                          onChange={() => toggleCategory(cat.id)}
                          className="size-4 rounded border-input text-primary focus:ring-primary mt-0.5"
                        />
                        <span>{cat.name}</span>
                      </label>
                    ))}
                    {filteredCategories.length === 0 && (
                      <span className="text-xs text-muted-foreground">
                        No categories match search.
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Featured Image Card */}
              <Card>
                <CardHeader className="border-b border-border px-4 py-3">
                  <CardTitle className="text-sm font-semibold">Image</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 p-4">
                  <button
                    type="button"
                    onClick={() => setMediaPickerTarget("featured")}
                    className="w-full text-left group relative border border-dashed border-input rounded-md flex flex-col items-center justify-center bg-muted/5 h-36 overflow-hidden transition-all hover:bg-muted/10 cursor-pointer"
                  >
                    {formData.featuredImage ? (
                      <>
                        <Image
                          src={formData.featuredImage}
                          alt="Featured image"
                          fill
                          className="object-cover"
                          unoptimized
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFormData((prev) => ({ ...prev, featuredImage: "" }));
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
                      onClick={() => setMediaPickerTarget("featured")}
                      className="text-primary hover:underline font-semibold"
                    >
                      Choose image
                    </button>
                    <span className="text-muted-foreground/55">or</span>
                    <button
                      type="button"
                      onClick={() => {
                        const url = prompt("Enter Image URL:");
                        if (url) setFormData((prev) => ({ ...prev, featuredImage: url }));
                      }}
                      className="text-primary hover:underline font-semibold"
                    >
                      Add from URL
                    </button>
                  </div>
                </CardContent>
              </Card>

              {/* Banner Image Card */}
              <Card>
                <CardHeader className="border-b border-border px-4 py-3">
                  <CardTitle className="text-sm font-semibold">Banner image (1920×170px)</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 p-4">
                  <button
                    type="button"
                    onClick={() => setMediaPickerTarget("banner")}
                    className="w-full text-left group relative border border-dashed border-input rounded-md flex flex-col items-center justify-center bg-muted/5 h-28 overflow-hidden transition-all hover:bg-muted/10 cursor-pointer"
                  >
                    {formData.bannerImage ? (
                      <>
                        <Image
                          src={formData.bannerImage}
                          alt="Banner image"
                          fill
                          className="object-cover"
                          unoptimized
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFormData((prev) => ({ ...prev, bannerImage: "" }));
                          }}
                          className="absolute top-2 right-2 bg-background/90 hover:bg-background rounded-full p-1 shadow-sm h-7 w-7 flex items-center justify-center cursor-pointer z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-4 text-muted-foreground/60 w-full">
                        <ImageIcon className="size-8 stroke-1 mb-2 mx-auto" />
                        <span className="text-xs text-center block">No banner image selected</span>
                      </div>
                    )}
                  </button>

                  <div className="flex items-center justify-center gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setMediaPickerTarget("banner")}
                      className="text-primary hover:underline font-semibold"
                    >
                      Choose image
                    </button>
                    <span className="text-muted-foreground/55">or</span>
                    <button
                      type="button"
                      onClick={() => {
                        const url = prompt("Enter Banner Image URL:");
                        if (url) setFormData((prev) => ({ ...prev, bannerImage: url }));
                      }}
                      className="text-primary hover:underline font-semibold"
                    >
                      Add from URL
                    </button>
                  </div>
                </CardContent>
              </Card>

              {/* Tags Card */}
              <Card>
                <CardHeader className="border-b border-border px-4 py-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-1">
                    <TagIcon className="size-4 text-muted-foreground" />
                    Tags
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3.5 p-4">
                  <Input
                    type="text"
                    placeholder="Write some tags"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    className="h-9"
                  />

                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                    {tagsData?.rows.map((tag) => (
                      <Badge
                        key={tag.id}
                        variant={formData.tagIds.includes(tag.id) ? "default" : "outline"}
                        className={cn(
                          "cursor-pointer select-none transition-colors px-2 py-0.5 text-xs",
                          formData.tagIds.includes(tag.id)
                            ? "bg-primary hover:bg-primary/90 text-primary-foreground border-transparent"
                            : "text-muted-foreground border-border hover:bg-muted",
                        )}
                        onClick={() => toggleTag(tag.id)}
                      >
                        {tag.name}
                      </Badge>
                    ))}
                    {tagsData?.rows.length === 0 && (
                      <span className="text-xs text-muted-foreground">No tags available.</span>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Allow comments card */}
              <Card>
                <CardHeader className="border-b border-border px-4 py-3">
                  <CardTitle className="text-sm font-semibold">Allow comments</CardTitle>
                </CardHeader>
                <CardContent className="p-4 flex items-center">
                  <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={formData.allowComments}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, allowComments: e.target.checked }))
                      }
                      className="size-4 rounded border-input text-primary focus:ring-primary"
                    />
                    <span>Allow comments</span>
                  </label>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* Media Picker Dialog */}
      <MediaPickerDialog
        open={mediaPickerTarget !== null}
        onOpenChange={(open) => !open && setMediaPickerTarget(null)}
        // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: handles multiple media targets (editor, featured, banner, seo) cleanly
        onInsert={(items) => {
          if (items.length > 0) {
            if (mediaPickerTarget === "editor") {
              const editor = editorRef.current;
              if (editor) {
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
              }
            } else {
              const url = items[0].full_url || items[0].preview_url || "";
              if (mediaPickerTarget === "featured") {
                setFormData((prev) => ({ ...prev, featuredImage: url }));
              } else if (mediaPickerTarget === "banner") {
                setFormData((prev) => ({ ...prev, bannerImage: url }));
              } else if (mediaPickerTarget === "seo") {
                setFormData((prev) => ({ ...prev, seoImage: url }));
              }
            }
          }
          setMediaPickerTarget(null);
        }}
      />
    </div>
  );
}
