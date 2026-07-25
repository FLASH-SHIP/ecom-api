"use client";

import { trpc } from "@customer/lib/trpc";
import { translate } from "@ecom/i18n";
import { useI18n } from "@ecom/shared/@i18n";
import { Checkbox } from "@ecom/ui/components/checkbox";
import { Field, FieldError, FieldGroup, FieldLabel } from "@ecom/ui/components/field";
import { Input } from "@ecom/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ecom/ui/components/select";
import { cn } from "@ecom/ui/lib/utils";
import { useEffect, useMemo, useRef } from "react";
import {
  type Control,
  Controller,
  type FieldErrors,
  type FieldValues,
  type UseFormRegister,
  type UseFormSetValue,
  type UseFormWatch,
} from "react-hook-form";
import type { OrderFormValues } from "./page";
import { SearchableSelect } from "@customer/components/ui/searchable-select";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface SavedPackage {
  id: number;
  label: string | null;
  packageName: string;
  packingTypeId: number | null;
  length: number | null;
  width: number | null;
  height: number | null;
  weight: number;
  isDefault: boolean;
}

export interface PackageFormFields {
  packageName: string;
  packingTypeId: number;
  length?: string;
  width?: string;
  height?: string;
  weight: string;
}

export interface PackageInfoSectionProps {
  control: Control<OrderFormValues>;
  register: UseFormRegister<OrderFormValues>;
  errors: FieldErrors<OrderFormValues>;
  setValue: UseFormSetValue<OrderFormValues>;
  watch: UseFormWatch<OrderFormValues>;
  savePackageSetting: boolean;
  setSavePackageSetting: (val: boolean) => void;
  selectedPackageId: number | null;
  setSelectedPackageId: (val: number | null) => void;
  savedPackages: SavedPackage[];
}

export function PackageInfoSection({
  control,
  register,
  errors,
  setValue,
  watch,
  savePackageSetting,
  setSavePackageSetting,
  selectedPackageId,
  setSelectedPackageId,
  savedPackages,
}: PackageInfoSectionProps) {
  const { languageId: currentLocale } = useI18n();
  const controlParent = control as unknown as Control<PackageFormFields>;
  const registerParent = register as unknown as UseFormRegister<PackageFormFields>;
  const setValueParent = setValue as unknown as UseFormSetValue<PackageFormFields>;
  const watchParent = watch as unknown as UseFormWatch<PackageFormFields>;
  const errorsParent = errors as unknown as FieldErrors<PackageFormFields>;

  const { data: packingTypesData } = trpc.customer.orders.listPackingTypes.useQuery();

  // Auto-select the default package on first load
  const autoSelectedRef = useRef(false);
  useEffect(() => {
    if (autoSelectedRef.current || savedPackages.length === 0) return;
    const defaultPkg = savedPackages.find((p) => p.isDefault);
    if (defaultPkg) {
      handleSelectSavedPackage(defaultPkg.id.toString());
    }
    autoSelectedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedPackages]);

  // Set default packing type for new package form if empty
  const watchedPackingTypeId = watchParent("packingTypeId");
  useEffect(() => {
    if (!watchedPackingTypeId && packingTypesData?.items && packingTypesData.items.length > 0) {
      setValueParent("packingTypeId", packingTypesData.items[0]?.id ?? 0);
    }
  }, [watchedPackingTypeId, packingTypesData, setValueParent]);

  const handleSelectSavedPackage = (value: string) => {
    if (value === "new") {
      setSelectedPackageId(null);
      setValueParent("packageName", "");
      setValueParent("packingTypeId", packingTypesData?.items[0]?.id ?? 0);
      setValueParent("length", "");
      setValueParent("width", "");
      setValueParent("height", "");
      setValueParent("weight", "");
      setSavePackageSetting(false);
      return;
    }

    const id = Number(value);
    const pkg = savedPackages.find((p) => p.id === id);
    if (!pkg) return;

    setSelectedPackageId(id);
    setValueParent("packageName", pkg.packageName);
    setValueParent("packingTypeId", pkg.packingTypeId ?? 0);
    setValueParent("length", pkg.length !== null ? String(pkg.length) : "");
    setValueParent("width", pkg.width !== null ? String(pkg.width) : "");
    setValueParent("height", pkg.height !== null ? String(pkg.height) : "");
    setValueParent("weight", String(pkg.weight));
    setSavePackageSetting(false);
  };

  const isNewPackage = selectedPackageId === null;

  const watchedPackageName = watchParent("packageName");
  const watchedLength = watchParent("length");
  const watchedWidth = watchParent("width");
  const watchedHeight = watchParent("height");
  const watchedWeight = watchParent("weight");

  const selectedPt = useMemo(() => {
    return packingTypesData?.items.find((item) => item.id === watchedPackingTypeId);
  }, [packingTypesData, watchedPackingTypeId]);

  const volumeWeight = useMemo(() => {
    const l = Number(watchedLength) || 0;
    const w = Number(watchedWidth) || 0;
    const h = Number(watchedHeight) || 0;
    if (l === 0 || w === 0 || h === 0) return 0;
    return Math.round((l * w * h) / 5);
  }, [watchedLength, watchedWidth, watchedHeight]);

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-[#DADADA] bg-[#FDFFFF]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 2xl:py-4 border-b border-[#DADADA] bg-[#FEFCFA]">
        <h3 className="text-base 2xl:text-xl font-semibold text-[#232323] leading-6">
          {translate("customerOrder.single.packageInfo", currentLocale)}
        </h3>
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col gap-4 bg-[#FDFFFF]">
        <FieldGroup>
          {/* Dropdown for package selection */}
          <Field>
            <Select
              value={selectedPackageId ? String(selectedPackageId) : "new"}
              onValueChange={handleSelectSavedPackage}
            >
              <SelectTrigger className="w-full h-auto min-h-[68px] bg-background/50 border-input items-center">
                <SelectValue
                  placeholder={translate("customerOrder.placeholder.selectPackage", currentLocale)}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new" className="py-3 cursor-pointer">
                  <div className="flex flex-col text-left">
                    <span className="text-base 2xl:text-2xl text-[#232323]">
                      {translate("customerOrder.single.newPackage", currentLocale)}
                    </span>
                    <span className="text-sm 2xl:text-base text-[#7B7B7B]">
                      {translate("customerOrder.single.newPackageDesc", currentLocale)}
                    </span>
                  </div>
                </SelectItem>
                {savedPackages.map((pkg) => {
                  const type = packingTypesData?.items.find((i) => i.id === pkg.packingTypeId);
                  return (
                    <SelectItem key={pkg.id} value={String(pkg.id)} className="py-3 cursor-pointer">
                      <div className="flex flex-col text-left">
                        <span className="text-base 2xl:text-2xl text-[#232323]">
                          {pkg.packageName}
                        </span>
                        <span className="text-sm 2xl:text-base text-[#7B7B7B] line-clamp-1 break-all">
                          {type?.name} | {pkg.length ?? 0}x{pkg.width ?? 0}x{pkg.height ?? 0} cm
                        </span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </Field>

          {/* Form fields: Hidden when !isNewPackage to preserve RHF state */}
          <div className={cn("flex flex-col gap-4", !isNewPackage && "hidden")}>
            {/* Packaging Type */}
            <Field className="mt-2">
              <FieldLabel>
                {translate("customerOrder.single.typeOfPackaging", currentLocale)}{" "}
                <span className="text-destructive">*</span>
              </FieldLabel>
              <Controller
                name="packingTypeId"
                control={controlParent}
                render={({ field }) => (
                  <SearchableSelect
                    value={field.value ? String(field.value) : ""}
                    onValueChange={(v) => field.onChange(v ? Number(v) : 0)}
                    options={
                      packingTypesData?.items.map((pt) => ({
                        value: String(pt.id),
                        label: pt.name,
                        image: pt.image,
                      })) ?? []
                    }
                    placeholder={translate(
                      "customerOrder.placeholder.selectPackaging",
                      currentLocale,
                    )}
                    searchPlaceholder={translate(
                      "customerOrder.placeholder.selectPackaging",
                      currentLocale,
                    )}
                    allowClear={false}
                    className={cn(
                      "bg-background/50 border-input",
                      errorsParent.packingTypeId && "border-destructive",
                    )}
                  />
                )}
              />
              <FieldError errors={[errorsParent.packingTypeId]} />
            </Field>

            {/* Dimensions */}
            <Field>
              <FieldLabel>
                {translate("customerOrder.single.packageDimensionsCm", currentLocale)}{" "}
                <span className="text-destructive ml-0.5">*</span>
              </FieldLabel>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder={translate("customerOrder.placeholder.length", currentLocale)}
                  {...registerParent("length")}
                  className={cn(errorsParent.length && "border-destructive")}
                />
                <span className="text-muted-foreground">×</span>
                <Input
                  type="number"
                  placeholder={translate("customerOrder.placeholder.width", currentLocale)}
                  {...registerParent("width")}
                  className={cn(errorsParent.width && "border-destructive")}
                />
                <span className="text-muted-foreground">×</span>
                <Input
                  type="number"
                  placeholder={translate("customerOrder.placeholder.height", currentLocale)}
                  {...registerParent("height")}
                  className={cn(errorsParent.height && "border-destructive")}
                />
              </div>
            </Field>

            {/* Weight */}
            <Field>
              <FieldLabel htmlFor="package-weight">
                {translate("customerOrder.single.packageWeightGr", currentLocale)}{" "}
                <span className="text-destructive ml-0.5">*</span>
              </FieldLabel>
              <div className="flex gap-2">
                <Input
                  id="package-weight"
                  type="number"
                  required
                  placeholder="0.00"
                  {...registerParent("weight")}
                  className={cn(
                    "w-2/3 bg-background/50",
                    errorsParent.weight && "border-destructive",
                  )}
                />
                <SearchableSelect
                  value="gram"
                  options={[{ value: "gram", label: "Gram" }]}
                  placeholder="Unit"
                  allowClear={false}
                  className="w-1/3 bg-background/50 border-input"
                />
              </div>
              <FieldError errors={[errorsParent.weight]} />
              {volumeWeight > 0 && (
                <p className="text-sm text-blue-500 mt-1">
                  Suggested volume weight: {volumeWeight.toLocaleString()} gr
                </p>
              )}
            </Field>

            {/* Package Name */}
            <Field>
              <FieldLabel htmlFor="packageName">
                {translate("customerOrder.single.packageName", currentLocale)}{" "}
                <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="packageName"
                type="text"
                required
                placeholder={translate("customerOrder.placeholder.enterPackageName", currentLocale)}
                {...registerParent("packageName")}
                className={cn(errorsParent.packageName && "border-destructive")}
              />
              <FieldError errors={[errorsParent.packageName]} />
            </Field>
          </div>

          {/* Save Setting Checkbox */}
          {isNewPackage && (
            <Field orientation="horizontal" className="items-center gap-2 mt-2">
              <Checkbox
                id="save-package"
                checked={savePackageSetting}
                onCheckedChange={(c) => setSavePackageSetting(!!c)}
                className="w-4 h-4 xl:w-5 xl:h-5 2xl:w-6 2xl:h-6"
              />
              <FieldLabel
                htmlFor="save-package"
                className="text-base font-medium text-[#232323] cursor-pointer select-none"
              >
                {translate("customerOrder.single.saveSetting", currentLocale)}
              </FieldLabel>
            </Field>
          )}
        </FieldGroup>
      </div>
    </div>
  );
}
