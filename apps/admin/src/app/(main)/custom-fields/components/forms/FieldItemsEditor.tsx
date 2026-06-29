"use client";

import { ConfirmDialog } from "@admin/components/ui/ConfirmDialog";
import { useConfirm } from "@admin/components/ui/useConfirm";
import { trpc } from "@admin/lib/trpc";
import { Badge } from "@ecom/ui/components/badge";
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
import { cn } from "@ecom/ui/lib/utils";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

// Field type labels are i18n-driven — see customFields.types in locale files
const FIELD_TYPE_VALUES = [
  "text",
  "number",
  "email",
  "textarea",
  "select",
  "checkbox",
  "radio",
  "image",
  "file",
  "wysiwyg",
  "repeater",
  "color",
  "date",
  "url",
] as const;

type FieldType = (typeof FIELD_TYPE_VALUES)[number];

interface FieldItem {
  id: number;
  title: string;
  slug: string;
  type: string;
  placeholder: string | null;
  instructions: string | null;
  order: number;
  parentId: number | null;
  options?: unknown;
  defaultValue?: string | null;
}

interface FieldItemsEditorProps {
  groupId: number;
  items: FieldItem[];
  onRefresh: () => void;
}

function _generateSlug(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .trim();
}

interface ItemRowProps {
  item: FieldItem;
  allItems: FieldItem[];
  index: number;
  groupId: number;
  newlyCreatedId: number | null;
  setNewlyCreatedId: (id: number | null) => void;
  onRefresh: () => void;
}

function ItemRow({
  item,
  allItems,
  index,
  groupId,
  newlyCreatedId,
  setNewlyCreatedId,
  onRefresh,
}: ItemRowProps) {
  const t = useTranslations("customFields");
  const fi = useTranslations("customFields.fieldItems");
  const { askConfirm, dialogProps: confirmDialogProps } = useConfirm();
  const [expanded, setExpanded] = useState(false);

  const [editTitle, setEditTitle] = useState(item.title);
  const [editSlug, setEditSlug] = useState(item.slug);
  const [editType, setEditType] = useState<FieldType>(item.type as FieldType);
  const [editInstructions, setEditInstructions] = useState(item.instructions ?? "");
  const [editPlaceholder, setEditPlaceholder] = useState(item.placeholder ?? "");
  const [editDefaultValue, setEditDefaultValue] = useState(item.defaultValue ?? "");

  const initialOptionsString = useMemo(() => {
    if (!item.options) return "";
    if (Array.isArray(item.options)) {
      const opts = item.options as { label: string; value: string }[];
      return opts.map((o) => `${o.label}${o.value !== o.label ? `: ${o.value}` : ""}`).join("\n");
    }
    if (typeof item.options === "object" && item.options !== null) {
      const optionsObj = item.options as Record<string, unknown>;
      if (typeof optionsObj.selectChoices === "string") {
        return optionsObj.selectChoices;
      }
    }
    return "";
  }, [item.options]);
  const [editOptions, setEditOptions] = useState(initialOptionsString);

  useEffect(() => {
    if (item.id === newlyCreatedId) {
      setExpanded(true);
      setNewlyCreatedId(null);
    }
  }, [item.id, newlyCreatedId, setNewlyCreatedId]);

  const children = allItems.filter((i) => i.parentId === item.id);

  const removeItemMut = trpc.viewer.customFields.removeItem.useMutation({
    onSuccess: onRefresh,
  });
  const updateItemMut = trpc.viewer.customFields.updateItem.useMutation({
    onSuccess: onRefresh,
  });
  const addChildItemMut = trpc.viewer.customFields.addItem.useMutation({
    onSuccess: (data) => {
      setNewlyCreatedId(data.id);
      onRefresh();
    },
  });

  return (
    <>
      <tr className="border-b border-border hover:bg-muted/30">
        <td className="w-12 px-3 py-3 text-center">
          <span className="inline-flex size-6 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
            {index + 1}
          </span>
        </td>
        <td className="px-3 py-3 font-medium">
          <p className="text-sm">{item.title}</p>
          {children.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {fi("childFields", { count: children.length })}
            </p>
          )}
        </td>
        <td className="px-3 py-3">
          <code className="rounded bg-muted px-2 py-0.5 font-mono text-xs">{item.slug}</code>
        </td>
        <td className="px-3 py-3">
          <Badge variant="outline" className="text-xs">
            {item.type}
          </Badge>
        </td>
        <td className="px-3 py-3" />
        <td className="px-3 py-3 text-right">
          <div className="flex justify-end gap-1">
            {item.type === "repeater" && (
              <button
                type="button"
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
                aria-label={fi("addChildField")}
                title={fi("addChildField")}
                disabled={addChildItemMut.isPending}
                onClick={() => {
                  const childCount = allItems.filter((i) => i.parentId === item.id).length;
                  addChildItemMut.mutate({
                    groupId,
                    parentId: item.id,
                    title: "New field",
                    slug: `new_field_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                    type: "text",
                    order: childCount,
                  });
                }}
              >
                <Plus size={16} />
              </button>
            )}
            <button
              type="button"
              className={cn(
                "rounded-md p-1.5 text-muted-foreground transition-transform hover:bg-muted",
                expanded && "rotate-180",
              )}
              aria-label={expanded ? fi("collapse") : fi("expand")}
              title={expanded ? fi("collapse") : fi("expand")}
              onClick={() => setExpanded(!expanded)}
            >
              <ChevronDown size={16} />
            </button>
          </div>
        </td>
      </tr>

      {/* Expand row for inline editing */}
      {expanded && (
        <tr>
          <td colSpan={5} className="border-b border-border px-6 py-4 bg-muted/5">
            <div className="text-left space-y-2">
              {/* Row 1: Nhãn */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-2 items-start">
                <div className="md:col-span-1">
                  <Label className="text-sm font-semibold text-foreground">Nhãn (Title)</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Đây là tiêu đề của từng trường, xuất hiện ở các trang chỉnh sửa
                  </p>
                </div>
                <div className="md:col-span-2">
                  <Input
                    id={`edit-title-${item.id}`}
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                  />
                </div>
              </div>

              {/* Row 2: Tên truy nhập trường */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-2 items-start">
                <div className="md:col-span-1">
                  <Label className="text-sm font-semibold text-foreground">
                    Tên truy nhập trường (Slug)
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tên truy nhập của trường. Chỉ chấp nhận ký tự thường không dấu, số, gạch ngang
                    (-) và gạch dưới (_)
                  </p>
                </div>
                <div className="md:col-span-2">
                  <Input
                    id={`edit-slug-${item.id}`}
                    value={editSlug}
                    onChange={(e) => setEditSlug(e.target.value)}
                  />
                </div>
              </div>

              {/* Row 3: Kiểu trường */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-2 items-start">
                <div className="md:col-span-1">
                  <Label className="text-sm font-semibold text-foreground">
                    Kiểu trường (Type)
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Vui lòng chọn một kiểu phù hợp cho bạn
                  </p>
                </div>
                <div className="md:col-span-2">
                  <Select value={editType} onValueChange={(v) => setEditType(v as FieldType)}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FIELD_TYPE_VALUES.map((ft) => (
                        <SelectItem key={ft} value={ft}>
                          {t(`types.${ft}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 4: Hướng dẫn nhập liệu */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-2 items-start">
                <div className="md:col-span-1">
                  <Label className="text-sm font-semibold text-foreground">
                    Hướng dẫn nhập liệu cho trường
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Hướng dẫn nhập liệu từng trường cho người nhập liệu. Hiển thị ở các trang chỉnh
                    sửa
                  </p>
                </div>
                <div className="md:col-span-2">
                  <textarea
                    id={`edit-instructions-${item.id}`}
                    className="min-h-[60px] w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm"
                    value={editInstructions}
                    onChange={(e) => setEditInstructions(e.target.value)}
                  />
                </div>
              </div>

              {/* Row 5: Placeholder */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-2 items-start">
                <div className="md:col-span-1">
                  <Label className="text-sm font-semibold text-foreground">
                    Placeholder / Gợi ý
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Gợi ý hiển thị bên trong ô nhập liệu khi chưa có dữ liệu
                  </p>
                </div>
                <div className="md:col-span-2">
                  <Input
                    id={`edit-placeholder-${item.id}`}
                    value={editPlaceholder}
                    onChange={(e) => setEditPlaceholder(e.target.value)}
                  />
                </div>
              </div>

              {/* Row 6: Giá trị mặc định */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-2 items-start">
                <div className="md:col-span-1">
                  <Label className="text-sm font-semibold text-foreground">Giá trị mặc định</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Giá trị mặc định cho trường này nếu không có dữ liệu nhập vào
                  </p>
                </div>
                <div className="md:col-span-2">
                  <Input
                    id={`edit-default-${item.id}`}
                    value={editDefaultValue}
                    onChange={(e) => setEditDefaultValue(e.target.value)}
                  />
                </div>
              </div>

              {/* Row 7: Các mục lựa chọn (select, checkbox, radio) */}
              {["select", "checkbox", "radio"].includes(editType) && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-2 items-start">
                  <div className="md:col-span-1">
                    <Label className="text-sm font-semibold text-foreground">
                      Các mục lựa chọn
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1 whitespace-pre-line">
                      Nhập mỗi lựa chọn trên một dòng mới. Để quản lý tốt hơn, bạn có thể phân định
                      rõ cả nhãn và giá trị lựa chọn như sau: red: Red blue: Blue
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <textarea
                      id={`edit-options-${item.id}`}
                      className="min-h-[100px] w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm"
                      placeholder="Ví dụ:&#10;Đỏ: red&#10;Xanh: green"
                      value={editOptions}
                      onChange={(e) => setEditOptions(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Actions Row */}
              <div className="flex justify-end gap-2 pt-4 border-t border-border/60">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    askConfirm({
                      message: fi("confirmDelete", { name: item.title }),
                      onConfirm: () => removeItemMut.mutate({ id: item.id }),
                    });
                  }}
                  disabled={removeItemMut.isPending}
                >
                  Xóa trường này
                </Button>
                <Button
                  size="sm"
                  disabled={updateItemMut.isPending || !editTitle.trim() || !editSlug.trim()}
                  onClick={() => {
                    if (!/^[a-z0-9_-]+$/.test(editSlug)) {
                      alert(
                        "Tên truy nhập (Slug) chỉ được chứa chữ thường không dấu, số, gạch ngang (-) và gạch dưới (_).",
                      );
                      return;
                    }

                    let options: Array<{ label: string; value: string }> | null = null;
                    if (["select", "checkbox", "radio"].includes(editType)) {
                      options = editOptions
                        .split("\n")
                        .map((line) => {
                          const parts = line.split(":");
                          const label = parts[0]?.trim() || "";
                          const value = parts[1]?.trim() || label;
                          return { label, value };
                        })
                        .filter((opt) => opt.label !== "");
                    }

                    updateItemMut.mutate(
                      {
                        id: item.id,
                        title: editTitle.trim(),
                        slug: editSlug.trim(),
                        type: editType,
                        instructions: editInstructions.trim() || undefined,
                        placeholder: editPlaceholder.trim() || undefined,
                        defaultValue: editDefaultValue.trim() || null,
                        options: options || null,
                      },
                      {
                        onSuccess: () => {
                          setExpanded(false);
                          onRefresh();
                        },
                      },
                    );
                  }}
                >
                  {updateItemMut.isPending ? "Đang lưu..." : "Lưu thay đổi"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setExpanded(false)}>
                  Thu nhỏ trường này lại
                </Button>
              </div>
            </div>
          </td>
        </tr>
      )}

      {/* Child items for repeater */}
      {children.map((child) => (
        <tr key={child.id} className="border-b border-border bg-muted/30">
          <td className="w-12 text-center text-muted-foreground/30">↳</td>
          <td className="px-3 py-2">
            <p className="text-sm text-muted-foreground">{child.title}</p>
          </td>
          <td className="px-3 py-2">
            <code className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px]">
              {child.slug}
            </code>
          </td>
          <td className="px-3 py-2">
            <Badge variant="outline" className="text-[11px]">
              {child.type}
            </Badge>
          </td>
          <td className="px-3 py-2 text-right">
            <button
              type="button"
              className="rounded-md p-1.5 text-destructive hover:bg-destructive/10"
              aria-label={fi("deleteField")}
              onClick={() => {
                askConfirm({
                  message: fi("confirmDelete", { name: child.title }),
                  onConfirm: () => removeItemMut.mutate({ id: child.id }),
                });
              }}
            >
              <Trash2 size={16} />
            </button>
          </td>
        </tr>
      ))}
      <ConfirmDialog {...confirmDialogProps} />
    </>
  );
}

export function FieldItemsEditor({ groupId, items, onRefresh }: FieldItemsEditorProps) {
  const fi = useTranslations("customFields.fieldItems");
  const [newlyCreatedId, setNewlyCreatedId] = useState<number | null>(null);

  const rootItems = items.filter((i) => !i.parentId);

  const addItemMut = trpc.viewer.customFields.addItem.useMutation({
    onSuccess: (data) => {
      setNewlyCreatedId(data.id);
      onRefresh();
    },
  });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{fi("sectionTitle")}</p>
        <Button
          size="sm"
          disabled={addItemMut.isPending}
          onClick={() => {
            addItemMut.mutate({
              groupId,
              title: "New field",
              slug: `new_field_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              type: "text",
              order: rootItems.length,
            });
          }}
        >
          <Plus className="mr-2 size-4" />
          {fi("addField")}
        </Button>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="w-12 px-3 py-2 text-center">#</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                {fi("label")}
              </th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                {fi("slug")}
              </th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                {fi("type")}
              </th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                {fi("actions")}
              </th>
            </tr>
          </thead>
          <tbody>
            {rootItems.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className="flex items-center justify-center py-8">
                    <p className="text-sm text-muted-foreground">{fi("noFields")}</p>
                  </div>
                </td>
              </tr>
            ) : (
              rootItems.map((item, index) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  allItems={items}
                  index={index}
                  groupId={groupId}
                  newlyCreatedId={newlyCreatedId}
                  setNewlyCreatedId={setNewlyCreatedId}
                  onRefresh={onRefresh}
                />
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
