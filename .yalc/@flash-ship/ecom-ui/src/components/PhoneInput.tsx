"use client";

import { Button } from "./button";
import { Input } from "./input";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { cn } from "../lib/utils";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import * as React from "react";

// ── Country data ──────────────────────────────────────────────────────────────

export interface Country {
  code: string; // ISO 3166-1 alpha-2
  dial: string; // e.g. "+84"
  name: string;
  flag: string; // emoji flag
}

export const COUNTRIES: Country[] = [
  { code: "AF", dial: "+93", name: "Afghanistan", flag: "🇦🇫" },
  { code: "AL", dial: "+355", name: "Albania", flag: "🇦🇱" },
  { code: "DZ", dial: "+213", name: "Algeria", flag: "🇩🇿" },
  { code: "AD", dial: "+376", name: "Andorra", flag: "🇦🇩" },
  { code: "AO", dial: "+244", name: "Angola", flag: "🇦🇴" },
  { code: "AG", dial: "+1-268", name: "Antigua and Barbuda", flag: "🇦🇬" },
  { code: "AR", dial: "+54", name: "Argentina", flag: "🇦🇷" },
  { code: "AM", dial: "+374", name: "Armenia", flag: "🇦🇲" },
  { code: "AU", dial: "+61", name: "Australia", flag: "🇦🇺" },
  { code: "AT", dial: "+43", name: "Austria", flag: "🇦🇹" },
  { code: "AZ", dial: "+994", name: "Azerbaijan", flag: "🇦🇿" },
  { code: "BS", dial: "+1-242", name: "Bahamas", flag: "🇧🇸" },
  { code: "BH", dial: "+973", name: "Bahrain", flag: "🇧🇭" },
  { code: "BD", dial: "+880", name: "Bangladesh", flag: "🇧🇩" },
  { code: "BB", dial: "+1-246", name: "Barbados", flag: "🇧🇧" },
  { code: "BY", dial: "+375", name: "Belarus", flag: "🇧🇾" },
  { code: "BE", dial: "+32", name: "Belgium", flag: "🇧🇪" },
  { code: "BZ", dial: "+501", name: "Belize", flag: "🇧🇿" },
  { code: "BJ", dial: "+229", name: "Benin", flag: "🇧🇯" },
  { code: "BT", dial: "+975", name: "Bhutan", flag: "🇧🇹" },
  { code: "BO", dial: "+591", name: "Bolivia", flag: "🇧🇴" },
  { code: "BA", dial: "+387", name: "Bosnia and Herzegovina", flag: "🇧🇦" },
  { code: "BW", dial: "+267", name: "Botswana", flag: "🇧🇼" },
  { code: "BR", dial: "+55", name: "Brazil", flag: "🇧🇷" },
  { code: "BN", dial: "+673", name: "Brunei", flag: "🇧🇳" },
  { code: "BG", dial: "+359", name: "Bulgaria", flag: "🇧🇬" },
  { code: "BF", dial: "+226", name: "Burkina Faso", flag: "🇧🇫" },
  { code: "BI", dial: "+257", name: "Burundi", flag: "🇧🇮" },
  { code: "CV", dial: "+238", name: "Cabo Verde", flag: "🇨🇻" },
  { code: "KH", dial: "+855", name: "Cambodia", flag: "🇰🇭" },
  { code: "CM", dial: "+237", name: "Cameroon", flag: "🇨🇲" },
  { code: "CA", dial: "+1", name: "Canada", flag: "🇨🇦" },
  { code: "CF", dial: "+236", name: "Central African Republic", flag: "🇨🇫" },
  { code: "TD", dial: "+235", name: "Chad", flag: "🇹🇩" },
  { code: "CL", dial: "+56", name: "Chile", flag: "🇨🇱" },
  { code: "CN", dial: "+86", name: "China", flag: "🇨🇳" },
  { code: "CO", dial: "+57", name: "Colombia", flag: "🇨🇴" },
  { code: "KM", dial: "+269", name: "Comoros", flag: "🇰🇲" },
  { code: "CG", dial: "+242", name: "Congo", flag: "🇨🇬" },
  { code: "CR", dial: "+506", name: "Costa Rica", flag: "🇨🇷" },
  { code: "HR", dial: "+385", name: "Croatia", flag: "🇭🇷" },
  { code: "CU", dial: "+53", name: "Cuba", flag: "🇨🇺" },
  { code: "CY", dial: "+357", name: "Cyprus", flag: "🇨🇾" },
  { code: "CZ", dial: "+420", name: "Czech Republic", flag: "🇨🇿" },
  { code: "DK", dial: "+45", name: "Denmark", flag: "🇩🇰" },
  { code: "DJ", dial: "+253", name: "Djibouti", flag: "🇩🇯" },
  { code: "DO", dial: "+1-809", name: "Dominican Republic", flag: "🇩🇴" },
  { code: "EC", dial: "+593", name: "Ecuador", flag: "🇪🇨" },
  { code: "EG", dial: "+20", name: "Egypt", flag: "🇪🇬" },
  { code: "SV", dial: "+503", name: "El Salvador", flag: "🇸🇻" },
  { code: "GQ", dial: "+240", name: "Equatorial Guinea", flag: "🇬🇶" },
  { code: "ER", dial: "+291", name: "Eritrea", flag: "🇪🇷" },
  { code: "EE", dial: "+372", name: "Estonia", flag: "🇪🇪" },
  { code: "ET", dial: "+251", name: "Ethiopia", flag: "🇪🇹" },
  { code: "FJ", dial: "+679", name: "Fiji", flag: "🇫🇯" },
  { code: "FI", dial: "+358", name: "Finland", flag: "🇫🇮" },
  { code: "FR", dial: "+33", name: "France", flag: "🇫🇷" },
  { code: "GA", dial: "+241", name: "Gabon", flag: "🇬🇦" },
  { code: "GM", dial: "+220", name: "Gambia", flag: "🇬🇲" },
  { code: "GE", dial: "+995", name: "Georgia", flag: "🇬🇪" },
  { code: "DE", dial: "+49", name: "Germany", flag: "🇩🇪" },
  { code: "GH", dial: "+233", name: "Ghana", flag: "🇬🇭" },
  { code: "GR", dial: "+30", name: "Greece", flag: "🇬🇷" },
  { code: "GT", dial: "+502", name: "Guatemala", flag: "🇬🇹" },
  { code: "GN", dial: "+224", name: "Guinea", flag: "🇬🇳" },
  { code: "GW", dial: "+245", name: "Guinea-Bissau", flag: "🇬🇼" },
  { code: "GY", dial: "+592", name: "Guyana", flag: "🇬🇾" },
  { code: "HT", dial: "+509", name: "Haiti", flag: "🇭🇹" },
  { code: "HN", dial: "+504", name: "Honduras", flag: "🇭🇳" },
  { code: "HU", dial: "+36", name: "Hungary", flag: "🇭🇺" },
  { code: "IS", dial: "+354", name: "Iceland", flag: "🇮🇸" },
  { code: "IN", dial: "+91", name: "India", flag: "🇮🇳" },
  { code: "ID", dial: "+62", name: "Indonesia", flag: "🇮🇩" },
  { code: "IR", dial: "+98", name: "Iran", flag: "🇮🇷" },
  { code: "IQ", dial: "+964", name: "Iraq", flag: "🇮🇶" },
  { code: "IE", dial: "+353", name: "Ireland", flag: "🇮🇪" },
  { code: "IL", dial: "+972", name: "Israel", flag: "🇮🇱" },
  { code: "IT", dial: "+39", name: "Italy", flag: "🇮🇹" },
  { code: "JM", dial: "+1-876", name: "Jamaica", flag: "🇯🇲" },
  { code: "JP", dial: "+81", name: "Japan", flag: "🇯🇵" },
  { code: "JO", dial: "+962", name: "Jordan", flag: "🇯🇴" },
  { code: "KZ", dial: "+7", name: "Kazakhstan", flag: "🇰🇿" },
  { code: "KE", dial: "+254", name: "Kenya", flag: "🇰🇪" },
  { code: "KI", dial: "+686", name: "Kiribati", flag: "🇰🇮" },
  { code: "KW", dial: "+965", name: "Kuwait", flag: "🇰🇼" },
  { code: "KG", dial: "+996", name: "Kyrgyzstan", flag: "🇰🇬" },
  { code: "LA", dial: "+856", name: "Laos", flag: "🇱🇦" },
  { code: "LV", dial: "+371", name: "Latvia", flag: "🇱🇻" },
  { code: "LB", dial: "+961", name: "Lebanon", flag: "🇱🇧" },
  { code: "LS", dial: "+266", name: "Lesotho", flag: "🇱🇸" },
  { code: "LR", dial: "+231", name: "Liberia", flag: "🇱🇷" },
  { code: "LY", dial: "+218", name: "Libya", flag: "🇱🇾" },
  { code: "LI", dial: "+423", name: "Liechtenstein", flag: "🇱🇮" },
  { code: "LT", dial: "+370", name: "Lithuania", flag: "🇱🇹" },
  { code: "LU", dial: "+352", name: "Luxembourg", flag: "🇱🇺" },
  { code: "MG", dial: "+261", name: "Madagascar", flag: "🇲🇬" },
  { code: "MW", dial: "+265", name: "Malawi", flag: "🇲🇼" },
  { code: "MY", dial: "+60", name: "Malaysia", flag: "🇲🇾" },
  { code: "MV", dial: "+960", name: "Maldives", flag: "🇲🇻" },
  { code: "ML", dial: "+223", name: "Mali", flag: "🇲🇱" },
  { code: "MT", dial: "+356", name: "Malta", flag: "🇲🇹" },
  { code: "MH", dial: "+692", name: "Marshall Islands", flag: "🇲🇭" },
  { code: "MR", dial: "+222", name: "Mauritania", flag: "🇲🇷" },
  { code: "MU", dial: "+230", name: "Mauritius", flag: "🇲🇺" },
  { code: "MX", dial: "+52", name: "Mexico", flag: "🇲🇽" },
  { code: "FM", dial: "+691", name: "Micronesia", flag: "🇫🇲" },
  { code: "MD", dial: "+373", name: "Moldova", flag: "🇲🇩" },
  { code: "MC", dial: "+377", name: "Monaco", flag: "🇲🇨" },
  { code: "MN", dial: "+976", name: "Mongolia", flag: "🇲🇳" },
  { code: "ME", dial: "+382", name: "Montenegro", flag: "🇲🇪" },
  { code: "MA", dial: "+212", name: "Morocco", flag: "🇲🇦" },
  { code: "MZ", dial: "+258", name: "Mozambique", flag: "🇲🇿" },
  { code: "MM", dial: "+95", name: "Myanmar", flag: "🇲🇲" },
  { code: "NA", dial: "+264", name: "Namibia", flag: "🇳🇦" },
  { code: "NR", dial: "+674", name: "Nauru", flag: "🇳🇷" },
  { code: "NP", dial: "+977", name: "Nepal", flag: "🇳🇵" },
  { code: "NL", dial: "+31", name: "Netherlands", flag: "🇳🇱" },
  { code: "NZ", dial: "+64", name: "New Zealand", flag: "🇳🇿" },
  { code: "NI", dial: "+505", name: "Nicaragua", flag: "🇳🇮" },
  { code: "NE", dial: "+227", name: "Niger", flag: "🇳🇪" },
  { code: "NG", dial: "+234", name: "Nigeria", flag: "🇳🇬" },
  { code: "NO", dial: "+47", name: "Norway", flag: "🇳🇴" },
  { code: "OM", dial: "+968", name: "Oman", flag: "🇴🇲" },
  { code: "PK", dial: "+92", name: "Pakistan", flag: "🇵🇰" },
  { code: "PW", dial: "+680", name: "Palau", flag: "🇵🇼" },
  { code: "PA", dial: "+507", name: "Panama", flag: "🇵🇦" },
  { code: "PG", dial: "+675", name: "Papua New Guinea", flag: "🇵🇬" },
  { code: "PY", dial: "+595", name: "Paraguay", flag: "🇵🇾" },
  { code: "PE", dial: "+51", name: "Peru", flag: "🇵🇪" },
  { code: "PH", dial: "+63", name: "Philippines", flag: "🇵🇭" },
  { code: "PL", dial: "+48", name: "Poland", flag: "🇵🇱" },
  { code: "PT", dial: "+351", name: "Portugal", flag: "🇵🇹" },
  { code: "QA", dial: "+974", name: "Qatar", flag: "🇶🇦" },
  { code: "RO", dial: "+40", name: "Romania", flag: "🇷🇴" },
  { code: "RU", dial: "+7", name: "Russia", flag: "🇷🇺" },
  { code: "RW", dial: "+250", name: "Rwanda", flag: "🇷🇼" },
  { code: "KN", dial: "+1-869", name: "Saint Kitts and Nevis", flag: "🇰🇳" },
  { code: "LC", dial: "+1-758", name: "Saint Lucia", flag: "🇱🇨" },
  { code: "VC", dial: "+1-784", name: "Saint Vincent and the Grenadines", flag: "🇻🇨" },
  { code: "WS", dial: "+685", name: "Samoa", flag: "🇼🇸" },
  { code: "SM", dial: "+378", name: "San Marino", flag: "🇸🇲" },
  { code: "ST", dial: "+239", name: "Sao Tome and Principe", flag: "🇸🇹" },
  { code: "SA", dial: "+966", name: "Saudi Arabia", flag: "🇸🇦" },
  { code: "SN", dial: "+221", name: "Senegal", flag: "🇸🇳" },
  { code: "RS", dial: "+381", name: "Serbia", flag: "🇷🇸" },
  { code: "SC", dial: "+248", name: "Seychelles", flag: "🇸🇨" },
  { code: "SL", dial: "+232", name: "Sierra Leone", flag: "🇸🇱" },
  { code: "SG", dial: "+65", name: "Singapore", flag: "🇸🇬" },
  { code: "SK", dial: "+421", name: "Slovakia", flag: "🇸🇰" },
  { code: "SI", dial: "+386", name: "Slovenia", flag: "🇸🇮" },
  { code: "SB", dial: "+677", name: "Solomon Islands", flag: "🇸🇧" },
  { code: "SO", dial: "+252", name: "Somalia", flag: "🇸🇴" },
  { code: "ZA", dial: "+27", name: "South Africa", flag: "🇿🇦" },
  { code: "SS", dial: "+211", name: "South Sudan", flag: "🇸🇸" },
  { code: "ES", dial: "+34", name: "Spain", flag: "🇪🇸" },
  { code: "LK", dial: "+94", name: "Sri Lanka", flag: "🇱🇰" },
  { code: "SD", dial: "+249", name: "Sudan", flag: "🇸🇩" },
  { code: "SR", dial: "+597", name: "Suriname", flag: "🇸🇷" },
  { code: "SE", dial: "+46", name: "Sweden", flag: "🇸🇪" },
  { code: "CH", dial: "+41", name: "Switzerland", flag: "🇨🇭" },
  { code: "SY", dial: "+963", name: "Syria", flag: "🇸🇾" },
  { code: "TW", dial: "+886", name: "Taiwan", flag: "🇹🇼" },
  { code: "TJ", dial: "+992", name: "Tajikistan", flag: "🇹🇯" },
  { code: "TZ", dial: "+255", name: "Tanzania", flag: "🇹🇿" },
  { code: "TH", dial: "+66", name: "Thailand", flag: "🇹🇭" },
  { code: "TL", dial: "+670", name: "Timor-Leste", flag: "🇹🇱" },
  { code: "TG", dial: "+228", name: "Togo", flag: "🇹🇬" },
  { code: "TO", dial: "+676", name: "Tonga", flag: "🇹🇴" },
  { code: "TT", dial: "+1-868", name: "Trinidad and Tobago", flag: "🇹🇹" },
  { code: "TN", dial: "+216", name: "Tunisia", flag: "🇹🇳" },
  { code: "TR", dial: "+90", name: "Turkey", flag: "🇹🇷" },
  { code: "TM", dial: "+993", name: "Turkmenistan", flag: "🇹🇲" },
  { code: "TV", dial: "+688", name: "Tuvalu", flag: "🇹🇻" },
  { code: "UG", dial: "+256", name: "Uganda", flag: "🇺🇬" },
  { code: "UA", dial: "+380", name: "Ukraine", flag: "🇺🇦" },
  { code: "AE", dial: "+971", name: "United Arab Emirates", flag: "🇦🇪" },
  { code: "GB", dial: "+44", name: "United Kingdom", flag: "🇬🇧" },
  { code: "US", dial: "+1", name: "United States", flag: "🇺🇸" },
  { code: "UY", dial: "+598", name: "Uruguay", flag: "🇺🇾" },
  { code: "UZ", dial: "+998", name: "Uzbekistan", flag: "🇺🇿" },
  { code: "VU", dial: "+678", name: "Vanuatu", flag: "🇻🇺" },
  { code: "VE", dial: "+58", name: "Venezuela", flag: "🇻🇪" },
  { code: "VN", dial: "+84", name: "Vietnam", flag: "🇻🇳" },
  { code: "YE", dial: "+967", name: "Yemen", flag: "🇾🇪" },
  { code: "ZM", dial: "+260", name: "Zambia", flag: "🇿🇲" },
  { code: "ZW", dial: "+263", name: "Zimbabwe", flag: "🇿🇼" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const DEFAULT_COUNTRY = (COUNTRIES.find((c) => c.code === "VN") ?? COUNTRIES[0]) as Country;

function parsePhone(value: string): { country: Country; number: string } {
  const sorted = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
  for (const c of sorted) {
    if (value.startsWith(c.dial)) {
      return { country: c, number: value.slice(c.dial.length).trimStart() };
    }
  }
  return { country: DEFAULT_COUNTRY, number: value };
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface PhoneInputProps {
  value?: string | null;
  onChange?: (value: string) => void;
  label?: string;
  error?: string;
  disabled?: boolean;
  id?: string;
  placeholder?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PhoneInput({
  value = "",
  onChange,
  label,
  error,
  disabled,
  id = "phone-input",
  placeholder = "Enter a phone number",
}: PhoneInputProps) {
  const enableCountryCode = true;
  const minLength = 8;
  const maxLength = 15;

  const [selectedCountry, setSelectedCountry] = React.useState<Country>(() => {
    const parsed = parsePhone(value ?? "");
    return parsed.country;
  });
  const [number, setNumber] = React.useState(() => {
    const parsed = parsePhone(value ?? "");
    return parsed.number;
  });
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  React.useEffect(() => {
    const parsed = !enableCountryCode
      ? { country: DEFAULT_COUNTRY, number: value ?? "" }
      : parsePhone(value ?? "");
    setSelectedCountry(parsed.country);
    setNumber(parsed.number);
  }, [value]);

  const filteredCountries = React.useMemo(() => {
    const baseList = COUNTRIES;
    if (!search.trim()) return baseList;
    const q = search.toLowerCase();
    return baseList.filter(
      (c) =>
        c.name.toLowerCase().includes(q) || c.dial.includes(q) || c.code.toLowerCase().includes(q),
    );
  }, [search]);

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setOpen(false);
    setSearch("");
    onChange?.(`${country.dial} ${number}`.trim());
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const n = e.target.value.replace(/[^\d\s\-().+]/g, "");
    setNumber(n);
    if (enableCountryCode) {
      onChange?.(`${selectedCountry.dial} ${n}`.trim());
    } else {
      onChange?.(n);
    }
  };

  const inputMaxLength = React.useMemo(() => {
    if (!enableCountryCode) return maxLength;
    const dialLength = selectedCountry.dial.replace(/[^0-9]/g, "").length;
    return Math.max(1, maxLength - dialLength);
  }, [selectedCountry]);

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label
          htmlFor={id}
          className={cn(
            "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
            error && "text-destructive",
          )}
        >
          {label}
        </label>
      )}

      <div className="flex w-full">
        {enableCountryCode && (
          <Popover
            modal
            open={open}
            onOpenChange={(o) => {
              setOpen(o);
              if (!o) setSearch("");
            }}
          >
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                disabled={disabled}
                className={cn(
                  "flex h-10 items-center gap-1 rounded-r-none border-r-0 px-3 focus:z-10 bg-background hover:bg-accent",
                  error && "border-destructive",
                )}
                aria-label="Select country code"
              >
                <span className="text-base leading-none">{selectedCountry.flag}</span>
                <ChevronsUpDown className="-mr-1 size-3.5 shrink-0 opacity-60" />
              </Button>
            </PopoverTrigger>

            <PopoverContent
              className="flex w-[300px] flex-col overflow-hidden p-0 bg-popover"
              align="start"
            >
              <div className="flex shrink-0 items-center border-b border-border px-3 py-2">
                <Search className="mr-2 size-4 shrink-0 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search country..."
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground text-foreground"
                />
              </div>

              <div className="h-72 overflow-y-auto p-1">
                {filteredCountries.length === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    No country found.
                  </div>
                ) : (
                  filteredCountries.map((country) => (
                    <button
                      key={country.code}
                      type="button"
                      onClick={() => handleCountrySelect(country)}
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground text-foreground text-left"
                    >
                      <span className="text-base">{country.flag}</span>
                      <span className="flex-1 truncate">{country.name}</span>
                      <span className="text-xs text-muted-foreground">{country.dial}</span>
                      <Check
                        className={cn(
                          "size-3.5 shrink-0",
                          country.code === selectedCountry.code ? "opacity-100" : "opacity-0",
                        )}
                      />
                    </button>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>
        )}

        <Input
          id={id}
          type="tel"
          value={number}
          onChange={handleNumberChange}
          disabled={disabled}
          placeholder={placeholder}
          aria-invalid={!!error}
          minLength={minLength}
          maxLength={inputMaxLength}
          className={cn(enableCountryCode && "rounded-l-none", error && "border-destructive")}
        />
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
