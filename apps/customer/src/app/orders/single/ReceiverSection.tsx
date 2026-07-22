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
import { useEffect, useRef } from "react";
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

  // Fetch supported countries from HS Code API
  const { data: countriesData } = trpc.public.v1.hscode.getCountries.useQuery();

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
    setValueParent("receiverCountry", receiver.country ?? "");
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
                    <SearchableSelect
                      value={field.value}
                      onValueChange={field.onChange}
                      options={
                        (countriesData ?? []).map((c) => ({ value: c.code, label: c.name }))
                      }
                      placeholder="Select country"
                      searchPlaceholder="Search country..."
                      allowClear={true}
                      className={cn(
                        "bg-background/50 border-input",
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
                <Input
                  id="receiverState"
                  type="text"
                  required
                  {...registerParent("receiverState")}
                  placeholder="Enter state"
                  className={cn(
                    "w-full bg-background/50",
                    errorsParent.receiverState &&
                      "border-destructive focus-visible:ring-destructive",
                  )}
                />
                <FieldError errors={[errorsParent.receiverState]} />
              </Field>

              {/* City */}
              <Field>
                <FieldLabel htmlFor="receiverCity">
                  City <span className="text-destructive">*</span>
                </FieldLabel>
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
                <FieldLabel htmlFor="receiverPhone">
                  Phone number <span className="text-destructive">*</span>
                </FieldLabel>
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
