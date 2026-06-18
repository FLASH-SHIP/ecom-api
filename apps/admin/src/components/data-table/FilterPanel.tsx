"use client";

import { Button } from "@ecom/ui/components/button";
import { DatePicker } from "@ecom/ui/components/date-picker";
import { DateRangePicker } from "@ecom/ui/components/date-range-picker";
import { Input } from "@ecom/ui/components/input";
import { SearchableSelect } from "@ecom/ui/components/searchable-select";
import { Filter, Plus, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { getDefaultOperators, OPERATOR_GROUP_ENDS, OPERATOR_ICONS } from "./filter-operators";
import { validateFilter } from "./filter-validation";
import type { ActiveFilter, FilterFieldDef, FilterOperator } from "./types";

// ── Types ────────────────────────────────────────────────────────────────────

interface FilterPanelProps {
  open: boolean;
  fields: FilterFieldDef[];
  filters: ActiveFilter[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: Partial<ActiveFilter>) => void;
  onApply: () => void;
  onClose: () => void;
  onClear?: () => void;
  hasActiveFilters?: boolean;
}

// ── Component ────────────────────────────────────────────────────────────────

export function FilterPanel({
  open,
  fields,
  filters,
  onAdd,
  onRemove,
  onUpdate,
  onApply,
  onClose,
  onClear,
  hasActiveFilters = false,
}: FilterPanelProps) {
  const t = useTranslations("dataTable");

  if (!open) return null;

  return (
    <div className="mb-3 rounded-lg border border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">{t("filter.title")}</span>
          {hasActiveFilters && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
              {filters.filter((f) => validateFilter(f, fields).isValid).length}
            </span>
          )}
        </div>
        <Button variant="ghost" size="icon" className="size-7" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </div>

      {/* Filter rows */}
      <div className="flex flex-col gap-3 px-4 py-3">
        {filters.length === 0 ? (
          <p className="py-2 text-center text-sm text-muted-foreground">{t("filter.noFilters")}</p>
        ) : (
          filters.map((filter) => (
            <FilterRow
              key={filter.id}
              filter={filter}
              fields={fields}
              onUpdate={(patch) => onUpdate(filter.id, patch)}
              onRemove={() => onRemove(filter.id)}
              onApply={onApply}
              canRemove={filters.length > 1}
            />
          ))
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 border-t border-border px-4 py-2.5">
        <Button variant="outline" size="sm" onClick={onAdd}>
          <Plus className="mr-1.5 size-3.5" />
          {t("filter.addFilter")}
        </Button>
        <Button size="sm" onClick={onApply}>
          {t("filter.apply")}
        </Button>
        {hasActiveFilters && onClear && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto text-destructive hover:text-destructive"
            onClick={onClear}
          >
            {t("filter.clearAll")}
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Filter Row ───────────────────────────────────────────────────────────────

function FilterRow({
  filter,
  fields,
  onUpdate,
  onRemove,
  onApply,
  canRemove = true,
}: {
  filter: ActiveFilter;
  fields: FilterFieldDef[];
  onUpdate: (patch: Partial<ActiveFilter>) => void;
  onRemove: () => void;
  onApply: () => void;
  canRemove?: boolean;
}) {
  const t = useTranslations("dataTable");
  const selectedField = fields.find((f) => f.key === filter.fieldKey);
  const operators = selectedField?.operators ?? getDefaultOperators(selectedField?.type);
  const validation = validateFilter(filter, fields);

  const handleFieldChange = (key: string) => {
    const field = fields.find((f) => f.key === key);
    const fieldOps = field?.operators ?? getDefaultOperators(field?.type);
    const firstOp = fieldOps[0]?.value ?? "contains";
    onUpdate({ fieldKey: key, operator: firstOp, value: "" });
  };

  const fieldOptions = fields.map((f) => ({ value: f.key, label: f.label }));

  const operatorOptions = operators.map((op: FilterOperator) => ({
    value: op.value,
    label: t(`filter.operators.${op.label}` as Parameters<typeof t>[0]),
    icon: OPERATOR_ICONS[op.value],
    separatorAfter: OPERATOR_GROUP_ENDS.has(op.value),
  }));

  const requiredClass = "border-destructive focus-visible:ring-destructive/30";

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_1fr]">
      {/* Column 1: Field selector */}
      <SearchableSelect
        value={filter.fieldKey || undefined}
        onValueChange={handleFieldChange}
        options={fieldOptions}
        placeholder={t("filter.field")}
        className={`h-8 text-xs ${!filter.fieldKey ? requiredClass : ""}`}
      />

      {/* Column 2: Operator selector */}
      <SearchableSelect
        value={filter.operator || undefined}
        onValueChange={(v) => onUpdate({ operator: v })}
        options={operatorOptions}
        placeholder={t("filter.operator")}
        disabled={!filter.fieldKey}
        className={`h-8 text-xs ${filter.fieldKey && !filter.operator ? requiredClass : ""}`}
        maxHeight="none"
      />

      {/* Column 3: Value input + remove button */}
      <div className="flex items-center gap-1.5">
        <div className="min-w-0 flex-1">
          <FilterValueInput
            filter={filter}
            field={selectedField}
            validation={validation}
            onUpdate={onUpdate}
            onApply={onApply}
          />
        </div>
        {canRemove ? (
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={onRemove}
          >
            <Trash2 className="size-3.5" />
          </Button>
        ) : (
          <div className="size-8 shrink-0" />
        )}
      </div>
    </div>
  );
}

// ── Value Input ──────────────────────────────────────────────────────────────

const BETWEEN_OPS = new Set(["between", "betweenInclusive"]);
const NO_VALUE_OPS = new Set(["empty", "notEmpty"]);

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: type-dispatch renderer for filter value inputs across text, number, date, select, between, empty operators
function FilterValueInput({
  filter,
  field,
  validation,
  onUpdate,
  onApply,
}: {
  filter: ActiveFilter;
  field: FilterFieldDef | undefined;
  validation: ReturnType<typeof validateFilter>;
  onUpdate: (patch: Partial<ActiveFilter>) => void;
  onApply: () => void;
}) {
  const t = useTranslations("dataTable");
  const fieldType = field?.type ?? "text";
  const op = filter.operator;

  const hasValueError =
    !validation.isValid &&
    filter.fieldKey &&
    filter.operator &&
    (validation.errorField === "value" || validation.errorField === "both");
  const hasValue2Error =
    !validation.isValid &&
    filter.fieldKey &&
    filter.operator &&
    (validation.errorField === "value2" || validation.errorField === "both");

  const errorInputClass = "border-destructive focus-visible:ring-destructive/30";

  // ── Empty / Not Empty: chip inside input-like container ────────────────────
  if (NO_VALUE_OPS.has(op)) {
    return (
      <div className="flex h-8 items-center rounded-md border border-input bg-background px-2 text-xs">
        <span className="inline-flex items-center gap-1 rounded-sm bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
          {t(`filter.operators.${op}` as Parameters<typeof t>[0])}
          <button
            type="button"
            className="ml-0.5 cursor-pointer rounded-sm opacity-60 hover:opacity-100 transition-opacity"
            onClick={() => {
              const ops = field?.operators ?? getDefaultOperators(fieldType);
              const firstOp = ops[0]?.value ?? "contains";
              onUpdate({ operator: firstOp, value: "" });
            }}
            aria-label="Clear operator"
          >
            <X className="size-3" />
          </button>
        </span>
      </div>
    );
  }

  // ── Between / BetweenInclusive ───────────────────────────────────────────
  if (BETWEEN_OPS.has(op)) {
    if (fieldType === "date") {
      return (
        <DateRangePicker
          valueFrom={filter.value}
          valueTo={filter.value2}
          onChange={(from, to) => onUpdate({ value: from, value2: to })}
          onClear={() => onUpdate({ value: "", value2: "" })}
          disabled={!filter.fieldKey}
          className="h-8 text-xs"
        />
      );
    }

    return (
      <div className="flex items-center gap-1">
        <Input
          type={fieldType === "number" ? "number" : "text"}
          value={filter.value}
          onChange={(e) => onUpdate({ value: e.target.value })}
          disabled={!filter.fieldKey}
          placeholder={t("filter.min")}
          className={`h-8 text-xs ${hasValueError ? errorInputClass : ""}`}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onApply();
            }
          }}
        />
        <span className="shrink-0 text-xs text-muted-foreground">—</span>
        <Input
          type={fieldType === "number" ? "number" : "text"}
          value={filter.value2 ?? ""}
          onChange={(e) => onUpdate({ value2: e.target.value })}
          disabled={!filter.fieldKey}
          placeholder={t("filter.max")}
          className={`h-8 text-xs ${hasValue2Error ? errorInputClass : ""}`}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onApply();
            }
          }}
        />
      </div>
    );
  }

  // ── Select field ─────────────────────────────────────────────────────────
  if (fieldType === "select" && field?.options) {
    return (
      <SearchableSelect
        value={filter.value || undefined}
        onValueChange={(v) => onUpdate({ value: v })}
        options={field.options}
        placeholder={t("filter.value")}
        disabled={!filter.fieldKey}
        className="h-8 text-xs"
      />
    );
  }

  // ── Date field (single) ──────────────────────────────────────────────────
  if (fieldType === "date") {
    return (
      <DatePicker
        value={filter.value}
        onChange={(val) => onUpdate({ value: val })}
        disabled={!filter.fieldKey}
        className="h-8 text-xs"
      />
    );
  }

  // ── Default: text / number input ─────────────────────────────────────────
  return (
    <Input
      type={fieldType === "number" ? "number" : "text"}
      value={filter.value}
      onChange={(e) => onUpdate({ value: e.target.value })}
      disabled={!filter.fieldKey}
      placeholder={t("filter.value")}
      className={`h-8 text-xs ${hasValueError ? errorInputClass : ""}`}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onApply();
        }
      }}
    />
  );
}
