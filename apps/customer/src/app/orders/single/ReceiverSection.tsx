"use client";

import { trpc } from "@customer/lib/trpc";
import { Button } from "@ecom/ui/components/button";
import { Checkbox } from "@ecom/ui/components/checkbox";
import { Field, FieldError, FieldGroup, FieldLabel } from "@ecom/ui/components/field";
import { SaveIcon } from "@ecom/ui/components/icons";
import { Input } from "@ecom/ui/components/input";
import { BaseModal, BaseModalContent } from "@ecom/ui/components/modals/base-modal";
import { SearchableSelect } from "@ecom/ui/components/searchable-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ecom/ui/components/select";
import { cn } from "@ecom/ui/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
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
type SavedReceiver = {
  id: number;
  label: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  address1: string;
  address2: string | null;
  city: string;
  cityName?: string;
  state: string;
  stateName?: string;
  zipCode: string;
  country: string | null;
  isDefault: boolean;
};

// Helper to format full address for list
function formatReceiverAddress(receiver: {
  address1: string;
  address2?: string | null;
  city: string;
  cityName?: string;
  state: string;
  stateName?: string;
  zipCode: string;
}) {
  const parts = [receiver.address1];
  if (receiver.address2) parts.push(receiver.address2);
  parts.push(receiver.cityName || receiver.city);
  parts.push(receiver.stateName || receiver.state);
  parts.push(receiver.zipCode);
  return parts.join(", ");
}

// ---------------------------------------------------------------------------
// Add / Edit form schema for sub-modal
// ---------------------------------------------------------------------------
const receiverFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").or(z.literal("")).optional(),
  address1: z.string().min(1, "Address 1 is required"),
  address2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zipCode: z.string().min(1, "Postcode/Zipcode is required"),
  country: z.string(),
  isDefault: z.boolean(),
});
type ReceiverFormValues = z.infer<typeof receiverFormSchema>;

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
// Form Fields Interface
// ---------------------------------------------------------------------------
export interface ReceiverFormFields {
  receiverName: string;
  receiverPhone?: string;
  receiverEmail?: string;
  receiverAddress1: string;
  receiverAddress2?: string;
  receiverCity: string;
  receiverCityName?: string;
  receiverState: string;
  receiverStateName?: string;
  receiverZipCode: string;
  receiverCountry: string;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export interface ReceiverSectionProps<
  TFieldValues extends FieldValues & ReceiverFormFields = FieldValues & ReceiverFormFields,
> {
  control: Control<TFieldValues>;
  register: UseFormRegister<TFieldValues>;
  errors: FieldErrors<TFieldValues>;
  setValue: UseFormSetValue<TFieldValues>;
  watch: UseFormWatch<TFieldValues>;
  saveReceiverSetting: boolean;
  setSaveReceiverSetting: (val: boolean) => void;
  selectedReceiverId: number | null;
  setSelectedReceiverId: (val: number | null) => void;
  savedReceivers: SavedReceiver[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: ReceiverSection complexity
export function ReceiverSection<
  TFieldValues extends FieldValues & ReceiverFormFields = FieldValues & ReceiverFormFields,
>({
  control,
  register,
  errors,
  setValue,
  watch,
  saveReceiverSetting,
  setSaveReceiverSetting,
  selectedReceiverId,
  setSelectedReceiverId,
  savedReceivers,
}: ReceiverSectionProps<TFieldValues>) {
  const controlParent = control as unknown as Control<ReceiverFormFields>;
  const registerParent = register as unknown as UseFormRegister<ReceiverFormFields>;
  const setValueParent = setValue as unknown as UseFormSetValue<ReceiverFormFields>;
  const watchParent = watch as unknown as UseFormWatch<ReceiverFormFields>;
  const errorsParent = errors as unknown as FieldErrors<ReceiverFormFields>;

  const trpcUtils = trpc.useUtils();
  const deleteMutation = trpc.customer.receivers.delete.useMutation({
    onSuccess: () => trpcUtils.customer.receivers.list.invalidate(),
  });
  const updateMutation = trpc.customer.receivers.update.useMutation({
    onSuccess: () => trpcUtils.customer.receivers.list.invalidate(),
  });

  // --- Modals State ---
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingReceiver, setEditingReceiver] = useState<SavedReceiver | null>(null);
  const [receiverSearch, setReceiverSearch] = useState("");
  const [selectedCityLabel, setSelectedCityLabel] = useState<string>("");
  const [selectedEditCityLabel, setSelectedEditCityLabel] = useState<string>("");

  // --- Main Form City & State Server-Side search ---
  const watchedReceiverState = watchParent("receiverState");
  const [stateSearch, setStateSearch] = useState("");
  const { data: statesData, isFetching: statesFetching } =
    trpc.customer.divisions.listStates.useQuery(
      { search: stateSearch || undefined },
      { placeholderData: (prev) => prev },
    );

  const stateOptions = useMemo(
    () => (statesData ?? []).map((s) => ({ value: s.code, label: s.name })),
    [statesData],
  );

  const selectedStateId = useMemo(() => {
    if (!watchedReceiverState || !statesData) return undefined;
    const found = statesData.find(
      (s) => s.code === watchedReceiverState || s.name === watchedReceiverState,
    );
    return found?.id;
  }, [watchedReceiverState, statesData]);

  const [citySearch, setCitySearch] = useState("");
  const { data: citiesData, isFetching: citiesFetching } =
    trpc.customer.divisions.listCities.useQuery(
      { parentId: selectedStateId ?? 0, search: citySearch || undefined },
      { enabled: !!selectedStateId, placeholderData: (prev) => prev },
    );

  const cityOptions = useMemo(() => {
    const list = (citiesData ?? []).map((c) => ({ value: c.code, label: c.name }));
    const currentCityVal = watchParent("receiverCity");
    if (currentCityVal && !list.some((item) => item.value === currentCityVal)) {
      const matched = savedReceivers.find((r) => r.city === currentCityVal);
      const name = matched?.cityName || matched?.city || selectedCityLabel || currentCityVal;
      list.push({ value: currentCityVal, label: name });
    }
    return list;
  }, [citiesData, watchParent, savedReceivers, selectedCityLabel]);

  // Reset city when state changes
  const prevReceiverStateRef = useRef(watchedReceiverState);
  useEffect(() => {
    if (prevReceiverStateRef.current !== watchedReceiverState) {
      setValueParent("receiverCity", "");
      prevReceiverStateRef.current = watchedReceiverState;
    }
  }, [watchedReceiverState, setValueParent]);

  // Auto-resolve state/city names to codes when data loads
  useEffect(() => {
    if (watchedReceiverState && statesData && statesData.length > 0) {
      const foundState = statesData.find(
        (s) =>
          s.name.toLowerCase() === watchedReceiverState.toLowerCase() ||
          s.code.toLowerCase() === watchedReceiverState.toLowerCase(),
      );
      if (foundState) {
        if (foundState.code !== watchedReceiverState) {
          setValueParent("receiverState", foundState.code);
        }
        setValueParent("receiverStateName", foundState.name);
      }
    }
  }, [watchedReceiverState, statesData, setValueParent]);

  const watchedReceiverCity = watchParent("receiverCity");
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: auto-resolve and track city label
  useEffect(() => {
    if (watchedReceiverCity) {
      // 1. If it's a name, resolve it to code first
      if (citiesData && citiesData.length > 0) {
        const foundCity = citiesData.find(
          (c) =>
            c.name.toLowerCase() === watchedReceiverCity.toLowerCase() ||
            c.code.toLowerCase() === watchedReceiverCity.toLowerCase(),
        );
        if (foundCity) {
          if (foundCity.code !== watchedReceiverCity) {
            setValueParent("receiverCity", foundCity.code);
          }
          setSelectedCityLabel(foundCity.name);
          setValueParent("receiverCityName", foundCity.name);
          return;
        }
      }

      // 2. Track label
      const option = (citiesData ?? []).find((c) => c.code === watchedReceiverCity);
      if (option) {
        setSelectedCityLabel(option.name);
        setValueParent("receiverCityName", option.name);
        return;
      }
      const matched = savedReceivers.find((r) => r.city === watchedReceiverCity);
      if (matched?.cityName) {
        setSelectedCityLabel(matched.cityName);
        setValueParent("receiverCityName", matched.cityName);
      }
    }
  }, [watchedReceiverCity, citiesData, savedReceivers, setValueParent]);

  // --- Edit Form Hook ---
  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    formState: { errors: editErrors, isSubmitting: isSubmittingEdit },
    reset: resetEditForm,
    control: editControl,
    watch: watchEditForm,
    setValue: setEditFormValue,
  } = useForm<ReceiverFormValues>({
    resolver: zodResolver(receiverFormSchema),
    defaultValues: { country: "US", isDefault: false },
  });

  const watchedEditFormState = watchEditForm("state");
  const [editStateSearch, setEditStateSearch] = useState("");
  const { data: editStatesData, isFetching: editStatesFetching } =
    trpc.customer.divisions.listStates.useQuery(
      { search: editStateSearch || undefined },
      { placeholderData: (prev) => prev },
    );

  const editStateOptions = useMemo(
    () => (editStatesData ?? []).map((s) => ({ value: s.code, label: s.name })),
    [editStatesData],
  );

  const selectedEditStateId = useMemo(() => {
    if (!watchedEditFormState || !editStatesData) return undefined;
    const found = editStatesData.find(
      (s) => s.code === watchedEditFormState || s.name === watchedEditFormState,
    );
    return found?.id;
  }, [watchedEditFormState, editStatesData]);

  const [editCitySearch, setEditCitySearch] = useState("");
  const { data: editCitiesData, isFetching: editCitiesFetching } =
    trpc.customer.divisions.listCities.useQuery(
      { parentId: selectedEditStateId ?? 0, search: editCitySearch || undefined },
      { enabled: !!selectedEditStateId, placeholderData: (prev) => prev },
    );

  const editCityOptions = useMemo(() => {
    const list = (editCitiesData ?? []).map((c) => ({ value: c.code, label: c.name }));
    const currentEditCity = watchEditForm("city");
    if (currentEditCity && !list.some((item) => item.value === currentEditCity)) {
      const name = selectedEditCityLabel || editingReceiver?.cityName || currentEditCity;
      list.push({ value: currentEditCity, label: name });
    }
    return list;
  }, [editCitiesData, watchEditForm, selectedEditCityLabel, editingReceiver]);

  // Reset edit city when state changes inside edit form
  const prevEditFormStateRef = useRef(watchedEditFormState);
  useEffect(() => {
    if (prevEditFormStateRef.current !== watchedEditFormState) {
      setEditFormValue("city", "");
      prevEditFormStateRef.current = watchedEditFormState;
    }
  }, [watchedEditFormState, setEditFormValue]);

  // Auto-resolve edit state/city names to codes when data loads
  useEffect(() => {
    if (watchedEditFormState && editStatesData && editStatesData.length > 0) {
      const foundState = editStatesData.find(
        (s) => s.name.toLowerCase() === watchedEditFormState.toLowerCase(),
      );
      if (foundState && foundState.code !== watchedEditFormState) {
        setEditFormValue("state", foundState.code);
      }
    }
  }, [watchedEditFormState, editStatesData, setEditFormValue]);

  const watchedEditCity = watchEditForm("city");
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: auto-resolve and track city label
  useEffect(() => {
    if (watchedEditCity) {
      // 1. If it's a name, resolve it to code first
      if (editCitiesData && editCitiesData.length > 0) {
        const foundCity = editCitiesData.find(
          (c) => c.name.toLowerCase() === watchedEditCity.toLowerCase(),
        );
        if (foundCity && foundCity.code !== watchedEditCity) {
          setEditFormValue("city", foundCity.code);
          setSelectedEditCityLabel(foundCity.name);
          return;
        }
      }

      // 2. Track label
      const option = (editCitiesData ?? []).find((c) => c.code === watchedEditCity);
      if (option) {
        setSelectedEditCityLabel(option.name);
        return;
      }
      if (editingReceiver && editingReceiver.city === watchedEditCity && editingReceiver.cityName) {
        setSelectedEditCityLabel(editingReceiver.cityName);
      }
    }
  }, [watchedEditCity, editCitiesData, editingReceiver, setEditFormValue]);

  // --- Handlers ---
  const handleSelectSavedReceiver = useCallback(
    (receiver: SavedReceiver) => {
      setSelectedReceiverId(receiver.id);
      setValueParent("receiverName", receiver.name);
      setValueParent("receiverPhone", receiver.phone ?? "");
      setValueParent("receiverEmail", receiver.email ?? "");
      setValueParent("receiverAddress1", receiver.address1);
      setValueParent("receiverAddress2", receiver.address2 ?? "");

      // Update ref to prevent city reset useEffect from clearing the newly set city
      prevReceiverStateRef.current = receiver.state;

      setValueParent("receiverState", receiver.state);
      setValueParent("receiverStateName", receiver.stateName ?? receiver.state);
      setValueParent("receiverCity", receiver.city);
      setValueParent("receiverCityName", receiver.cityName ?? receiver.city);
      setValueParent("receiverZipCode", receiver.zipCode);
      setValueParent("receiverCountry", receiver.country ?? "US");
      setSaveReceiverSetting(false);
      setIsSelectOpen(false);
    },
    [setValueParent, setSelectedReceiverId, setSaveReceiverSetting],
  );

  const openEditForm = useCallback(
    (receiver: SavedReceiver) => {
      setEditingReceiver(receiver);

      // Update ref to prevent edit city reset useEffect from clearing the edit form city
      prevEditFormStateRef.current = receiver.state;

      resetEditForm({
        name: receiver.name,
        phone: receiver.phone ?? "",
        email: receiver.email ?? "",
        address1: receiver.address1,
        address2: receiver.address2 ?? "",
        state: receiver.state,
        city: receiver.city,
        zipCode: receiver.zipCode,
        country: receiver.country ?? "US",
        isDefault: receiver.isDefault,
      });
      setIsSelectOpen(false);
      setIsFormOpen(true);
    },
    [resetEditForm],
  );

  const handleEditFormSubmit = async (data: ReceiverFormValues) => {
    if (!editingReceiver) return;

    await updateMutation.mutateAsync({
      id: editingReceiver.id,
      data: {
        name: data.name,
        phone: data.phone || null,
        email: data.email || null,
        address1: data.address1,
        address2: data.address2 || null,
        state: data.state,
        city: data.city,
        zipCode: data.zipCode,
        country: data.country,
        isDefault: data.isDefault,
      },
    });

    // If edited receiver is currently selected, sync fields on page
    if (editingReceiver.id === selectedReceiverId) {
      setValueParent("receiverName", data.name);
      setValueParent("receiverPhone", data.phone ?? "");
      setValueParent("receiverEmail", data.email ?? "");
      setValueParent("receiverAddress1", data.address1);
      setValueParent("receiverAddress2", data.address2 ?? "");
      setValueParent("receiverState", data.state);
      setValueParent("receiverCity", data.city);
      setValueParent("receiverZipCode", data.zipCode);
      setValueParent("receiverCountry", data.country);
    }

    setIsFormOpen(false);
    setTimeout(() => setIsSelectOpen(true), 150);
  };

  const handleDelete = useCallback(
    async (receiver: SavedReceiver) => {
      await deleteMutation.mutateAsync({ id: receiver.id });
      if (receiver.id === selectedReceiverId) {
        setSelectedReceiverId(null);
      }
    },
    [deleteMutation, selectedReceiverId, setSelectedReceiverId],
  );

  const handleBackToSelect = useCallback(() => {
    setIsFormOpen(false);
    setTimeout(() => setIsSelectOpen(true), 150);
  }, []);

  const filteredReceivers = useMemo(() => {
    const q = receiverSearch.trim().toLowerCase();
    if (!q) return savedReceivers;
    return savedReceivers.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.phone ?? "").toLowerCase().includes(q) ||
        r.address1.toLowerCase().includes(q),
    );
  }, [savedReceivers, receiverSearch]);

  return (
    <>
      {/* --- Receiver card in main page form --- */}
      <div className="flex flex-col overflow-hidden rounded-lg border border-[#DADADA] bg-[#FDFFFF]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-[#DADADA] bg-[#FEFCFA]">
          <h3 className="text-lg 2xl:text-xl font-semibold text-[#232323] leading-6">Receiver</h3>
          <button
            type="button"
            className="flex items-center gap-2 text-base 2xl:text-xl leading-6 font-semibold text-[#0042D0] hover:text-[#0034a1] hover:bg-transparent p-0 cursor-pointer"
            onClick={() => setIsSelectOpen(true)}
          >
            <SaveIcon />
            Saved Receiver
          </button>
        </div>

        {/* Body */}
        <div className="p-4 flex flex-col gap-4 bg-[#FDFFFF]">
          <FieldGroup>
            {/* Address Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field>
                <FieldLabel htmlFor="receiverAddress1">
                  Address 1 <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  id="receiverAddress1"
                  type="text"
                  required
                  {...registerParent("receiverAddress1")}
                  placeholder="Enter address 1"
                  className={cn(
                    "w-full bg-background/50",
                    errorsParent.receiverAddress1 &&
                      "border-destructive focus-visible:ring-destructive",
                  )}
                />
                <FieldError errors={[errorsParent.receiverAddress1]} />
              </Field>

              <Field>
                <FieldLabel htmlFor="receiverAddress2">Address 2</FieldLabel>
                <Input
                  id="receiverAddress2"
                  type="text"
                  {...registerParent("receiverAddress2")}
                  placeholder="Enter address 2"
                  className={cn(
                    "w-full bg-background/50",
                    errorsParent.receiverAddress2 &&
                      "border-destructive focus-visible:ring-destructive",
                  )}
                />
                <FieldError errors={[errorsParent.receiverAddress2]} />
              </Field>
            </div>

            {/* Region/Country Row in Figma layout: State, Country, Postcode, City */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Country */}
              <Field>
                <FieldLabel>
                  Country <span className="text-destructive">*</span>
                </FieldLabel>
                <Controller
                  name="receiverCountry"
                  control={controlParent}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange} disabled>
                      <SelectTrigger
                        className={cn(
                          "w-full bg-background/50 border-input",
                          errorsParent.receiverCountry &&
                            "border-destructive focus:ring-destructive",
                        )}
                      >
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="US">United States</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError errors={[errorsParent.receiverCountry]} />
              </Field>

              {/* State */}
              <Field>
                <FieldLabel>
                  State <span className="text-destructive">*</span>
                </FieldLabel>
                <Controller
                  name="receiverState"
                  control={controlParent}
                  render={({ field }) => (
                    <SearchableSelect
                      value={field.value}
                      onValueChange={(val) => {
                        field.onChange(val);
                        if (selectedReceiverId) setSelectedReceiverId(null);
                      }}
                      options={stateOptions}
                      placeholder="Enter state"
                      searchPlaceholder="Search state..."
                      allowClear
                      maxHeight="250px"
                      serverSearch
                      onSearchChange={setStateSearch}
                      loading={statesFetching}
                      className={cn(
                        "bg-background/50",
                        errorsParent.receiverState && "border-destructive",
                      )}
                    />
                  )}
                />
                <FieldError errors={[errorsParent.receiverState]} />
              </Field>

              {/* City */}
              <Field>
                <FieldLabel>
                  City <span className="text-destructive">*</span>
                </FieldLabel>
                <Controller
                  name="receiverCity"
                  control={controlParent}
                  render={({ field }) => (
                    <SearchableSelect
                      value={field.value}
                      onValueChange={(val) => {
                        field.onChange(val);
                        if (selectedReceiverId) setSelectedReceiverId(null);
                      }}
                      onOptionSelect={(opt) => setSelectedCityLabel(opt.label)}
                      options={cityOptions}
                      placeholder="Select city"
                      searchPlaceholder="Search city..."
                      disabled={!selectedStateId}
                      allowClear
                      maxHeight="250px"
                      serverSearch
                      onSearchChange={setCitySearch}
                      loading={citiesFetching}
                      className={cn(
                        "bg-background/50",
                        errorsParent.receiverCity && "border-destructive",
                      )}
                    />
                  )}
                />
                <FieldError errors={[errorsParent.receiverCity]} />
              </Field>

              {/* Zipcode */}
              <Field>
                <FieldLabel htmlFor="receiverZipCode">
                  Postcode/Zipcode <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  id="receiverZipCode"
                  type="text"
                  required
                  {...registerParent("receiverZipCode")}
                  placeholder="Enter postcode/zipcode"
                  className={cn(
                    "w-full bg-background/50",
                    errorsParent.receiverZipCode &&
                      "border-destructive focus-visible:ring-destructive",
                  )}
                />
                <FieldError errors={[errorsParent.receiverZipCode]} />
              </Field>
            </div>

            {/* Recipient Details Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Field className="md:col-span-2">
                <FieldLabel htmlFor="receiverName">
                  Receiver Name <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  id="receiverName"
                  type="text"
                  required
                  {...registerParent("receiverName")}
                  placeholder="Enter receiver name"
                  className={cn(
                    "w-full bg-background/50",
                    errorsParent.receiverName &&
                      "border-destructive focus-visible:ring-destructive",
                  )}
                />
                <FieldError errors={[errorsParent.receiverName]} />
              </Field>

              <Field>
                <FieldLabel htmlFor="receiverPhone">Phone number</FieldLabel>
                <Input
                  id="receiverPhone"
                  type="text"
                  {...registerParent("receiverPhone")}
                  placeholder="Enter phone number"
                  className={cn(
                    "w-full bg-background/50",
                    errorsParent.receiverPhone &&
                      "border-destructive focus-visible:ring-destructive",
                  )}
                />
                <FieldError errors={[errorsParent.receiverPhone]} />
              </Field>

              <Field>
                <FieldLabel htmlFor="receiverEmail">Email</FieldLabel>
                <Input
                  id="receiverEmail"
                  type="email"
                  {...registerParent("receiverEmail")}
                  placeholder="Enter email"
                  className={cn(
                    "w-full bg-background/50",
                    errorsParent.receiverEmail &&
                      "border-destructive focus-visible:ring-destructive",
                  )}
                />
                <FieldError errors={[errorsParent.receiverEmail]} />
              </Field>
            </div>

            {/* Save Setting Checkbox */}
            <Field orientation="horizontal" className="items-center gap-2 mt-2">
              <Checkbox
                id="save-receiver"
                checked={saveReceiverSetting}
                onCheckedChange={(c) => setSaveReceiverSetting(!!c)}
              />
              <FieldLabel
                htmlFor="save-receiver"
                className="text-base font-medium text-[#232323] cursor-pointer select-none"
              >
                Save your setting for repeated use
              </FieldLabel>
            </Field>
          </FieldGroup>
        </div>
      </div>

      {/* --- Select Saved Receiver modal --- */}
      <BaseModal open={isSelectOpen} onOpenChange={setIsSelectOpen}>
        <BaseModalContent
          title="Select Saved Receiver"
          searchValue={receiverSearch}
          onSearchChange={setReceiverSearch}
          searchPlaceholder="Search by name/phone number"
          createLabel={null}
          isLoading={false}
          listMaxHeight="460px"
          emptyState={
            <p className="py-8 text-center text-sm text-muted-foreground">
              No saved receivers found.
            </p>
          }
        >
          <div className="flex flex-col gap-4">
            {filteredReceivers.map((receiver) => {
              const isSelected = receiver.id === selectedReceiverId;
              return (
                <div
                  key={receiver.id}
                  className={cn(
                    "flex items-center justify-between gap-4 rounded-lg border bg-background px-4 py-[14px]",
                    "shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)] transition-colors duration-150",
                    isSelected ? "border-[#0F798C]" : "border-border",
                  )}
                >
                  {/* Left: radio + info (clickable to select) */}
                  <Button
                    type="button"
                    variant="ghost"
                    className="flex flex-1 h-auto min-w-0 items-center justify-start gap-3 p-0 hover:bg-transparent hover:text-foreground text-left font-normal border-none shadow-none rounded cursor-pointer"
                    onClick={() => handleSelectSavedReceiver(receiver)}
                  >
                    <RadioIndicator selected={isSelected} />
                    <div className="flex flex-col gap-1 min-w-0">
                      {/* Line 1: Name | Phone */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-semibold text-[#232323]">
                          {receiver.name}
                        </span>
                        {receiver.phone && (
                          <>
                            <span className="text-sm text-[#7B7B7B]">|</span>
                            <span className="text-sm text-[#7B7B7B]">{receiver.phone}</span>
                          </>
                        )}
                        {receiver.isDefault && (
                          <span className="inline-flex items-center rounded bg-[#0F798C]/10 px-1.5 py-0.5 text-xs font-semibold text-[#0F798C]">
                            Default
                          </span>
                        )}
                      </div>
                      {/* Line 2: Country | Address */}
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-medium text-[#232323] shrink-0">
                          {receiver.country || "US"}
                        </span>
                        <span className="text-sm text-[#7B7B7B]">|</span>
                        <span className="text-sm text-[#7B7B7B] truncate">
                          {formatReceiverAddress(receiver)}
                        </span>
                      </div>
                    </div>
                  </Button>

                  {/* Right: Actions */}
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={deleteMutation.isPending}
                      className="h-11 w-[82px] rounded-[10px] border-[#D32D20] text-[#D32D20] text-base font-normal hover:bg-[#D32D20]/10 hover:text-[#D32D20] cursor-pointer"
                      onClick={() => handleDelete(receiver)}
                    >
                      Delete
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 w-[82px] rounded-[10px] text-base font-normal cursor-pointer"
                      onClick={() => openEditForm(receiver)}
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

      {/* --- Edit Receiver modal --- */}
      <BaseModal open={isFormOpen} onOpenChange={setIsFormOpen}>
        <BaseModalContent
          title="Edit Receiver"
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
                disabled={isSubmittingEdit}
                className="h-9 lg:h-10 xl:h-11 2xl:h-[52px] w-[98px] text-xl font-medium rounded-lg"
                onClick={handleSubmitEdit(handleEditFormSubmit)}
              >
                {isSubmittingEdit ? "Saving…" : "Submit"}
              </Button>
            </>
          }
        >
          <form onSubmit={handleSubmitEdit(handleEditFormSubmit)}>
            <FieldGroup>
              {/* Row 1: Country + Address 1 */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel>Country</FieldLabel>
                  <Input value="United States" disabled className="bg-muted/50" />
                  <input type="hidden" {...registerEdit("country")} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="edit-receiver-address1">
                    Address 1 <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Input
                    id="edit-receiver-address1"
                    placeholder="Enter address 1"
                    {...registerEdit("address1")}
                    className={cn(editErrors.address1 && "border-destructive")}
                  />
                  <FieldError errors={[editErrors.address1]} />
                </Field>
              </div>

              {/* Row 2: Address 2 + Zipcode */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="edit-receiver-address2">Address 2</FieldLabel>
                  <Input
                    id="edit-receiver-address2"
                    placeholder="Enter address 2"
                    {...registerEdit("address2")}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="edit-receiver-zip">
                    Postcode/Zipcode <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Input
                    id="edit-receiver-zip"
                    placeholder="Enter zipcode"
                    {...registerEdit("zipCode")}
                    className={cn(editErrors.zipCode && "border-destructive")}
                  />
                  <FieldError errors={[editErrors.zipCode]} />
                </Field>
              </div>

              {/* Row 3: State + City */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel>
                    State <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Controller
                    name="state"
                    control={editControl}
                    render={({ field }) => (
                      <SearchableSelect
                        value={field.value ?? ""}
                        onValueChange={field.onChange}
                        options={editStateOptions}
                        placeholder="Select state"
                        searchPlaceholder="Search state…"
                        allowClear
                        serverSearch
                        onSearchChange={setEditStateSearch}
                        loading={editStatesFetching}
                        className={cn(editErrors.state && "border-destructive")}
                      />
                    )}
                  />
                  <FieldError errors={[editErrors.state]} />
                </Field>
                <Field>
                  <FieldLabel>
                    City <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Controller
                    name="city"
                    control={editControl}
                    render={({ field }) => (
                      <SearchableSelect
                        value={field.value ?? ""}
                        onValueChange={field.onChange}
                        onOptionSelect={(opt) => setSelectedEditCityLabel(opt.label)}
                        options={editCityOptions}
                        placeholder="Select city"
                        searchPlaceholder="Search city…"
                        disabled={!selectedEditStateId}
                        allowClear
                        serverSearch
                        onSearchChange={setEditCitySearch}
                        loading={editCitiesFetching}
                        className={cn(editErrors.city && "border-destructive")}
                      />
                    )}
                  />
                  <FieldError errors={[editErrors.city]} />
                </Field>
              </div>

              {/* Row 4: Receiver Name + Phone */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="edit-receiver-name">
                    Receiver Name <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Input
                    id="edit-receiver-name"
                    placeholder="Enter receiver name"
                    {...registerEdit("name")}
                    className={cn(editErrors.name && "border-destructive")}
                  />
                  <FieldError errors={[editErrors.name]} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="edit-receiver-phone">Phone number</FieldLabel>
                  <Input
                    id="edit-receiver-phone"
                    type="tel"
                    placeholder="Enter phone number"
                    {...registerEdit("phone")}
                  />
                </Field>
              </div>

              {/* Row 5: Email */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="edit-receiver-email">Email</FieldLabel>
                  <Input
                    id="edit-receiver-email"
                    type="email"
                    placeholder="Enter email"
                    {...registerEdit("email")}
                    className={cn(editErrors.email && "border-destructive")}
                  />
                  <FieldError errors={[editErrors.email]} />
                </Field>
              </div>

              {/* Set as Default Checkbox */}
              <Field orientation="horizontal" className="items-center gap-2">
                <Controller
                  name="isDefault"
                  control={editControl}
                  render={({ field }) => (
                    <Checkbox
                      id="edit-receiver-default"
                      checked={field.value}
                      onCheckedChange={(c) => field.onChange(!!c)}
                    />
                  )}
                />
                <FieldLabel
                  htmlFor="edit-receiver-default"
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
