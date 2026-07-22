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
import type { OrderFormValues } from "./page";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type SavedSender = {
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

export interface SenderFormFields {
  senderName: string;
  senderPhone?: string;
  senderEmail?: string;
  senderAddress: string;
  senderCity: string;
  senderCityName?: string;
  senderWard?: string;
  senderWardName?: string;
  senderZipCode: string;
  senderCountry: string;
}

export interface SenderSectionProps {
  control: Control<OrderFormValues>;
  register: UseFormRegister<OrderFormValues>;
  errors: FieldErrors<OrderFormValues>;
  setValue: UseFormSetValue<OrderFormValues>;
  watch: UseFormWatch<OrderFormValues>;
  saveSenderSetting: boolean;
  setSaveSenderSetting: (val: boolean) => void;
  selectedSenderId: number | null;
  setSelectedSenderId: (val: number | null) => void;
  savedSenders: SavedSender[];
}

export function SenderSection({
  control,
  register,
  errors,
  setValue,
  watch,
  saveSenderSetting,
  setSaveSenderSetting,
  selectedSenderId,
  setSelectedSenderId,
  savedSenders,
}: SenderSectionProps) {
  const controlParent = control as unknown as Control<SenderFormFields>;
  const registerParent = register as unknown as UseFormRegister<SenderFormFields>;
  const setValueParent = setValue as unknown as UseFormSetValue<SenderFormFields>;
  const watchParent = watch as unknown as UseFormWatch<SenderFormFields>;
  const errorsParent = errors as unknown as FieldErrors<SenderFormFields>;

  const [selectedCityLabel, setSelectedCityLabel] = useState<string>("");
  const [selectedWardLabel, setSelectedWardLabel] = useState<string>("");

  // Auto-select the default sender on first load
  const autoSelectedRef = useRef(false);
  useEffect(() => {
    if (autoSelectedRef.current || savedSenders.length === 0) return;
    const defaultSender = savedSenders.find((s) => s.isDefault);
    if (defaultSender) {
      handleSelectSavedSender(defaultSender.id.toString());
    }
    autoSelectedRef.current = true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedSenders]);

  // Province / ward logic
  const watchedFormCity = watchParent("senderCity");
  const [provinceSearch, setProvinceSearch] = useState("");
  const { data: provincesData, isFetching: provincesFetching } =
    trpc.customer.divisions.listProvinces.useQuery(
      { search: provinceSearch || undefined },
      { placeholderData: (prev) => prev },
    );

  const provinceOptions = useMemo(
    () => (provincesData ?? []).map((p) => ({ value: String(p.code), label: p.name })),
    [provincesData],
  );

  const selectedProvinceCode = useMemo(() => {
    const n = Number(watchedFormCity);
    return n > 0 ? n : undefined;
  }, [watchedFormCity]);

  const [wardSearch, setWardSearch] = useState("");
  const { data: wardsData, isFetching: wardsFetching } = trpc.customer.divisions.listWards.useQuery(
    { provinceCode: selectedProvinceCode ?? 0, search: wardSearch || undefined },
    { enabled: !!selectedProvinceCode, placeholderData: (prev) => prev },
  );

  const wardOptions = useMemo(
    () => (wardsData ?? []).map((w) => ({ value: String(w.code), label: w.name })),
    [wardsData],
  );

  // Reset ward when city changes inside the form
  const prevFormCityRef = useRef(watchedFormCity);
  useEffect(() => {
    if (prevFormCityRef.current !== watchedFormCity) {
      setValueParent("senderWard", "");
      prevFormCityRef.current = watchedFormCity;
    }
  }, [watchedFormCity, setValueParent]);

  // Track labels
  useEffect(() => {
    if (watchedFormCity && provincesData) {
      const p = provincesData.find((c) => String(c.code) === watchedFormCity);
      if (p) {
        setSelectedCityLabel(p.name);
        setValueParent("senderCityName", p.name);
      }
    }
  }, [watchedFormCity, provincesData, setValueParent]);

  const watchedFormWard = watchParent("senderWard");
  useEffect(() => {
    if (watchedFormWard && wardsData) {
      const w = wardsData.find((w) => String(w.code) === watchedFormWard);
      if (w) {
        setSelectedWardLabel(w.name);
        setValueParent("senderWardName", w.name);
      }
    }
  }, [watchedFormWard, wardsData, setValueParent]);

  const handleSelectSavedSender = (value: string) => {
    if (value === "new") {
      setSelectedSenderId(null);
      // Clear form except country
      setValueParent("senderName", "");
      setValueParent("senderPhone", "");
      setValueParent("senderEmail", "");
      setValueParent("senderAddress", "");
      setValueParent("senderCity", "");
      setValueParent("senderCityName", "");
      setValueParent("senderWard", "");
      setValueParent("senderWardName", "");
      setValueParent("senderZipCode", "");
      setValueParent("senderCountry", "VN");
      setSaveSenderSetting(false);
      return;
    }

    const id = Number(value);
    const sender = savedSenders.find((s) => s.id === id);
    if (!sender) return;

    setSelectedSenderId(id);

    // Auto-fill form
    setValueParent("senderName", sender.name);
    setValueParent("senderPhone", sender.phone ?? "");
    setValueParent("senderEmail", sender.email ?? "");
    setValueParent("senderAddress", sender.address);

    // Resolve old values
    const cityEntry = provincesData?.find(
      (p) => String(p.code) === sender.city || p.name === sender.city,
    );
    const cityCode = cityEntry ? String(cityEntry.code) : sender.city;

    const wardCode = sender.ward && !Number.isNaN(Number(sender.ward)) ? sender.ward : "";

    prevFormCityRef.current = cityCode; // prevent auto-clearing ward
    setValueParent("senderCity", cityCode);
    setValueParent("senderCityName", cityEntry?.name ?? sender.city);
    setValueParent("senderWard", wardCode);
    setValueParent("senderWardName", sender.wardName ?? sender.ward ?? "");
    setValueParent("senderZipCode", sender.zipCode ?? "");
    setValueParent("senderCountry", sender.country ?? "VN");

    setSaveSenderSetting(false);
  };

  const isNewSender = selectedSenderId === null;

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-[#DADADA] bg-[#FDFFFF]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 2xl:py-4 border-b border-[#DADADA] bg-[#FEFCFA]">
        <h3 className="text-base 2xl:text-xl font-semibold text-[#232323] leading-6">Sender</h3>
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col gap-4 bg-[#FDFFFF]">
        <FieldGroup>
          {/* Dropdown for sender selection */}
          <Field>
            <Select
              value={selectedSenderId ? String(selectedSenderId) : "new"}
              onValueChange={handleSelectSavedSender}
            >
              <SelectTrigger className="w-full h-auto min-h-[68px] py-3 bg-background/50 border-input items-center">
                <SelectValue placeholder="Select Sender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new" className="py-3 cursor-pointer">
                  <div className="flex flex-col text-left">
                    <span className="text-base 2xl:text-2xl text-[#232323]">New Sender</span>
                    <span className="text-sm 2xl:text-base text-[#7B7B7B]">Input details to create a new Sender</span>
                  </div>
                </SelectItem>
                {savedSenders.map((s) => {
                  const addressParts = [
                    s.address,
                    s.wardName,
                    s.cityName,
                    s.zipCode,
                  ]
                    .filter(Boolean)
                    .join(", ");
                  return (
                    <SelectItem key={s.id} value={String(s.id)} className="py-3 cursor-pointer">
                      <div className="flex flex-col text-left">
                        <span className="text-base 2xl:text-2xl text-[#232323]">
                          {s.name}
                        </span>
                        <span className="text-sm 2xl:text-base text-[#7B7B7B] line-clamp-1 break-all">
                          {addressParts}
                        </span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </Field>

          {/* Form fields: We hide them when !isNewSender to preserve RHF state without visual clutter */}
          <div className={cn("flex flex-col gap-4", !isNewSender && "hidden")}>
            {/* Row 1: Name + Phone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
              <Field>
                <FieldLabel htmlFor="senderName">
                  Sender Name <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  id="senderName"
                  type="text"
                  required
                  {...registerParent("senderName")}
                  placeholder="Enter sender name"
                  className={cn(
                    "w-full bg-background/50",
                    errorsParent.senderName && "border-destructive focus-visible:ring-destructive",
                  )}
                />
                <FieldError errors={[errorsParent.senderName]} />
              </Field>

              <Field>
                <FieldLabel htmlFor="senderPhone">Phone number <span className="text-destructive">*</span></FieldLabel>
                <Input
                  id="senderPhone"
                  type="tel"
                  {...registerParent("senderPhone")}
                  placeholder="Enter phone number"
                  className={cn(
                    "w-full bg-background/50",
                    errorsParent.senderPhone && "border-destructive focus-visible:ring-destructive",
                  )}
                />
                <FieldError errors={[errorsParent.senderPhone]} />
              </Field>
            </div>

            {/* Row 2: Email + Address */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field>
                <FieldLabel htmlFor="senderEmail">Email</FieldLabel>
                <Input
                  id="senderEmail"
                  type="email"
                  {...registerParent("senderEmail")}
                  placeholder="Enter email"
                  className={cn(
                    "w-full bg-background/50",
                    errorsParent.senderEmail && "border-destructive focus-visible:ring-destructive",
                  )}
                />
                <FieldError errors={[errorsParent.senderEmail]} />
              </Field>

              <Field>
                <FieldLabel htmlFor="senderAddress">
                  Address <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  id="senderAddress"
                  type="text"
                  required
                  {...registerParent("senderAddress")}
                  placeholder="Enter address"
                  className={cn(
                    "w-full bg-background/50",
                    errorsParent.senderAddress && "border-destructive focus-visible:ring-destructive",
                  )}
                />
                <FieldError errors={[errorsParent.senderAddress]} />
              </Field>
            </div>

            {/* Row 3: City, Ward, Postcode, Country */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Field>
                <FieldLabel>
                  Country <span className="text-destructive">*</span>
                </FieldLabel>
                <Input value="Vietnam" disabled className="bg-muted/50 w-full" />
                <input type="hidden" {...registerParent("senderCountry")} value="VN" />
              </Field>

              <Field>
                <FieldLabel>
                  City <span className="text-destructive">*</span>
                </FieldLabel>
                <Controller
                  name="senderCity"
                  control={controlParent}
                  render={({ field }) => (
                    <SearchableSelect
                      value={field.value}
                      onValueChange={field.onChange}
                      onOptionSelect={(opt) => setSelectedCityLabel(opt.label)}
                      options={provinceOptions}
                      placeholder="Select city"
                      searchPlaceholder="Search province..."
                      allowClear
                      maxHeight="250px"
                      serverSearch
                      onSearchChange={setProvinceSearch}
                      loading={provincesFetching}
                      className={cn(
                        "bg-background/50",
                        errorsParent.senderCity && "border-destructive",
                      )}
                    />
                  )}
                />
                <FieldError errors={[errorsParent.senderCity]} />
              </Field>

              <Field>
                <FieldLabel>
                  Ward <span className="text-destructive">*</span>
                </FieldLabel>
                <Controller
                  name="senderWard"
                  control={controlParent}
                  render={({ field }) => (
                    <SearchableSelect
                      value={field.value}
                      onValueChange={field.onChange}
                      onOptionSelect={(opt) => setSelectedWardLabel(opt.label)}
                      options={wardOptions}
                      placeholder="Select ward"
                      searchPlaceholder="Search ward..."
                      disabled={!selectedProvinceCode}
                      allowClear
                      maxHeight="250px"
                      serverSearch
                      onSearchChange={setWardSearch}
                      loading={wardsFetching}
                      className={cn(
                        "bg-background/50",
                        errorsParent.senderWard && "border-destructive",
                      )}
                    />
                  )}
                />
                <FieldError errors={[errorsParent.senderWard]} />
              </Field>

              <Field>
                <FieldLabel htmlFor="senderZipCode">
                  Postcode/Zipcode <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  id="senderZipCode"
                  type="text"
                  required
                  {...registerParent("senderZipCode")}
                  placeholder="Enter postcode"
                  className={cn(
                    "w-full bg-background/50",
                    errorsParent.senderZipCode && "border-destructive focus-visible:ring-destructive",
                  )}
                />
                <FieldError errors={[errorsParent.senderZipCode]} />
              </Field>
            </div>
          </div>

          {/* Save Setting Checkbox */}
          {isNewSender && (
            <Field orientation="horizontal" className="items-center gap-2 mt-2">
              <Checkbox
                id="save-sender"
                checked={saveSenderSetting}
                onCheckedChange={(c) => setSaveSenderSetting(!!c)}
                className={"w-4 h-4 xl:w-5 xl:h-5 2xl:w-6 2xl:h-6"}
              />
              <FieldLabel
                htmlFor="save-sender"
                className="text-base font-medium text-[#232323] cursor-pointer select-none"
              >
                Save your setting for repeated use
              </FieldLabel>
            </Field>
          )}
        </FieldGroup>
      </div>
    </div>
  );
}
