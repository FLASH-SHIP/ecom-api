"use client";

import { trpc } from "@customer/lib/trpc";
import { Button } from "@ecom/ui/components/button";
import { Checkbox } from "@ecom/ui/components/checkbox";
import { Field, FieldError, FieldGroup, FieldLabel } from "@ecom/ui/components/field";
import { Input } from "@ecom/ui/components/input";
import { BaseModal, BaseModalContent } from "@ecom/ui/components/modals/base-modal";
import { SearchableSelect } from "@ecom/ui/components/searchable-select";
import { cn } from "@ecom/ui/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type Control,
  Controller,
  type FieldErrors,
  type FieldValues,
  type UseFormRegister,
  type UseFormSetValue,
  type UseFormWatch,
  useForm,
} from "react-hook-form";
import { z } from "zod";

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

export interface PackingType {
  id: number;
  name: string;
  image: string | null;
  status: string;
}

export interface PackageFormFields {
  packageName: string;
  packingTypeId: number;
  length?: string;
  width?: string;
  height?: string;
  weight: string;
}

export interface PackageInfoSectionProps<TFieldValues extends FieldValues = FieldValues> {
  control: Control<TFieldValues>;
  register: UseFormRegister<TFieldValues>;
  errors: FieldErrors<TFieldValues>;
  setValue: UseFormSetValue<TFieldValues>;
  watch: UseFormWatch<TFieldValues>;
  savePackageSetting: boolean;
  setSavePackageSetting: (val: boolean) => void;
  selectedPackageId: number | null;
  setSelectedPackageId: (val: number | null) => void;
  savedPackages: SavedPackage[];
}

// ---------------------------------------------------------------------------
// Add / Edit form schema inside modal
// ---------------------------------------------------------------------------
const packageSchema = z.object({
  packageName: z.string().min(1, "Package name is required"),
  packingTypeId: z.number({ message: "Please select type of packaging" }).int().positive(),
  length: z.string().optional(),
  width: z.string().optional(),
  height: z.string().optional(),
  weight: z
    .string()
    .min(1, "Weight is required")
    .refine(
      (val) => !Number.isNaN(Number(val)) && Number(val) > 0,
      "Weight must be greater than 0",
    ),
  isDefault: z.boolean(),
});
type PackageSchemaValues = z.infer<typeof packageSchema>;

// ---------------------------------------------------------------------------
// Radio indicator for the select list
// ---------------------------------------------------------------------------
function RadioIndicator({ selected }: { selected: boolean }) {
  return (
    <span
      className={cn(
        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
        selected ? "border-[#0F798C] bg-[#FDFFFF]" : "border-[#DADADA] bg-[#FDFFFF]",
      )}
    >
      {selected && <span className="h-3 w-3 rounded-full bg-[#0F798C]" />}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function PackageInfoSection<TFieldValues extends FieldValues = FieldValues>({
  control,
  register,
  errors,
  setValue,
  watch,
  savePackageSetting: _savePackageSetting,
  setSavePackageSetting,
  selectedPackageId,
  setSelectedPackageId,
  savedPackages,
}: PackageInfoSectionProps<TFieldValues>) {
  const _controlParent = control as unknown as Control<PackageFormFields>;
  const registerParent = register as unknown as UseFormRegister<PackageFormFields>;
  const setValueParent = setValue as unknown as UseFormSetValue<PackageFormFields>;
  const watchParent = watch as unknown as UseFormWatch<PackageFormFields>;
  const _errorsParent = errors as unknown as FieldErrors<PackageFormFields>;

  const trpcUtils = trpc.useUtils();
  const deleteMutation = trpc.customer.packages.delete.useMutation({
    onSuccess: () => trpcUtils.customer.packages.list.invalidate(),
  });
  const updateMutation = trpc.customer.packages.update.useMutation({
    onSuccess: () => trpcUtils.customer.packages.list.invalidate(),
  });
  const createMutation = trpc.customer.packages.create.useMutation({
    onSuccess: () => trpcUtils.customer.packages.list.invalidate(),
  });

  const { data: packingTypesData } = trpc.customer.orders.listPackingTypes.useQuery();

  // --- Modals State ---
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<SavedPackage | null>(null);
  const [packageSearch, setPackageSearch] = useState("");

  // Auto-select the default package on first load
  const autoSelectedRef = useRef(false);
  useEffect(() => {
    if (autoSelectedRef.current || savedPackages.length === 0) return;
    const defaultPkg = savedPackages.find((p) => p.isDefault);
    if (defaultPkg) {
      setSelectedPackageId(defaultPkg.id);
      setValueParent("packageName", defaultPkg.packageName);
      setValueParent("packingTypeId", defaultPkg.packingTypeId ?? 0);
      setValueParent("length", defaultPkg.length !== null ? String(defaultPkg.length) : "");
      setValueParent("width", defaultPkg.width !== null ? String(defaultPkg.width) : "");
      setValueParent("height", defaultPkg.height !== null ? String(defaultPkg.height) : "");
      setValueParent("weight", String(defaultPkg.weight));
      setSavePackageSetting(false);
    }
    autoSelectedRef.current = true;
  }, [savedPackages, setSelectedPackageId, setValueParent, setSavePackageSetting]);

  // --- Sub-modal Form ---
  const {
    register: registerSub,
    handleSubmit: handleSubmitSub,
    control: controlSub,
    setValue: setSubValue,
    reset: resetSubForm,
    watch: watchSub,
    formState: { errors: subErrors, isSubmitting: isSubmittingSub },
  } = useForm<PackageSchemaValues>({
    resolver: zodResolver(packageSchema),
    defaultValues: {
      packageName: "",
      packingTypeId: undefined,
      length: "",
      width: "",
      height: "",
      weight: "",
      isDefault: false,
    },
  });

  // Set default packing type when packingTypesData finishes loading
  useEffect(() => {
    if (packingTypesData?.items && packingTypesData.items.length > 0) {
      setSubValue("packingTypeId", packingTypesData.items[0]?.id ?? 0);
    }
  }, [packingTypesData, setSubValue]);

  // --- Handlers ---
  const handleSelectSavedPackage = useCallback(
    (pkg: SavedPackage) => {
      setSelectedPackageId(pkg.id);
      setValueParent("packageName", pkg.packageName);
      setValueParent("packingTypeId", pkg.packingTypeId ?? 0);
      setValueParent("length", pkg.length !== null ? String(pkg.length) : "");
      setValueParent("width", pkg.width !== null ? String(pkg.width) : "");
      setValueParent("height", pkg.height !== null ? String(pkg.height) : "");
      setValueParent("weight", String(pkg.weight));
      setSavePackageSetting(false);
      setIsSelectOpen(false);
    },
    [setValueParent, setSelectedPackageId, setSavePackageSetting],
  );

  const openNewForm = useCallback(() => {
    setEditingPackage(null);
    resetSubForm({
      packageName: "",
      packingTypeId: packingTypesData?.items[0]?.id ?? 0,
      length: "",
      width: "",
      height: "",
      weight: "",
      isDefault: false,
    });
    setIsSelectOpen(false);
    setIsFormOpen(true);
  }, [resetSubForm, packingTypesData]);

  const openEditForm = useCallback(
    (pkg: SavedPackage) => {
      setEditingPackage(pkg);
      resetSubForm({
        packageName: pkg.packageName,
        packingTypeId: pkg.packingTypeId ?? 0,
        length: pkg.length !== null ? String(pkg.length) : "",
        width: pkg.width !== null ? String(pkg.width) : "",
        height: pkg.height !== null ? String(pkg.height) : "",
        weight: String(pkg.weight),
        isDefault: pkg.isDefault,
      });
      setIsSelectOpen(false);
      setIsFormOpen(true);
    },
    [resetSubForm],
  );

  const handleSubFormSubmit = async (data: PackageSchemaValues) => {
    try {
      const payload = {
        label: data.packageName,
        packageName: data.packageName,
        packingTypeId: data.packingTypeId,
        length: data.length ? Number(data.length) : null,
        width: data.width ? Number(data.width) : null,
        height: data.height ? Number(data.height) : null,
        weight: Number(data.weight),
        isDefault: data.isDefault,
      };

      let result: SavedPackage;
      if (editingPackage) {
        result = (await updateMutation.mutateAsync({
          id: editingPackage.id,
          data: payload,
        })) as unknown as SavedPackage;

        // Only update parent form values if editing the currently selected package
        if (selectedPackageId === editingPackage.id) {
          handleSelectSavedPackage(result);
        }
      } else {
        result = (await createMutation.mutateAsync(payload)) as unknown as SavedPackage;
      }

      setIsFormOpen(false);
      setIsSelectOpen(true);
    } catch (e) {
      console.error("Failed to save packaging:", e);
    }
  };

  const handleDelete = async (pkg: SavedPackage) => {
    if (confirm("Are you sure you want to delete this packaging?")) {
      try {
        await deleteMutation.mutateAsync({ id: pkg.id });
        if (selectedPackageId === pkg.id) {
          setSelectedPackageId(null);
          setValueParent("packageName", "");
          setValueParent("packingTypeId", 0);
          setValueParent("length", "");
          setValueParent("width", "");
          setValueParent("height", "");
          setValueParent("weight", "");
        }
      } catch (e) {
        console.error("Failed to delete packaging:", e);
      }
    }
  };

  const handleBackToSelect = () => {
    setIsFormOpen(false);
    if (savedPackages.length > 0) {
      setIsSelectOpen(true);
    }
  };

  // --- Filtered List ---
  const filteredPackages = useMemo(() => {
    if (!packageSearch.trim()) return savedPackages;
    const q = packageSearch.toLowerCase();
    return savedPackages.filter((p) => p.packageName.toLowerCase().includes(q));
  }, [savedPackages, packageSearch]);

  // --- Read-only display info ---
  const watchedPackageName = watchParent("packageName");
  const watchedPackingTypeId = watchParent("packingTypeId");
  const watchedLength = watchParent("length");
  const watchedWidth = watchParent("width");
  const watchedHeight = watchParent("height");
  const watchedWeight = watchParent("weight");

  const selectedPt = useMemo(() => {
    return packingTypesData?.items.find((item) => item.id === watchedPackingTypeId);
  }, [packingTypesData, watchedPackingTypeId]);

  // --- Sub-form volume weight suggestion ---
  const subLength = watchSub("length");
  const subWidth = watchSub("width");
  const subHeight = watchSub("height");
  const subVolumeWeight = useMemo(() => {
    const l = Number(subLength) || 0;
    const w = Number(subWidth) || 0;
    const h = Number(subHeight) || 0;
    if (l === 0 || w === 0 || h === 0) return 0;
    return Math.round((l * w * h) / 5);
  }, [subLength, subWidth, subHeight]);

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-[#DADADA] bg-[#FDFFFF]">
      {/* Header */}
      <div className="flex items-center px-4 py-4 border-b border-[#DADADA] bg-[#FEFCFA]">
        <h3 className="text-lg 2xl:text-xl font-semibold text-[#232323] leading-6">Package Info</h3>
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col gap-4 bg-[#FDFFFF]">
        {!selectedPackageId ? (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-2">
            <span className="text-[#232323] text-sm md:text-base font-medium">
              No package data available. Please click 'Add New' to create a package.
            </span>
            <Button
              type="button"
              className="h-[52px] px-6 rounded-[10px] text-base font-semibold bg-[#0F798C] text-white hover:bg-[#0F798C]/90 flex items-center gap-2 cursor-pointer shrink-0"
              onClick={openNewForm}
            >
              <Plus className="h-6 w-6" />
              Add New
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
            {/* Left: image + info */}
            <div className="flex items-center gap-3">
              {selectedPt?.image && (
                // biome-ignore lint/performance/noImgElement: dynamic svg/png package image
                <img
                  src={selectedPt.image}
                  alt={selectedPt.name}
                  className="h-[60px] w-[60px] object-contain shrink-0"
                />
              )}
              <div className="flex flex-col gap-1">
                <span className="text-base 2xl:text-xl font-normal text-[#232323] leading-6">
                  {watchedPackageName}
                </span>
                <span className="text-sm 2xl:text-base font-normal text-[#7B7B7B] leading-5">
                  {watchedLength || 0} × {watchedWidth || 0} × {watchedHeight || 0} cm
                  {" - "}
                  {watchedWeight || 0} Gr
                </span>
              </div>
            </div>

            {/* Right: Change button */}
            <Button
              type="button"
              variant="outline"
              className="h-[52px] px-4 rounded-lg border border-[#DADADA] text-[#232323] text-base 2xl:text-xl font-medium bg-white hover:bg-muted shrink-0 cursor-pointer"
              onClick={() => setIsSelectOpen(true)}
            >
              Change Package
            </Button>

            {/* Hidden inputs */}
            <input type="hidden" {...registerParent("packageName")} />
            <input type="hidden" {...registerParent("packingTypeId")} />
            <input type="hidden" {...registerParent("length")} />
            <input type="hidden" {...registerParent("width")} />
            <input type="hidden" {...registerParent("height")} />
            <input type="hidden" {...registerParent("weight")} />
          </div>
        )}
      </div>

      {/* --- Select Saved Packaging modal --- */}
      <BaseModal open={isSelectOpen} onOpenChange={setIsSelectOpen}>
        <BaseModalContent
          title="Select Saved Packaging"
          searchPlaceholder="Search saved packaging…"
          searchValue={packageSearch}
          onSearchChange={setPackageSearch}
          onCreateNew={openNewForm}
          createLabel="Add new"
          listMaxHeight="60vh"
        >
          <div className="flex flex-col gap-3 py-2">
            {filteredPackages.map((pkg) => {
              const isSelected = selectedPackageId === pkg.id;
              const type = packingTypesData?.items.find((i) => i.id === pkg.packingTypeId);
              return (
                <div
                  key={pkg.id}
                  className={cn(
                    "flex items-center justify-between gap-4 rounded-lg border bg-background px-4 py-[14px]",
                    "shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)] transition-colors duration-150",
                    isSelected ? "border-[#0F798C]" : "border-border",
                  )}
                >
                  <Button
                    type="button"
                    variant="ghost"
                    className="flex flex-1 h-auto min-w-0 items-center justify-start gap-3 p-0 hover:bg-transparent hover:text-foreground text-left font-normal border-none shadow-none rounded cursor-pointer"
                    onClick={() => handleSelectSavedPackage(pkg)}
                  >
                    <RadioIndicator selected={isSelected} />
                    <div className="flex flex-col gap-1 min-w-0">
                      {/* Line 1: Name | Weight */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-semibold text-[#232323]">
                          {pkg.packageName}
                        </span>
                        <span className="text-sm text-[#7B7B7B]">|</span>
                        <span className="text-sm text-[#7B7B7B]">{pkg.weight} gr</span>
                        {pkg.isDefault && (
                          <span className="inline-flex items-center rounded bg-[#0F798C]/10 px-1.5 py-0.5 text-xs font-semibold text-[#0F798C]">
                            Default
                          </span>
                        )}
                      </div>
                      {/* Line 2: Packing type | Dims */}
                      <div className="flex items-center gap-2 min-w-0 text-sm text-[#7B7B7B]">
                        <span>{type?.name || "Standard Packaging"}</span>
                        <span>|</span>
                        <span>
                          {pkg.length ?? 0}x{pkg.width ?? 0}x{pkg.height ?? 0} cm
                        </span>
                      </div>
                    </div>
                  </Button>

                  {/* Actions */}
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={deleteMutation.isPending}
                      className="h-11 w-[82px] rounded-[10px] border-[#D32D20] text-[#D32D20] text-base font-normal hover:bg-[#D32D20]/10 hover:text-[#D32D20] cursor-pointer"
                      onClick={() => handleDelete(pkg)}
                    >
                      Delete
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-11 w-[82px] rounded-[10px] text-base font-normal cursor-pointer"
                      onClick={() => openEditForm(pkg)}
                    >
                      Edit
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </BaseModalContent>
      </BaseModal>

      {/* --- Add / Edit Packaging Modal --- */}
      <BaseModal open={isFormOpen} onOpenChange={setIsFormOpen}>
        <BaseModalContent
          title={editingPackage ? "Edit Packaging" : "New Packaging"}
          hideSearch
          listMaxHeight="70vh"
          footer={
            <>
              <Button
                type="button"
                variant="outline"
                className="h-9 lg:h-10 xl:h-11 2xl:h-[52px] px-6 text-xl font-medium rounded-lg"
                onClick={handleBackToSelect}
              >
                Back
              </Button>
              <Button
                type="button"
                disabled={isSubmittingSub}
                className="h-9 lg:h-10 xl:h-11 2xl:h-[52px] w-[98px] text-xl font-medium rounded-lg"
                onClick={handleSubmitSub(handleSubFormSubmit)}
              >
                {isSubmittingSub ? "Saving…" : "Submit"}
              </Button>
            </>
          }
        >
          <form onSubmit={handleSubmitSub(handleSubFormSubmit)}>
            <FieldGroup className="flex flex-col gap-4">
              {/* Packaging Type */}
              <Field>
                <FieldLabel>
                  Type of Packaging <span className="text-destructive">*</span>
                </FieldLabel>
                <Controller
                  name="packingTypeId"
                  control={controlSub}
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
                      placeholder="Select type of packaging"
                      searchPlaceholder="Search packaging type..."
                      allowClear={false}
                      className={cn(
                        "bg-background/50 border-input",
                        subErrors.packingTypeId && "border-destructive",
                      )}
                    />
                  )}
                />
                <FieldError errors={[subErrors.packingTypeId]} />
              </Field>

              {/* Dimensions */}
              <Field>
                <FieldLabel>
                  Package Dimensions (cm) <span className="text-destructive ml-0.5">*</span>
                </FieldLabel>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="Length"
                    {...registerSub("length")}
                    className={cn(subErrors.length && "border-destructive")}
                  />
                  <span className="text-muted-foreground">×</span>
                  <Input
                    type="number"
                    placeholder="Width"
                    {...registerSub("width")}
                    className={cn(subErrors.width && "border-destructive")}
                  />
                  <span className="text-muted-foreground">×</span>
                  <Input
                    type="number"
                    placeholder="Height"
                    {...registerSub("height")}
                    className={cn(subErrors.height && "border-destructive")}
                  />
                </div>
              </Field>

              {/* Weight */}
              <Field>
                <FieldLabel htmlFor="sub-weight">
                  Package Weight (gr) <span className="text-destructive ml-0.5">*</span>
                </FieldLabel>
                <div className="flex gap-2">
                  <Input
                    id="sub-weight"
                    type="number"
                    required
                    placeholder="0.00"
                    {...registerSub("weight")}
                    className={cn(
                      "w-2/3 bg-background/50",
                      subErrors.weight && "border-destructive",
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
                <FieldError errors={[subErrors.weight]} />
                {subVolumeWeight > 0 && (
                  <p className="text-sm text-blue-500 mt-1">
                    Suggested volume weight: {subVolumeWeight.toLocaleString()} gr
                  </p>
                )}
              </Field>

              {/* Package Label / Name */}
              <Field>
                <FieldLabel htmlFor="sub-packageName">
                  Package Name <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  id="sub-packageName"
                  type="text"
                  required
                  placeholder="Enter package name"
                  {...registerSub("packageName")}
                  className={cn(subErrors.packageName && "border-destructive")}
                />
                <FieldError errors={[subErrors.packageName]} />
              </Field>

              {/* Default Checkbox */}
              <div className="flex items-center space-x-2 py-2">
                <Controller
                  name="isDefault"
                  control={controlSub}
                  render={({ field }) => (
                    <Checkbox
                      id="sub-isDefault"
                      checked={field.value}
                      onCheckedChange={(c) => field.onChange(!!c)}
                    />
                  )}
                />
                <label
                  htmlFor="sub-isDefault"
                  className="text-sm font-semibold cursor-pointer select-none"
                >
                  Set as Default
                </label>
              </div>
            </FieldGroup>
          </form>
        </BaseModalContent>
      </BaseModal>
    </div>
  );
}
