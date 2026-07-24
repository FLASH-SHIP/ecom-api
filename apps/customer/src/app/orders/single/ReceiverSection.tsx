"use client";

import { trpc } from "@customer/lib/trpc";
import { getPostalCodeRuleInfo } from "@ecom/lib/addressValidator";
import { ShippingMethod } from "@ecom/types";
import { Field, FieldError, FieldGroup, FieldLabel } from "@ecom/ui/components/field";
import { Input } from "@ecom/ui/components/input";
import { SearchableSelect } from "@ecom/ui/components/searchable-select";
import { cn } from "@ecom/ui/lib/utils";
import { useEffect, useMemo, useState } from "react";
import {
  type Control,
  Controller,
  type FieldErrors,
  type UseFormRegister,
  type UseFormSetValue,
  type UseFormWatch,
} from "react-hook-form";
import type { OrderFormValues } from "./page";

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
  shippingMethod?: ShippingMethod;
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
export interface ReceiverSectionProps {
  control: Control<OrderFormValues>;
  register: UseFormRegister<OrderFormValues>;
  errors: FieldErrors<OrderFormValues>;
  setValue: UseFormSetValue<OrderFormValues>;
  watch: UseFormWatch<OrderFormValues>;
  saveReceiverSetting: boolean;
  setSaveReceiverSetting: (val: boolean) => void;
  selectedReceiverId: number | null;
  setSelectedReceiverId: (val: number | null) => void;
  savedReceivers: SavedReceiver[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function ReceiverSection({
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
}: ReceiverSectionProps) {
  const controlParent = control as unknown as Control<ReceiverFormFields>;
  const registerParent = register as unknown as UseFormRegister<ReceiverFormFields>;
  const setValueParent = setValue as unknown as UseFormSetValue<ReceiverFormFields>;
  const errorsParent = errors as unknown as FieldErrors<ReceiverFormFields>;
  const watchParent = watch as unknown as UseFormWatch<ReceiverFormFields>;

  const shippingMethod = watchParent("shippingMethod");
  const selectedCountry = watchParent("receiverCountry");
  const selectedState = watchParent("receiverState");
  const isEPacket = shippingMethod === ShippingMethod.EPACKET;

  // Selected State ID for ePacket US City list
  const [selectedStateId, setSelectedStateId] = useState<number | null>(null);
  const [citySearch, setCitySearch] = useState("");

  // Fetch supported countries from HS Code API
  const { data: countriesData } = trpc.public.v1.hscode.getCountries.useQuery();

  // Fetch US States for ePacket
  const { data: usStatesList = [] } = trpc.customer.divisions.listStates.useQuery(undefined, {
    enabled: isEPacket,
  });

  // Fetch US Cities for selected State in ePacket
  const { data: usCitiesList = [], isFetching: isCitiesFetching } =
    trpc.customer.divisions.listCities.useQuery(
      { parentId: selectedStateId ?? 0, search: citySearch || undefined, limit: 100 },
      { enabled: isEPacket && !!selectedStateId },
    );

  // Automatically force Country = US when ePacket is selected
  useEffect(() => {
    if (isEPacket && selectedCountry !== "US") {
      setValueParent("receiverCountry", "US");
    }
  }, [isEPacket, selectedCountry, setValueParent]);

  // Sync selectedStateId when receiverState changes (e.g. from saved receiver auto-fill)
  useEffect(() => {
    if (isEPacket && selectedState && usStatesList.length > 0) {
      const match = usStatesList.find(
        (s) =>
          s.code.toUpperCase() === selectedState.toUpperCase() ||
          s.name.toUpperCase() === selectedState.toUpperCase(),
      );
      if (match && match.id !== selectedStateId) {
        setSelectedStateId(match.id);
      }
    }
  }, [isEPacket, selectedState, usStatesList, selectedStateId]);

  const postalCodeRuleInfo = useMemo(
    () => getPostalCodeRuleInfo(selectedCountry || ""),
    [selectedCountry],
  );

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
    setValueParent("receiverState", receiver.state);
    setValueParent("receiverStateName", receiver.stateName ?? receiver.state);
    setValueParent("receiverCity", receiver.city);
    setValueParent("receiverCityName", receiver.cityName ?? receiver.city);
    setValueParent("receiverZipCode", receiver.zipCode);
    setValueParent("receiverCountry", receiver.country ?? (isEPacket ? "US" : ""));
    setSaveReceiverSetting(false);
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-[#DADADA] bg-[#FDFFFF]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 2xl:py-4 border-b border-[#DADADA] bg-[#FEFCFA]">
        <h3 className="text-base 2xl:text-xl font-semibold text-[#232323] leading-6">Receiver</h3>
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
                  maxLength={150}
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
                  maxLength={150}
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
                    <SearchableSelect
                      value={isEPacket ? "US" : field.value}
                      onValueChange={(val) => {
                        if (!isEPacket) field.onChange(val);
                      }}
                      options={
                        isEPacket
                          ? [{ value: "US", label: "United States" }]
                          : (countriesData ?? []).map((c) => ({ value: c.code, label: c.name }))
                      }
                      placeholder={isEPacket ? "US" : "Select country"}
                      searchPlaceholder="Search country..."
                      disabled={isEPacket}
                      allowClear={!isEPacket}
                      className={cn(
                        "bg-background/50 border-input",
                        isEPacket && "opacity-70 cursor-not-allowed bg-muted",
                        errorsParent.receiverCountry && "border-destructive",
                      )}
                    />
                  )}
                />
                <FieldError errors={[errorsParent.receiverCountry]} />
              </Field>

              {/* State */}
              <Field>
                <FieldLabel htmlFor="receiverState">
                  State <span className="text-destructive">*</span>
                </FieldLabel>
                {isEPacket ? (
                  <Controller
                    name="receiverState"
                    control={controlParent}
                    render={({ field }) => (
                      <SearchableSelect
                        value={field.value}
                        onValueChange={(val) => {
                          field.onChange(val);
                          const matchedState = usStatesList.find((s) => s.code === val);
                          if (matchedState) {
                            setSelectedStateId(matchedState.id);
                            setValueParent("receiverStateName", matchedState.name);
                          } else {
                            setSelectedStateId(null);
                          }
                          // Reset city on state change
                          setValueParent("receiverCity", "");
                          setValueParent("receiverCityName", "");
                          setCitySearch("");
                        }}
                        options={usStatesList.map((s) => ({
                          value: s.code,
                          label: `${s.code} - ${s.name}`,
                        }))}
                        placeholder="Select US State"
                        searchPlaceholder="Search US State..."
                        allowClear={true}
                        className={cn(
                          "bg-background/50 border-input",
                          errorsParent.receiverState && "border-destructive",
                        )}
                      />
                    )}
                  />
                ) : (
                  <Input
                    id="receiverState"
                    type="text"
                    required
                    maxLength={50}
                    {...registerParent("receiverState")}
                    placeholder="Enter state"
                    className={cn(
                      "w-full bg-background/50",
                      errorsParent.receiverState &&
                        "border-destructive focus-visible:ring-destructive",
                    )}
                  />
                )}
                <FieldError errors={[errorsParent.receiverState]} />
              </Field>

              {/* City */}
              <Field>
                <FieldLabel htmlFor="receiverCity">
                  City <span className="text-destructive">*</span>
                </FieldLabel>
                {isEPacket ? (
                  <Controller
                    name="receiverCity"
                    control={controlParent}
                    render={({ field }) => (
                      <SearchableSelect
                        value={field.value}
                        onValueChange={(val) => {
                          field.onChange(val);
                          setValueParent("receiverCityName", val);
                        }}
                        options={usCitiesList.map((c) => ({
                          value: c.name,
                          label: c.name,
                        }))}
                        placeholder={selectedStateId ? "Select US City" : "Select State first"}
                        searchPlaceholder="Search US City..."
                        disabled={!selectedStateId}
                        allowClear={true}
                        serverSearch={true}
                        onSearchChange={setCitySearch}
                        searchDebounceMs={500}
                        loading={isCitiesFetching}
                        className={cn(
                          "bg-background/50 border-input",
                          !selectedStateId && "opacity-60 cursor-not-allowed bg-muted",
                          errorsParent.receiverCity && "border-destructive",
                        )}
                      />
                    )}
                  />
                ) : (
                  <Input
                    id="receiverCity"
                    type="text"
                    required
                    {...registerParent("receiverCity")}
                    placeholder="Enter city"
                    className={cn(
                      "w-full bg-background/50",
                      errorsParent.receiverCity &&
                        "border-destructive focus-visible:ring-destructive",
                    )}
                  />
                )}
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
                  placeholder={"Enter postcode/zipcode"}
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
                  maxLength={100}
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
                  maxLength={15}
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
                <FieldLabel htmlFor="receiverEmail">
                  Email <span className="text-destructive">*</span>
                </FieldLabel>
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
        </FieldGroup>
      </div>
    </div>
  );
}
