"use client";

import { CustomFieldsPanel } from "@admin/components/custom-fields/CustomFieldsPanel";
import { StickyPublishBar } from "@admin/components/layout/StickyPublishBar";
import { useToast } from "@admin/components/toast-provider";
import { trpc } from "@admin/lib/trpc";
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
import { Separator } from "@ecom/ui/components/separator";
import { Switch } from "@ecom/ui/components/switch";
import { Textarea } from "@ecom/ui/components/textarea";
import { cn } from "@ecom/ui/lib/utils";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";

type PostStatus = "DRAFT" | "PENDING" | "PUBLISHED" | "ARCHIVED";

interface PostFormData {
  title: string;
  slug?: string;
  content?: string;
  excerpt?: string;
  featuredImage?: string;
  status: PostStatus;
  isFeatured: boolean;
  allowComments: boolean;
  categoryIds: number[];
  tagIds: number[];
  seoTitle?: string;
  seoDescription?: string;
  indexMode?: string;
}

interface PostFormProps {
  mode: "create" | "edit";
  postId?: number;
  initialData?: Partial<PostFormData>;
  translationMode?: string | null;
}

const STATUS_OPTIONS: { value: PostStatus; label: string }[] = [
  { value: "DRAFT", label: "Draft" },
  { value: "PENDING", label: "Pending Review" },
  { value: "PUBLISHED", label: "Published" },
  { value: "ARCHIVED", label: "Archived" },
];

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: full post editor — create/edit modes, SEO panel, categories, tags, featured image sidebar
export function PostForm({ mode, postId, initialData, translationMode }: PostFormProps) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { toast } = useToast();
  const t = useTranslations("common");
  const publishCardRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<PostFormData>({
    title: initialData?.title ?? "",
    slug: initialData?.slug ?? "",
    content: initialData?.content ?? "",
    excerpt: initialData?.excerpt ?? "",
    featuredImage: initialData?.featuredImage ?? "",
    status: initialData?.status ?? "DRAFT",
    isFeatured: initialData?.isFeatured ?? false,
    allowComments: initialData?.allowComments ?? true,
    categoryIds: initialData?.categoryIds ?? [],
    tagIds: initialData?.tagIds ?? [],
    seoTitle: initialData?.seoTitle ?? "",
    seoDescription: initialData?.seoDescription ?? "",
    indexMode: initialData?.indexMode ?? "INDEX_FOLLOW",
  });

  const { data: categories } = trpc.viewer.categories.tree.useQuery();
  const { data: tagsData } = trpc.viewer.tags.list.useQuery({
    pageSize: 100,
    filters: [{ fieldKey: "status", operator: "equals", value: "PUBLISHED" }],
  });

  const createMutation = trpc.viewer.posts.create.useMutation({
    onSuccess: () => {
      toast(t("successCreated"), "success");
      utils.viewer.posts.list.invalidate();
      router.push("/posts");
    },
    onError: (err) => toast(err.message, "error"),
  });

  const updateMutation = trpc.viewer.posts.update.useMutation({
    onSuccess: () => {
      toast(t("successUpdated"), "success");
      utils.viewer.posts.list.invalidate();
      utils.viewer.posts.get.invalidate({ id: postId });
      router.push("/posts");
    },
    onError: (err) => toast(err.message, "error"),
  });

  const saveTranslationMut = trpc.viewer.translations.save.useMutation({
    onSuccess: () => {
      toast(t("successUpdated"), "success");
      utils.viewer.translations.list.invalidate();
      utils.viewer.translations.translationStatus.invalidate();
    },
    onError: (err) => toast(err.message, "error"),
  });

  const isPending =
    createMutation.isPending || updateMutation.isPending || saveTranslationMut.isPending;
  const error = createMutation.error || updateMutation.error || saveTranslationMut.error;

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: handles both normal post save and translation save modes
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (translationMode && postId) {
      saveTranslationMut.mutate({
        entityType: "post",
        entityId: postId,
        langCode: translationMode,
        data: {
          title: formData.title,
          slug: formData.slug || undefined,
          content: formData.content || undefined,
          excerpt: formData.excerpt || undefined,
        },
      });
      return;
    }

    const payload = {
      title: formData.title,
      slug: formData.slug || undefined,
      content: formData.content || undefined,
      excerpt: formData.excerpt || undefined,
      featuredImage: formData.featuredImage || undefined,
      status: formData.status,
      isFeatured: formData.isFeatured,
      allowComments: formData.allowComments,
      categoryIds: formData.categoryIds.length > 0 ? formData.categoryIds : undefined,
      tagIds: formData.tagIds.length > 0 ? formData.tagIds : undefined,
    };

    if (mode === "edit" && postId) {
      updateMutation.mutate({ id: postId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  }

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

  return (
    <form onSubmit={handleSubmit}>
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
        <div className="mb-6 rounded-md border border-destructive/30 bg-red-50 px-4 py-3 text-sm text-destructive dark:bg-red-950">
          {error.message}
        </div>
      )}

      {translationMode && (
        <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
          🌐 You are editing the <strong>{translationMode}</strong> translation. Only translatable
          fields (Title, Slug, Content, Excerpt) are shown.
        </div>
      )}

      <div className={cn("grid grid-cols-1 gap-6", !translationMode && "lg:grid-cols-3")}>
        {/* ── Left: Main Content ── */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardContent className="flex flex-col gap-5 p-6">
              {/* Title */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="post-title">Title</Label>
                <Input
                  id="post-title"
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter post title"
                  required
                />
              </div>

              {/* Slug */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="post-slug">Slug</Label>
                <Input
                  id="post-slug"
                  value={formData.slug}
                  onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                  placeholder="custom-url-slug"
                />
                <p className="text-xs text-muted-foreground">Auto-generated from title if empty</p>
              </div>

              {/* Content */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="post-content">Content</Label>
                <Textarea
                  id="post-content"
                  value={formData.content}
                  onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
                  placeholder="Write your post content here..."
                  rows={16}
                />
                <p className="text-xs text-muted-foreground">
                  Rich text editor will be integrated in a future update.
                </p>
              </div>

              {/* Excerpt */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="post-excerpt">Excerpt</Label>
                <Textarea
                  id="post-excerpt"
                  value={formData.excerpt}
                  onChange={(e) => setFormData((prev) => ({ ...prev, excerpt: e.target.value }))}
                  placeholder="Brief summary of the post..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* SEO Settings — hidden in translation mode */}
          {!translationMode && (
            <Card>
              <CardHeader className="border-b border-border px-6 py-4">
                <CardTitle className="text-base font-semibold">SEO Settings</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 p-6">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="seo-title">SEO Title ({formData.seoTitle?.length ?? 0}/60)</Label>
                  <Input
                    id="seo-title"
                    value={formData.seoTitle}
                    onChange={(e) => setFormData((prev) => ({ ...prev, seoTitle: e.target.value }))}
                    placeholder={formData.title || "Enter SEO title"}
                    maxLength={70}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="seo-description">
                    SEO Description ({formData.seoDescription?.length ?? 0}/160)
                  </Label>
                  <Textarea
                    id="seo-description"
                    value={formData.seoDescription}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, seoDescription: e.target.value }))
                    }
                    placeholder="Brief description for search engines..."
                    rows={3}
                    maxLength={200}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="seo-index-mode">Index Mode</Label>
                  <Select
                    value={formData.indexMode}
                    onValueChange={(v) => setFormData((prev) => ({ ...prev, indexMode: v }))}
                  >
                    <SelectTrigger id="seo-index-mode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INDEX_FOLLOW">Index, Follow</SelectItem>
                      <SelectItem value="INDEX_NOFOLLOW">Index, No Follow</SelectItem>
                      <SelectItem value="NOINDEX_FOLLOW">No Index, Follow</SelectItem>
                      <SelectItem value="NOINDEX_NOFOLLOW">No Index, No Follow</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Custom Fields — hidden in translation mode */}
          {!translationMode && mode === "edit" && postId && (
            <Card>
              <CardHeader className="border-b border-border px-6 py-4">
                <CardTitle className="text-base font-semibold">{t("customFields")}</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <CustomFieldsPanel
                  modelName="posts"
                  modelId={postId}
                  context={{ categoryId: formData.categoryIds[0] }}
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── Right: Sidebar — hidden in translation mode ── */}
        {!translationMode && (
          <div className="flex flex-col gap-6" ref={publishCardRef}>
            {/* Publish Settings */}
            <Card>
              <CardHeader className="border-b border-border px-6 py-4">
                <CardTitle className="text-base font-semibold">Publish</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 p-6">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="post-status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(v) =>
                      setFormData((prev) => ({ ...prev, status: v as PostStatus }))
                    }
                  >
                    <SelectTrigger id="post-status">
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

                <div className="flex items-center justify-between">
                  <Label htmlFor="post-featured" className="cursor-pointer text-sm">
                    Featured post
                  </Label>
                  <Switch
                    id="post-featured"
                    checked={formData.isFeatured}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, isFeatured: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="post-comments" className="cursor-pointer text-sm">
                    Allow comments
                  </Label>
                  <Switch
                    id="post-comments"
                    checked={formData.allowComments}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, allowComments: checked }))
                    }
                  />
                </div>

                <Separator />

                <div className="flex gap-2">
                  <Button type="submit" disabled={isPending} className="flex-1">
                    {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                    {isPending ? "Saving..." : mode === "create" ? "Create Post" : "Update Post"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => router.push("/posts")}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Featured Image */}
            <Card>
              <CardHeader className="border-b border-border px-6 py-4">
                <CardTitle className="text-base font-semibold">Featured Image</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex flex-col gap-1.5">
                  <Input
                    id="post-featured-image"
                    value={formData.featuredImage}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, featuredImage: e.target.value }))
                    }
                    placeholder="https://example.com/image.jpg"
                  />
                  <p className="text-xs text-muted-foreground">
                    Media manager will be integrated in a future update.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Categories */}
            <Card>
              <CardHeader className="border-b border-border px-6 py-4">
                <CardTitle className="text-base font-semibold">Categories</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex max-h-48 flex-col gap-1.5 overflow-y-auto">
                  {categories?.map((cat) => (
                    <label
                      key={cat.id}
                      htmlFor={`cat-${cat.id}`}
                      className="flex cursor-pointer items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        id={`cat-${cat.id}`}
                        checked={formData.categoryIds.includes(cat.id)}
                        onChange={() => toggleCategory(cat.id)}
                        className="size-4 rounded border-border text-primary focus:ring-primary"
                      />
                      {cat.name}
                    </label>
                  ))}
                  {!categories?.length && (
                    <p className="text-xs text-muted-foreground">No categories yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Tags */}
            <Card>
              <CardHeader className="border-b border-border px-6 py-4">
                <CardTitle className="text-base font-semibold">Tags</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex flex-wrap gap-2">
                  {tagsData?.rows.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant={formData.tagIds.includes(tag.id) ? "default" : "outline"}
                      className={cn(
                        "cursor-pointer transition-colors",
                        formData.tagIds.includes(tag.id) && "bg-primary text-primary-foreground",
                      )}
                      onClick={() => toggleTag(tag.id)}
                    >
                      {tag.name}
                    </Badge>
                  ))}
                  {!tagsData?.rows.length && (
                    <p className="text-xs text-muted-foreground">No tags yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Translation mode: simple save button */}
        {translationMode && (
          <div className="flex gap-2">
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              {isPending ? "Saving..." : "Save Translation"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push("/posts")}>
              Cancel
            </Button>
          </div>
        )}
      </div>
    </form>
  );
}
