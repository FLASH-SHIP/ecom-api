"use client";

import { trpc } from "@customer/lib/trpc";
import { Button } from "@ecom/ui/components/button";
import { Checkbox } from "@ecom/ui/components/checkbox";
import { Field, FieldError, FieldGroup, FieldLabel } from "@ecom/ui/components/field";
import { Input } from "@ecom/ui/components/input";
import { BaseModal, BaseModalClose, BaseModalContent } from "@ecom/ui/components/modals/base-modal";
import { SearchableSelect } from "@ecom/ui/components/searchable-select";
import { cn } from "@ecom/ui/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type SavedSender = {
  id: number;
  label: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  address: string;
  city: string;
  cityName?: string | null;
  ward: string | null;
  wardName?: string | null;
  zipCode: string | null;
  country: string | null;
  isDefault: boolean;
};

// Helper to format full address with ward and city names
function formatSenderAddress(sender: {
  address: string;
  city: string;
  cityName?: string | null;
  ward: string | null;
  wardName?: string | null;
  country: string | null;
}) {
  const parts = [sender.address];
  const wardText = sender.wardName || sender.ward;
  if (wardText) parts.push(wardText);
  const cityText = sender.cityName || sender.city;
  if (cityText) parts.push(cityText);

  const addressString = parts.join(", ");
  return sender.country ? `${addressString} (${sender.country})` : addressString;
}

// ---------------------------------------------------------------------------
// Add / Edit form schema
// ---------------------------------------------------------------------------
const senderFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").or(z.literal("")).optional(),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  ward: z.string().min(1, "Ward is required"),
  zipCode: z.string().optional(),
  country: z.string(),
  isDefault: z.boolean(),
});
type SenderFormValues = z.infer<typeof senderFormSchema>;

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
// Props
// ---------------------------------------------------------------------------
export interface SenderSectionProps {
  selectedSenderId: number | null;
  onSenderSelected: (sender: SavedSender) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function SenderSection({ selectedSenderId, onSenderSelected }: SenderSectionProps) {
  const trpcUtils = trpc.useUtils();
  const { data: savedSenders = [], isLoading } = trpc.customer.senders.list.useQuery();
  const createMutation = trpc.customer.senders.create.useMutation({
    onSuccess: () => trpcUtils.customer.senders.list.invalidate(),
  });
  const updateMutation = trpc.customer.senders.update.useMutation({
    onSuccess: () => trpcUtils.customer.senders.list.invalidate(),
  });
  const deleteMutation = trpc.customer.senders.delete.useMutation({
    onSuccess: () => trpcUtils.customer.senders.list.invalidate(),
  });

  // ── Modal states ──────────────────────────────────────────────────────────
  // isSelectOpen: the "Select Saved Sender" list modal
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  // isFormOpen: the "New Sender / Edit Sender" form modal
  const [isFormOpen, setIsFormOpen] = useState(false);
  // editingSender: null = create new, sender = edit mode
  const [editingSender, setEditingSender] = useState<SavedSender | null>(null);
  // After form submit, should we re-open the select modal?
  const returnToSelectRef = useRef(false);

  const [senderSearch, setSenderSearch] = useState("");

  // ── Derived ───────────────────────────────────────────────────────────────
  const selectedSender = useMemo(
    () => savedSenders.find((s) => s.id === selectedSenderId) ?? null,
    [savedSenders, selectedSenderId],
  );

  // Auto-select the default sender on first load
  const autoSelectedRef = useRef(false);
  useEffect(() => {
    if (autoSelectedRef.current || savedSenders.length === 0) return;
    const defaultSender = savedSenders.find((s) => s.isDefault);
    if (defaultSender) {
      onSenderSelected(defaultSender);
    }
    autoSelectedRef.current = true;
  }, [savedSenders, onSenderSelected]);

  // ── Form ──────────────────────────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    formState: { errors: formErrors, isSubmitting },
    reset: resetForm,
    control: formControl,
    watch: watchForm,
    setValue: setFormValue,
  } = useForm<SenderFormValues>({
    resolver: zodResolver(senderFormSchema),
    defaultValues: { country: "VN", isDefault: false },
  });

  // Province / ward for the form modal (React Query caches — no double fetch)
  const watchedFormCity = watchForm("city");
  const [provinceSearch, setProvinceSearch] = useState("");
  const { data: provincesData, isFetching: provincesFetching } =
    trpc.customer.divisions.listProvinces.useQuery(
      { search: provinceSearch || undefined },
      { placeholderData: (prev) => prev },
    );
  // Use province code (number string) as option value for accurate pre-fill
  const provinceOptions = useMemo(
    () => (provincesData ?? []).map((p) => ({ value: String(p.code), label: p.name })),
    [provincesData],
  );
  // watchedFormCity is now a code string — parse directly
  const selectedProvinceCode = useMemo(() => {
    const n = Number(watchedFormCity);
    return n > 0 ? n : undefined;
  }, [watchedFormCity]);

  const [wardSearch, setWardSearch] = useState("");
  const { data: wardsData, isFetching: wardsFetching } = trpc.customer.divisions.listWards.useQuery(
    { provinceCode: selectedProvinceCode ?? 0, search: wardSearch || undefined },
    { enabled: !!selectedProvinceCode, placeholderData: (prev) => prev },
  );
  // Use ward code (number string) as option value
  const wardOptions = useMemo(
    () => (wardsData ?? []).map((w) => ({ value: String(w.code), label: w.name })),
    [wardsData],
  );

  // Reset ward when city changes inside the form
  const prevFormCityRef = useRef(watchedFormCity);
  useEffect(() => {
    if (prevFormCityRef.current !== watchedFormCity) {
      setFormValue("ward", "");
      prevFormCityRef.current = watchedFormCity;
    }
  }, [watchedFormCity, setFormValue]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  /** Open the form modal for creating a new sender */
  const openAddForm = useCallback(
    (returnToSelect: boolean) => {
      setEditingSender(null);
      resetForm({ country: "VN", isDefault: false });
      returnToSelectRef.current = returnToSelect;
      setIsSelectOpen(false);
      setIsFormOpen(true);
    },
    [resetForm],
  );

  /** Open the form modal for editing an existing sender */
  const openEditForm = useCallback(
    (sender: SavedSender) => {
      setEditingSender(sender);

      // Smart city code resolution: supports both new (code) and old (name) stored values
      const cityEntry = provincesData?.find(
        (p) => String(p.code) === sender.city || p.name === sender.city,
      );
      const cityCode = cityEntry ? String(cityEntry.code) : "";

      // Ward: use stored value if it looks like a code; otherwise empty
      // (old name-based records will show empty — user re-selects ward)
      const wardCode = sender.ward && !Number.isNaN(Number(sender.ward)) ? sender.ward : "";

      // Pre-update the city ref so the ward-reset effect doesn't fire
      // when resetForm changes watchedFormCity to cityCode.
      // Without this, the effect sees city as "changed" and clears ward immediately.
      prevFormCityRef.current = cityCode;

      resetForm({
        name: sender.name,
        phone: sender.phone ?? "",
        email: sender.email ?? "",
        address: sender.address,
        city: cityCode,
        ward: wardCode,
        zipCode: sender.zipCode ?? "",
        country: sender.country ?? "VN",
        isDefault: sender.isDefault,
      });
      returnToSelectRef.current = true;
      setIsSelectOpen(false);
      setIsFormOpen(true);
    },
    [resetForm, provincesData],
  );

  /** Close the form and return to the Select Saved Sender modal (Edit mode Back) */
  const handleBackToSelect = useCallback(() => {
    setIsFormOpen(false);
    resetForm({ country: "VN", isDefault: false });
    // Small delay to avoid modal animation conflict
    setTimeout(() => setIsSelectOpen(true), 150);
  }, [resetForm]);

  /** Submit handler for both Create and Edit */
  const handleFormSubmit = async (data: SenderFormValues) => {
    if (editingSender) {
      // ── Edit mode
      await updateMutation.mutateAsync({
        id: editingSender.id,
        data: {
          name: data.name,
          phone: data.phone || null,
          email: data.email || null,
          address: data.address,
          city: data.city,
          ward: data.ward || null,
          zipCode: data.zipCode || null,
          country: data.country,
          isDefault: data.isDefault,
        },
      });
    } else {
      // ── Create mode
      const newSender = await createMutation.mutateAsync({
        name: data.name,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address,
        city: data.city,
        ward: data.ward || null,
        zipCode: data.zipCode || null,
        country: data.country,
        isDefault: data.isDefault,
      });
      // Auto-select the newly created sender
      onSenderSelected(newSender as SavedSender);
    }

    setIsFormOpen(false);
    resetForm({ country: "VN", isDefault: false });

    // After form closes, open select modal if flow requires
    if (returnToSelectRef.current) {
      setIsSelectOpen(true);
    }
  };

  /** Delete a sender (soft-delete via tRPC) */
  const handleDelete = useCallback(
    async (sender: SavedSender) => {
      await deleteMutation.mutateAsync({ id: sender.id });
      // If deleted was the currently selected sender, clear it
      if (sender.id === selectedSenderId) {
        // Let parent know via selecting the next default if any
        const remaining = savedSenders.filter((s) => s.id !== sender.id);
        const next = remaining.find((s) => s.isDefault) ?? remaining[0];
        if (next) onSenderSelected(next);
      }
    },
    [deleteMutation, selectedSenderId, savedSenders, onSenderSelected],
  );

  /** Select a sender from the list modal */
  const handleSelectFromList = useCallback(
    (sender: SavedSender) => {
      onSenderSelected(sender);
      setIsSelectOpen(false);
      setSenderSearch("");
    },
    [onSenderSelected],
  );

  // Filtered list for search
  const filteredSenders = useMemo(() => {
    const q = senderSearch.trim().toLowerCase();
    if (!q) return savedSenders;
    return savedSenders.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.phone ?? "").toLowerCase().includes(q) ||
        s.address.toLowerCase().includes(q),
    );
  }, [savedSenders, senderSearch]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Sender card ─────────────────────────────────────────────────── */}
      <div className="flex flex-col overflow-hidden rounded-lg border border-[#DADADA] bg-[#FDFFFF]">
        {/* Header */}
        <div className="flex items-center px-4 py-4 leading-6 border-b border-[#DADADA] bg-[#FEFCFA]">
          <h3 className="text-lg 2xl:text-xl font-semibold text-foreground">Sender</h3>
        </div>

        {/* Body */}
        <div className="flex items-center justify-between gap-4 px-4 py-4 min-h-[84px]">
          {isLoading ? (
            <div className="flex flex-1 flex-col gap-2">
              <div className="h-5 w-48 animate-pulse rounded bg-muted" />
              <div className="h-4 w-64 animate-pulse rounded bg-muted" />
            </div>
          ) : selectedSender ? (
            /* ── Selected state ── */
            <>
              <div className="flex flex-col gap-1 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-medium text-foreground">
                    {selectedSender.name}
                  </span>
                  {selectedSender.phone && (
                    <>
                      <span className="text-base text-muted-foreground">|</span>
                      <span className="text-base text-muted-foreground">
                        {selectedSender.phone}
                      </span>
                    </>
                  )}
                </div>
                <span className="text-sm text-muted-foreground truncate">
                  {formatSenderAddress(selectedSender)}
                </span>
              </div>

              <Button
                type="button"
                variant="outline"
                className="h-9 lg:h-10 xl:h-11 2xl:h-[52px] shrink-0 rounded-lg px-4 text-base font-medium"
                onClick={() => setIsSelectOpen(true)}
              >
                Change Sender
              </Button>
            </>
          ) : (
            /* ── Empty state ── */
            <>
              <p className="text-base text-muted-foreground flex-1">
                No sender data available. Please click &lsquo;Add New&rsquo; to create a sender.
              </p>
              <Button
                type="button"
                className="h-9 lg:h-10 xl:h-11 2xl:h-[52px] shrink-0 rounded-[10px] px-4 text-xl font-medium"
                onClick={() => openAddForm(false)}
              >
                <Plus data-icon="inline-start" />
                Add New
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Select Saved Sender modal ────────────────────────────────────── */}
      <BaseModal open={isSelectOpen} onOpenChange={setIsSelectOpen}>
        <BaseModalContent
          title="Select Saved Sender"
          searchValue={senderSearch}
          onSearchChange={setSenderSearch}
          searchPlaceholder="Search by name / phone number…"
          createLabel="Create new"
          onCreateNew={() => openAddForm(true)}
          isLoading={isLoading}
          listMaxHeight="460px"
          emptyState={
            <p className="py-8 text-center text-sm text-muted-foreground">
              No saved senders found.
            </p>
          }
        >
          {filteredSenders.map((sender) => {
            const isSelected = sender.id === selectedSenderId;
            return (
              <div
                key={sender.id}
                className={cn(
                  "flex items-center justify-between gap-4 rounded-lg border bg-background px-4 py-[14px]",
                  "shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)] transition-colors duration-150",
                  isSelected ? "border-[#0F798C]" : "border-border",
                )}
              >
                {/* Left: radio + info — clickable to select */}
                <Button
                  type="button"
                  variant="ghost"
                  className="flex flex-1 h-auto min-w-0 items-center justify-start gap-3 p-0 hover:bg-transparent hover:text-foreground text-left font-normal border-none shadow-none rounded cursor-pointer"
                  onClick={() => handleSelectFromList(sender)}
                >
                  <RadioIndicator selected={isSelected} />
                  <div className="flex flex-col gap-1 min-w-0">
                    {/* Name | Phone */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-medium text-foreground">{sender.name}</span>
                      {sender.phone && (
                        <>
                          <span className="text-sm text-muted-foreground">|</span>
                          <span className="text-sm text-muted-foreground">{sender.phone}</span>
                        </>
                      )}
                      {sender.isDefault && (
                        <span className="inline-flex items-center rounded bg-[#0F798C]/10 px-1.5 py-0.5 text-xs font-semibold text-[#0F798C]">
                          Default
                        </span>
                      )}
                    </div>
                    {/* Address */}
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm text-muted-foreground truncate font-normal">
                        {formatSenderAddress(sender)}
                      </span>
                    </div>
                  </div>
                </Button>

                {/* Right: Delete + Edit */}
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={deleteMutation.isPending}
                    className="h-11 w-[82px] rounded-[10px] border-[#D32D20] text-[#D32D20] text-base font-normal hover:bg-[#D32D20]/10 hover:text-[#D32D20] cursor-pointer"
                    onClick={() => handleDelete(sender)}
                  >
                    Delete
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-11 w-[82px] rounded-[10px] text-base font-normal cursor-pointer"
                    onClick={() => openEditForm(sender)}
                  >
                    Edit
                  </Button>
                </div>
              </div>
            );
          })}
        </BaseModalContent>
      </BaseModal>

      {/* ── Add / Edit Sender form modal ─────────────────────────────────── */}
      <BaseModal open={isFormOpen} onOpenChange={setIsFormOpen}>
        <BaseModalContent
          title={editingSender ? "Edit Sender" : "New Sender"}
          hideSearch
          listMaxHeight="70vh"
          footer={
            <>
              {editingSender ? (
                /* Edit mode: Back button returns to Select Saved Sender modal */
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 lg:h-10 xl:h-11 2xl:h-[52px] px-6 text-xl font-medium rounded-lg"
                  onClick={handleBackToSelect}
                >
                  Back
                </Button>
              ) : (
                /* New mode: Cancel closes the form */
                <BaseModalClose asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 lg:h-10 xl:h-11 2xl:h-[52px] px-6 text-xl font-medium rounded-lg"
                  >
                    Cancel
                  </Button>
                </BaseModalClose>
              )}
              <Button
                type="button"
                disabled={isSubmitting}
                className="h-9 lg:h-10 xl:h-11 2xl:h-[52px] w-[98px] text-xl font-medium rounded-lg"
                onClick={handleSubmit(handleFormSubmit)}
              >
                {isSubmitting ? "Saving…" : "Submit"}
              </Button>
            </>
          }
        >
          <form onSubmit={handleSubmit(handleFormSubmit)}>
            <FieldGroup>
              {/* Row 1: Country + City — equal 1/2 width each */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/*Country*/}
                <Field>
                  <FieldLabel>Country</FieldLabel>
                  <Input value="Vietnam" disabled className="bg-muted/50" />
                  <input type="hidden" {...register("country")} />
                </Field>

                {/*City*/}
                <Field>
                  <FieldLabel>
                    City <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Controller
                    name="city"
                    control={formControl}
                    render={({ field }) => (
                      <SearchableSelect
                        value={field.value ?? ""}
                        onValueChange={field.onChange}
                        options={provinceOptions}
                        placeholder="Select city"
                        searchPlaceholder="Search province…"
                        allowClear
                        serverSearch
                        onSearchChange={setProvinceSearch}
                        loading={provincesFetching}
                        className={cn(formErrors.city && "border-destructive")}
                      />
                    )}
                  />
                  <FieldError errors={[formErrors.city]} />
                </Field>
              </div>

              {/* Row 2: Ward + Address */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/*Ward*/}
                <Field>
                  <FieldLabel htmlFor="sender-form-ward">
                    Ward <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Controller
                    name="ward"
                    control={formControl}
                    render={({ field }) => (
                      <SearchableSelect
                        value={field.value ?? ""}
                        onValueChange={field.onChange}
                        options={wardOptions}
                        placeholder="Enter ward"
                        searchPlaceholder="Search ward…"
                        disabled={!selectedProvinceCode}
                        allowClear
                        serverSearch
                        onSearchChange={setWardSearch}
                        loading={wardsFetching}
                        className={cn(formErrors.ward && "border-destructive")}
                      />
                    )}
                  />
                  <FieldError errors={[formErrors.ward]} />
                </Field>

                {/*Address*/}
                <Field>
                  <FieldLabel htmlFor="sender-form-address">
                    Address <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Input
                    id="sender-form-address"
                    placeholder="Enter address"
                    {...register("address")}
                    className={cn(formErrors.address && "border-destructive")}
                  />
                  <FieldError errors={[formErrors.address]} />
                </Field>
              </div>

              {/* Row 3: Postcode + Sender Name */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/*ZipCode*/}
                <Field>
                  <FieldLabel htmlFor="sender-form-zip">Postcode / Zipcode</FieldLabel>
                  <Input
                    id="sender-form-zip"
                    placeholder="Enter postcode/zipcode"
                    {...register("zipCode")}
                  />
                </Field>

                {/*Name*/}
                <Field>
                  <FieldLabel htmlFor="sender-form-name">
                    Sender Name <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Input
                    id="sender-form-name"
                    placeholder="Enter sender name"
                    {...register("name")}
                    className={cn(formErrors.name && "border-destructive")}
                  />
                  <FieldError errors={[formErrors.name]} />
                </Field>
              </div>

              {/* Row 4: Phone + Email */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/*Phone*/}
                <Field>
                  <FieldLabel htmlFor="sender-form-phone">
                    Phone number <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Input
                    id="sender-form-phone"
                    type="tel"
                    placeholder="Enter phone number"
                    {...register("phone")}
                  />
                </Field>

                {/*Email*/}
                <Field>
                  <FieldLabel htmlFor="sender-form-email">Email</FieldLabel>
                  <Input
                    id="sender-form-email"
                    type="email"
                    placeholder="Enter email"
                    {...register("email")}
                    className={cn(formErrors.email && "border-destructive")}
                  />
                  <FieldError errors={[formErrors.email]} />
                </Field>
              </div>

              {/* Set as Default */}
              <Field orientation="horizontal" className="items-center gap-2">
                <Controller
                  name="isDefault"
                  control={formControl}
                  render={({ field }) => (
                    <Checkbox
                      id="sender-form-default"
                      checked={field.value}
                      onCheckedChange={(c) => field.onChange(!!c)}
                    />
                  )}
                />
                <FieldLabel
                  htmlFor="sender-form-default"
                  className="text-base font-medium cursor-pointer select-none"
                >
                  Set as Default
                </FieldLabel>
              </Field>
            </FieldGroup>
          </form>
        </BaseModalContent>
      </BaseModal>
    </>
  );
}
