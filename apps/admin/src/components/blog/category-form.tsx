"use client";

import { StickyPublishBar } from "@admin/components/layout/StickyPublishBar";
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
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useRef, useState } from "react";

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
}

interface CategoryFormProps {
  mode: "create" | "edit";
  categoryId?: number;
  initialData?: Partial<CategoryFormData>;
  translationMode?: string | null;
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

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: rich editor form with create/edit modes, validation, image upload, and i18n fields
export function CategoryForm({
  mode,
  categoryId,
  initialData,
  translationMode,
}: CategoryFormProps) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { toast } = useToast();
  const t = useTranslations("common");
  const publishCardRef = useRef<HTMLDivElement>(null);

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
  });

  const { data: categories } = trpc.viewer.categories.tree.useQuery();

  const createMutation = trpc.viewer.categories.create.useMutation({
    onSuccess: () => {
      toast(t("successCreated"), "success");
      utils.viewer.categories.list.invalidate();
      utils.viewer.categories.tree.invalidate();
      router.push("/categories");
    },
    onError: (err) => toast(err.message, "error"),
  });

  const updateMutation = trpc.viewer.categories.update.useMutation({
    onSuccess: () => {
      toast(t("successUpdated"), "success");
      utils.viewer.categories.list.invalidate();
      utils.viewer.categories.tree.invalidate();
      router.push("/categories");
    },
    onError: (err) => toast(err.message, "error"),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;
  const error = createMutation.error || updateMutation.error;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: formData.name,
      slug: formData.slug || undefined,
      description: formData.description || undefined,
      icon: formData.icon || undefined,
      status: formData.status,
      isFeatured: formData.isFeatured,
      isDefault: formData.isDefault,
      parentId: formData.parentId ?? undefined,
      order: formData.order,
    };
    if (mode === "edit" && categoryId) {
      updateMutation.mutate({ id: categoryId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  // Memoize tree traversal — avoids re-running recursive flatten on every render
  // flattenCategories is defined outside the component, so deps are stable
  const flatCategories = useMemo(
    () => flattenCategories(categories, categoryId),
    [categories, categoryId],
  );

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
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

      <div className={`grid items-start gap-6 ${!translationMode ? "lg:grid-cols-[2fr_1fr]" : ""}`}>
        {/* Main */}
        <Card>
          <CardContent className="flex flex-col gap-5 p-6">
            {translationMode && (
              <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
                🌐 You are editing the <strong>{translationMode}</strong> translation.
              </div>
            )}
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
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cat-description">Description</Label>
              <Textarea
                id="cat-description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
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

        {/* Sidebar — hidden in translation mode */}
        {!translationMode && (
          <div ref={publishCardRef}>
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

                <div className="flex gap-2 pt-2">
                  <Button type="submit" disabled={isPending} className="flex-1">
                    {isPending
                      ? "Saving..."
                      : mode === "create"
                        ? "Create Category"
                        : "Update Category"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/categories")}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Translation save button */}
        {translationMode && (
          <Card>
            <CardContent className="p-4">
              <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? "Saving..." : `Save ${translationMode.toUpperCase()} Translation`}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </form>
  );
}
