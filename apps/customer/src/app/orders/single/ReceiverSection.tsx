"use client";

import { trpc } from "@customer/lib/trpc";
import { Checkbox } from "@ecom/ui/components/checkbox";
import { Field, FieldError, FieldGroup, FieldLabel } from "@ecom/ui/components/field";
import { Input } from "@ecom/ui/components/input";
import { SearchableSelect } from "@ecom/ui/components/searchable-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ecom/ui/components/select";
import { cn } from "@ecom/ui/lib/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  type Control,
  Controller,
  type FieldErrors,
  type FieldValues,
  type UseFormRegister,
  type UseFormSetValue,
  type UseFormWatch,
} from "react-hook-form";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type SavedReceiver = {
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

  const [selectedCityLabel, setSelectedCityLabel] = useState<string>("");

  // Auto-select the default receiver on first load
  const autoSelectedRef = useRef(false);
  useEffect(() => {
    if (autoSelectedRef.current || savedReceivers.length === 0) return;
    const defaultReceiver = savedReceivers.find((r) => r.isDefault);
    if (defaultReceiver) {
      handleSelectSavedReceiver(defaultReceiver.id.toString());
    }
    autoSelectedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedReceivers]);

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
  useEffect(() => {
    if (watchedReceiverCity) {
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

  const handleSelectSavedReceiver = (value: string) => {
    const id = Number(value);
    const receiver = savedReceivers.find((r) => r.id === id);
    if (!receiver) return;

    setSelectedReceiverId(id);
    setValueParent("receiverName", receiver.name);
    setValueParent("receiverPhone", receiver.phone ?? "");
    setValueParent("receiverEmail", receiver.email ?? "");
    setValueParent("receiverAddress1", receiver.address1);
    setValueParent("receiverAddress2", receiver.address2 ?? "");

    prevReceiverStateRef.current = receiver.state;

    setValueParent("receiverState", receiver.state);
    setValueParent("receiverStateName", receiver.stateName ?? receiver.state);
    setValueParent("receiverCity", receiver.city);
    setValueParent("receiverCityName", receiver.cityName ?? receiver.city);
    setValueParent("receiverZipCode", receiver.zipCode);
    setValueParent("receiverCountry", receiver.country ?? "US");
    setSaveReceiverSetting(false);
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-[#DADADA] bg-[#FDFFFF]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-[#DADADA] bg-[#FEFCFA]">
        <h3 className="text-lg 2xl:text-xl font-semibold text-[#232323] leading-6">Receiver</h3>
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col gap-4 bg-[#FDFFFF]">
        <FieldGroup>
          {/* Form fields: ALWAYS visible */}
          <div className="flex flex-col gap-4">
            {/* Address Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
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

            {/* Region/Country Row */}
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
          </div>

          {/* Save Setting Checkbox: ALWAYS visible */}
          <Field orientation="horizontal" className="items-center gap-2 mt-2">
            <Checkbox
              id="save-receiver"
              checked={saveReceiverSetting}
              onCheckedChange={(c) => setSaveReceiverSetting(!!c)}
              className={"w-4 h-4 xl:w-5 xl:h-5 2xl:w-6 2xl:h-6"}
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
  );
}
