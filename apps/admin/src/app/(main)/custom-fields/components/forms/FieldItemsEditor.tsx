"use client";

import { ConfirmDialog } from "@admin/components/ui/ConfirmDialog";
import { useConfirm } from "@admin/components/ui/useConfirm";
import { trpc } from "@admin/lib/trpc";
import { Badge } from "@ecom/ui/components/badge";
import { Button } from "@ecom/ui/components/button";
import { Card } from "@ecom/ui/components/card";
import { Input } from "@ecom/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ecom/ui/components/select";
import { cn } from "@ecom/ui/lib/utils";
import { ChevronDown, GripVertical, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

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
}

interface FieldItemsEditorProps {
  groupId: number;
  items: FieldItem[];
  onRefresh: () => void;
}

function generateSlug(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .trim();
}

interface AddItemRowProps {
  groupId: number;
  parentId?: number;
  order: number;
  onSuccess: () => void;
  onCancel: () => void;
}

function AddItemRow({ groupId, parentId, order, onSuccess, onCancel }: AddItemRowProps) {
  const t = useTranslations("customFields");
  const fi = useTranslations("customFields.fieldItems");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [type, setType] = useState<FieldType>("text");
  const [instructions, setInstructions] = useState("");

  const addItemMut = trpc.viewer.customFields.addItem.useMutation({
    onSuccess: () => {
      onSuccess();
    },
  });

  return (
    <tr>
      <td className="w-8 px-3 py-2" />
      <td className="px-3 py-2">
        <Input
          id={`add-item-title-${groupId}`}
          placeholder={fi("labelRequired")}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setSlug(generateSlug(e.target.value));
          }}
          required
        />
      </td>
      <td className="px-3 py-2">
        <Input
          id={`add-item-slug-${groupId}`}
          placeholder={fi("slugRequired")}
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          required
        />
      </td>
      <td className="px-3 py-2">
        <Select value={type} onValueChange={(v) => setType(v as FieldType)}>
          <SelectTrigger id={`add-item-type-${groupId}`}>
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
      </td>
      <td className="px-3 py-2">
        <Input
          id={`add-item-instructions-${groupId}`}
          placeholder={fi("instructions")}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
        />
      </td>
      <td className="px-3 py-2 text-right">
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            disabled={addItemMut.isPending || !title.trim() || !slug.trim()}
            onClick={() => {
              addItemMut.mutate({
                groupId,
                title: title.trim(),
                slug: slug.trim(),
                type,
                instructions: instructions || undefined,
                order,
                parentId: parentId ?? undefined,
              });
            }}
          >
            {addItemMut.isPending ? fi("adding") : fi("add")}
          </Button>
          <Button size="sm" variant="ghost" onClick={onCancel}>
            {fi("cancel")}
          </Button>
        </div>
      </td>
    </tr>
  );
}

interface ItemRowProps {
  item: FieldItem;
  allItems: FieldItem[];
  onRefresh: () => void;
}

function ItemRow({ item, allItems, onRefresh }: ItemRowProps) {
  const fi = useTranslations("customFields.fieldItems");
  const { askConfirm, dialogProps: confirmDialogProps } = useConfirm();
  const [expanded, setExpanded] = useState(false);
  const [showAddChild, setShowAddChild] = useState(false);
  const [editInstructions, setEditInstructions] = useState(item.instructions ?? "");

  const children = allItems.filter((i) => i.parentId === item.id);

  const removeItemMut = trpc.viewer.customFields.removeItem.useMutation({
    onSuccess: onRefresh,
  });
  const updateItemMut = trpc.viewer.customFields.updateItem.useMutation({
    onSuccess: onRefresh,
  });

  return (
    <>
      <tr className="border-b border-border hover:bg-muted/30">
        <td className="w-8 cursor-grab px-3 py-2 text-muted-foreground/40">
          <GripVertical size={16} />
        </td>
        <td className="px-3 py-2">
          <p className="text-sm font-medium">{item.title}</p>
          {children.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {fi("childFields", { count: children.length })}
            </p>
          )}
        </td>
        <td className="px-3 py-2">
          <code className="rounded bg-muted px-2 py-0.5 font-mono text-xs">{item.slug}</code>
        </td>
        <td className="px-3 py-2">
          <Badge variant="outline" className="text-xs">
            {item.type}
          </Badge>
        </td>
        <td className="px-3 py-2">
          <p className="max-w-[200px] truncate text-sm text-muted-foreground">
            {item.instructions ?? "—"}
          </p>
        </td>
        <td className="px-3 py-2 text-right">
          <div className="flex justify-end gap-1">
            {item.type === "repeater" && (
              <button
                type="button"
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
                aria-label={fi("addChildField")}
                title={fi("addChildField")}
                onClick={() => setShowAddChild(!showAddChild)}
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
            <button
              type="button"
              className="rounded-md p-1.5 text-destructive hover:bg-destructive/10"
              onClick={() => {
                askConfirm({
                  message: fi("confirmDelete", { name: item.title }),
                  onConfirm: () => removeItemMut.mutate({ id: item.id }),
                });
              }}
              disabled={removeItemMut.isPending}
              aria-label={fi("deleteField")}
              title={fi("deleteField")}
            >
              <Trash2 size={16} />
            </button>
          </div>
        </td>
      </tr>

      {/* Expand row for inline editing */}
      {expanded && (
        <tr>
          <td colSpan={6} className="border-0 px-0 py-0">
            <div className="mb-2 rounded bg-muted/50 p-4">
              <textarea
                id={`item-instructions-${item.id}`}
                className="min-h-[60px] w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm"
                placeholder={fi("instructions")}
                value={editInstructions}
                onChange={(e) => setEditInstructions(e.target.value)}
                onBlur={() => {
                  if (editInstructions !== (item.instructions ?? "")) {
                    updateItemMut.mutate({
                      id: item.id,
                      instructions: editInstructions || undefined,
                    });
                  }
                }}
                rows={2}
              />
            </div>
          </td>
        </tr>
      )}

      {/* Child items for repeater */}
      {children.map((child) => (
        <tr key={child.id} className="border-b border-border bg-muted/30">
          <td className="w-8 pl-8" />
          <td className="px-3 py-2 pl-6">
            <p className="text-sm text-muted-foreground">↳ {child.title}</p>
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
          <td className="px-3 py-2">
            <p className="text-xs text-muted-foreground">{child.instructions ?? "—"}</p>
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

      {/* Add child row for repeater */}
      {showAddChild && (
        <AddItemRow
          groupId={item.id}
          parentId={item.id}
          order={children.length}
          onSuccess={() => {
            setShowAddChild(false);
            onRefresh();
          }}
          onCancel={() => setShowAddChild(false)}
        />
      )}
      <ConfirmDialog {...confirmDialogProps} />
    </>
  );
}

export function FieldItemsEditor({ groupId, items, onRefresh }: FieldItemsEditorProps) {
  const fi = useTranslations("customFields.fieldItems");
  const [showAddItem, setShowAddItem] = useState(false);

  const rootItems = items.filter((i) => !i.parentId);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{fi("sectionTitle")}</p>
        <Button size="sm" onClick={() => setShowAddItem(true)} disabled={showAddItem}>
          <Plus className="mr-2 size-4" />
          {fi("addField")}
        </Button>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="w-8 px-3 py-2" />
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                {fi("label")}
              </th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                {fi("slug")}
              </th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                {fi("type")}
              </th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                {fi("instructions")}
              </th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                {fi("actions")}
              </th>
            </tr>
          </thead>
          <tbody>
            {rootItems.length === 0 && !showAddItem ? (
              <tr>
                <td colSpan={6}>
                  <div className="flex items-center justify-center py-8">
                    <p className="text-sm text-muted-foreground">{fi("noFields")}</p>
                  </div>
                </td>
              </tr>
            ) : (
              rootItems.map((item) => (
                <ItemRow key={item.id} item={item} allItems={items} onRefresh={onRefresh} />
              ))
            )}

            {showAddItem && (
              <AddItemRow
                groupId={groupId}
                order={rootItems.length}
                onSuccess={() => {
                  setShowAddItem(false);
                  onRefresh();
                }}
                onCancel={() => setShowAddItem(false)}
              />
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
