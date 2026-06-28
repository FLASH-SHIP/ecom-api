"use client";

import { trpc } from "@admin/lib/trpc";
import type { AppRouter } from "@ecom/trpc/server";
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
import { Skeleton } from "@ecom/ui/components/skeleton";
import { Switch } from "@ecom/ui/components/switch";
import { Textarea } from "@ecom/ui/components/textarea";
import { cn } from "@ecom/ui/lib/utils";
import type { inferRouterOutputs } from "@trpc/server";
import { AlertCircle, ChevronDown, Loader2, Save, SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ── Types derived from tRPC router output ──────────────────────────────────

type RouterOutputs = inferRouterOutputs<AppRouter>;
type FieldBoxArray = RouterOutputs["viewer"]["customFields"]["getFieldBoxes"];
type FieldBox = FieldBoxArray[number];
type FieldItem = NonNullable<FieldBox["items"]>[number];

// ── Props ──────────────────────────────────────────────────────────────────

interface FieldBoxContext {
  categoryId?: number;
  pageTemplate?: string;
  postFormat?: string;
}

interface CustomFieldsPanelProps {
  /** "posts" | "pages" — matches registered model names */
  modelName: "posts" | "pages";
  /** The entity ID — undefined when creating a new entity (panel shows placeholder) */
  modelId?: number;
  context?: FieldBoxContext;
  /** Collapse groups into accordions (useful inside inline-edit rows) */
  collapsible?: boolean;
}

// ── Field input renderer ───────────────────────────────────────────────────

interface FieldInputProps {
  item: FieldItem;
  value: string;
  onChange: (val: string) => void;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: type-dispatch renderer for 8+ custom field types
function FieldInput({ item, value, onChange }: FieldInputProps) {
  const t = useTranslations("customFields.panel");

  if (item.type === "textarea" || item.type === "wysiwyg") {
    return (
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`cf-${item.id}`}>{item.title}</Label>
        <Textarea
          id={`cf-${item.id}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={item.placeholder ?? ""}
          rows={item.type === "wysiwyg" ? 6 : 3}
        />
        {item.instructions && <p className="text-xs text-muted-foreground">{item.instructions}</p>}
      </div>
    );
  }

  if (item.type === "select" || item.type === "radio") {
    let opts: { label: string; value: string }[] = [];
    if (Array.isArray(item.options)) {
      opts = item.options as { label: string; value: string }[];
    } else if (item.options && typeof item.options === "object") {
      const optionsObj = item.options as Record<string, unknown>;
      if (typeof optionsObj.selectChoices === "string") {
        opts = optionsObj.selectChoices
          .split("\n")
          .map((line: string) => {
            const parts = line.split(":");
            const value = parts[0]?.trim() || "";
            const label = parts[1]?.trim() || value;
            return { label, value };
          })
          .filter((o) => o.label !== "");
      }
    }
    return (
      <div className="flex flex-col gap-1.5">
        <Label>{item.title}</Label>
        <Select value={value || "EMPTY"} onValueChange={(v) => onChange(v === "EMPTY" ? "" : v)}>
          <SelectTrigger>
            <SelectValue placeholder={t("selectPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="EMPTY">
              <em>{t("selectPlaceholder")}</em>
            </SelectItem>
            {opts.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {item.instructions && <p className="text-xs text-muted-foreground">{item.instructions}</p>}
      </div>
    );
  }

  if (item.type === "checkbox") {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Switch
            id={`cf-${item.id}`}
            checked={value === "1" || value === "true"}
            onCheckedChange={(checked) => onChange(checked ? "1" : "0")}
          />
          <Label htmlFor={`cf-${item.id}`}>{item.title}</Label>
        </div>
        {item.instructions && (
          <p className="ml-10 text-xs text-muted-foreground">{item.instructions}</p>
        )}
      </div>
    );
  }

  if (item.type === "number") {
    return (
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`cf-${item.id}`}>{item.title}</Label>
        <Input
          id={`cf-${item.id}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          type="number"
          placeholder={item.placeholder ?? ""}
        />
        {item.instructions && <p className="text-xs text-muted-foreground">{item.instructions}</p>}
      </div>
    );
  }

  if (item.type === "date") {
    return (
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`cf-${item.id}`}>{item.title}</Label>
        <Input
          id={`cf-${item.id}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          type="date"
        />
        {item.instructions && <p className="text-xs text-muted-foreground">{item.instructions}</p>}
      </div>
    );
  }

  if (item.type === "color") {
    return (
      <div className="flex flex-col gap-1.5">
        <Label>{item.title}</Label>
        <div className="flex items-center gap-2">
          <input
            id={`cf-${item.id}`}
            type="color"
            value={value || "#000000"}
            onChange={(e) => onChange(e.target.value)}
            className="h-9 w-10 cursor-pointer rounded border-0"
            aria-label={item.title}
          />
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="#000000"
            className="flex-1"
          />
        </div>
        {item.instructions && <p className="text-xs text-muted-foreground">{item.instructions}</p>}
      </div>
    );
  }

  // text, email, url, image, file — default text input
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`cf-${item.id}`}>{item.title}</Label>
      <Input
        id={`cf-${item.id}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={item.type === "email" ? "email" : item.type === "url" ? "url" : "text"}
        placeholder={item.placeholder ?? ""}
      />
      {item.instructions && <p className="text-xs text-muted-foreground">{item.instructions}</p>}
    </div>
  );
}

// ── FieldBox section ───────────────────────────────────────────────────────

interface FieldBoxSectionProps {
  box: FieldBox;
  localValues: Record<number, string>;
  onValueChange: (fieldItemId: number, val: string) => void;
}

function FieldBoxSection({ box, localValues, onValueChange }: FieldBoxSectionProps) {
  const t = useTranslations("customFields.panel");
  const rootItems = box.items.filter((i) => !i.parentId);

  if (rootItems.length === 0) {
    return <p className="py-3 text-sm text-muted-foreground">{t("emptyGroup")}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {rootItems.map((item) => {
        // Repeater — render nested children
        if (item.type === "repeater") {
          const children = box.items.filter((c) => c.parentId === item.id);
          return (
            <div key={item.id} className="flex flex-col gap-2">
              <p className="text-sm font-semibold">{item.title}</p>
              {item.instructions && (
                <p className="text-xs text-muted-foreground">{item.instructions}</p>
              )}
              <Card className="p-4">
                <div className="flex flex-col gap-3">
                  {children.length === 0 ? (
                    <p className="text-xs text-muted-foreground/50">{t("emptyRepeater")}</p>
                  ) : (
                    children.map((child) => (
                      <FieldInput
                        key={child.id}
                        item={child}
                        value={localValues[child.id] ?? ""}
                        onChange={(v) => onValueChange(child.id, v)}
                      />
                    ))
                  )}
                </div>
              </Card>
            </div>
          );
        }

        return (
          <FieldInput
            key={item.id}
            item={item}
            value={localValues[item.id] ?? ""}
            onChange={(v) => onValueChange(item.id, v)}
          />
        );
      })}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function CustomFieldsPanel({
  modelName,
  modelId,
  context,
  collapsible = false,
}: CustomFieldsPanelProps) {
  const t = useTranslations("customFields.panel");
  const [localValues, setLocalValues] = useState<Record<number, string>>({});
  const [saved, setSaved] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  // seededRef prevents overwriting in-progress edits if the query refetches
  const seededRef = useRef(false);

  const enabled = !!modelId;

  const {
    data: fieldBoxes,
    isLoading,
    error,
  } = trpc.viewer.customFields.getFieldBoxes.useQuery(
    {
      modelName,
      // biome-ignore lint/style/noNonNullAssertion: enabled guard above
      modelId: modelId!,
      ...context,
    },
    { enabled },
  );

  // Seed local values from server — only once on initial load, never overwrite user edits
  useEffect(() => {
    if (!fieldBoxes || seededRef.current) return;
    seededRef.current = true;
    const initial: Record<number, string> = {};
    for (const box of fieldBoxes) {
      for (const item of box.items) {
        initial[item.id ?? 0] = item.value ?? "";
      }
    }
    setLocalValues(initial);
  }, [fieldBoxes]);

  const saveModelFields = trpc.viewer.customFields.saveModelFields.useMutation({
    onSuccess: () => {
      setSaved(true);
      setIsDirty(false);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const handleValueChange = useCallback((fieldItemId: number, val: string) => {
    setSaved(false);
    setIsDirty(true);
    setLocalValues((prev) => ({ ...prev, [fieldItemId]: val }));
  }, []);

  const allItemIds = useMemo(
    () => fieldBoxes?.flatMap((b) => b.items.map((i) => i.id)) ?? [],
    [fieldBoxes],
  );

  function handleSave() {
    if (!modelId) return;
    const values = allItemIds.map((fieldItemId) => ({
      fieldItemId,
      value: localValues[fieldItemId] ?? null,
    }));
    saveModelFields.mutate({ modelName, modelId, values });
  }

  // Placeholder when no modelId (new entity not saved yet)
  if (!enabled) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={16} className="text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">{t("saveNotice")}</p>
        </div>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-red-50 px-4 py-3 text-sm text-destructive dark:bg-red-950">
        <AlertCircle className="size-4 shrink-0" />
        {error.message}
      </div>
    );
  }

  if (!fieldBoxes?.length) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={16} className="text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">{t("noMatchingGroups")}</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col">
      {fieldBoxes.map((box, idx) =>
        collapsible ? (
          <Card key={box.groupId} className="mb-2">
            <details open={idx === 0}>
              <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 hover:bg-muted/30 [&::-webkit-details-marker]:hidden">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal size={14} className="text-muted-foreground" />
                  <span className="text-sm font-semibold">{box.groupTitle}</span>
                </div>
                <ChevronDown className="size-4 text-muted-foreground transition-transform [[open]_&]:rotate-180" />
              </summary>
              <div className="px-4 pb-4">
                <FieldBoxSection
                  box={box}
                  localValues={localValues}
                  onValueChange={handleValueChange}
                />
              </div>
            </details>
          </Card>
        ) : (
          <Card key={box.groupId} className="mb-3 p-4">
            <p className="mb-3 font-semibold">{box.groupTitle}</p>
            <FieldBoxSection
              box={box}
              localValues={localValues}
              onValueChange={handleValueChange}
            />
          </Card>
        ),
      )}

      {/* Save button */}
      <div className="mt-2 flex justify-end">
        <Button
          id="save-custom-fields"
          variant={saved ? "outline" : "default"}
          size="sm"
          className={cn(saved && "border-emerald-300 text-emerald-600")}
          disabled={saveModelFields.isPending || (!isDirty && !saved)}
          onClick={handleSave}
        >
          {saveModelFields.isPending ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Save className="mr-2 size-4" />
          )}
          {saveModelFields.isPending ? t("saving") : saved ? t("saved") : t("save")}
        </Button>
      </div>
    </div>
  );
}
