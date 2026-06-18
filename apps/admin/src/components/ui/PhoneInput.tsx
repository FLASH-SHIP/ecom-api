"use client";

import { Input } from "@ecom/ui/components/input";
import { Label } from "@ecom/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ecom/ui/components/select";
import { cn } from "@ecom/ui/lib/utils";
import { useTranslations } from "next-intl";
import type { ChangeEvent } from "react";
import { useState } from "react";

interface CountryCode {
  code: string;
  dial: string;
  flag: string;
}

const COUNTRY_CODES: CountryCode[] = [
  { code: "VN", dial: "+84", flag: "🇻🇳" },
  { code: "US", dial: "+1", flag: "🇺🇸" },
  { code: "GB", dial: "+44", flag: "🇬🇧" },
  { code: "AU", dial: "+61", flag: "🇦🇺" },
  { code: "SG", dial: "+65", flag: "🇸🇬" },
  { code: "JP", dial: "+81", flag: "🇯🇵" },
  { code: "KR", dial: "+82", flag: "🇰🇷" },
  { code: "CN", dial: "+86", flag: "🇨🇳" },
  { code: "TH", dial: "+66", flag: "🇹🇭" },
  { code: "MY", dial: "+60", flag: "🇲🇾" },
  { code: "PH", dial: "+63", flag: "🇵🇭" },
  { code: "ID", dial: "+62", flag: "🇮🇩" },
];

/** Parse a full phone string like "+84 901234567" into { dialCode, number } */
function parsePhone(value: string): { dialCode: string; number: string } {
  for (const c of COUNTRY_CODES) {
    if (value.startsWith(c.dial)) {
      return { dialCode: c.dial, number: value.slice(c.dial.length).trim() };
    }
  }
  return { dialCode: "+84", number: value };
}

interface PhoneInputProps {
  value?: string | null;
  onChange?: (value: string) => void;
  label?: string;
  error?: string;
  disabled?: boolean;
  id?: string;
}

/**
 * Shared phone input with country code selector.
 * Stores full international number e.g. "+84 901234567".
 */
export function PhoneInput({
  value = "",
  onChange,
  label,
  error,
  disabled,
  id = "phone-input",
}: PhoneInputProps) {
  const t = useTranslations("users.profile");
  const resolvedLabel = label ?? t("phone");
  const parsed = parsePhone(value ?? "");
  const [dialCode, setDialCode] = useState(parsed.dialCode);
  const [number, setNumber] = useState(parsed.number);

  const handleDialChange = (newDial: string) => {
    setDialCode(newDial);
    onChange?.(`${newDial} ${number}`.trim());
  };

  const handleNumberChange = (e: ChangeEvent<HTMLInputElement>) => {
    const n = e.target.value.replace(/[^\d\s\-().]/g, "");
    setNumber(n);
    onChange?.(`${dialCode} ${n}`.trim());
  };

  const selectedCountry = COUNTRY_CODES.find((c) => c.dial === dialCode) ?? COUNTRY_CODES[0];

  return (
    <div className="flex flex-col gap-1.5">
      {resolvedLabel && (
        <Label htmlFor={id} className={cn(error && "text-destructive")}>
          {resolvedLabel}
        </Label>
      )}
      <div className="flex gap-2">
        {/* Country code selector */}
        <Select value={dialCode} onValueChange={handleDialChange} disabled={disabled}>
          <SelectTrigger className="w-[110px] shrink-0">
            <SelectValue>
              <span className="flex items-center gap-1">
                <span>{selectedCountry.flag}</span>
                <span>{dialCode}</span>
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {COUNTRY_CODES.map((c) => (
              <SelectItem key={c.code} value={c.dial}>
                <span className="flex items-center gap-2">
                  <span>{c.flag}</span>
                  <span>{c.dial}</span>
                  <span className="text-xs text-muted-foreground">{c.code}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Phone number field */}
        <Input
          id={id}
          value={number}
          onChange={handleNumberChange}
          disabled={disabled}
          placeholder={resolvedLabel}
          className={cn("flex-1", error && "border-destructive")}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
