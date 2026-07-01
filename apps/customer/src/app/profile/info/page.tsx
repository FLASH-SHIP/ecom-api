"use client";

import { PhoneInput } from "@customer/components/ui/PhoneInput";
import { trpc } from "@customer/lib/trpc";
import { translate } from "@ecom/i18n";
import { useI18n } from "@ecom/shared/@i18n";
import { DatePicker } from "@ecom/ui/components/date-picker";
import { Input } from "@ecom/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ecom/ui/components/select";
import { Textarea } from "@ecom/ui/components/textarea";
import { AlertCircle, AtSign, CheckCircle } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export default function ProfileInfoPage() {
  const { status } = useSession();
  const { languageId: currentLocale } = useI18n();

  const { data: profile } = trpc.customer.auth.me.useQuery(undefined, {
    enabled: status === "authenticated",
  });

  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [description, setDescription] = useState("");
  const [saved, setSaved] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Field validation error states
  const [nameError, setNameError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [dobError, setDobError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setUsername(profile.username ?? "");
      setName(profile.name ?? "");
      setPhone(profile.phone ?? "");
      setDob(profile.dob ? (new Date(profile.dob).toISOString().split("T")[0] ?? "") : "");
      setGender(profile.gender ?? "");
      setDescription(profile.description ?? "");
    }
  }, [profile]);

  const updateMutation = trpc.customer.auth.updateProfile.useMutation({
    onSuccess: () => {
      setSaved(true);
      setValidationError(null);
      setNameError(null);
      setPhoneError(null);
      setDobError(null);
      setTimeout(() => setSaved(false), 3000);
    },
    onError: (err) => {
      setSaved(false);
      const msg = err.message;
      if (msg.includes("already taken") || msg.includes("USERNAME_ALREADY_EXISTS")) {
        setValidationError(translate("errors.USERNAME_ALREADY_EXISTS", currentLocale));
      } else if (msg.includes("already changed") || msg.includes("usernameChangeCount")) {
        setValidationError(translate("customerProfile.usernameChangeLockedAlert", currentLocale));
      } else {
        setValidationError(msg);
      }
    },
  });

  const validateName = (val: string) => {
    const err = checkNameError(val, currentLocale ?? "");
    setNameError(err);
    return !err;
  };

  const validatePhone = (val: string) => {
    const err = checkPhoneError(val, currentLocale ?? "");
    setPhoneError(err);
    return !err;
  };

  const validateDob = (val: string) => {
    const err = checkDobError(val, currentLocale ?? "");
    setDobError(err);
    return !err;
  };

  if (!profile) {
    return null;
  }

  const canChangeUsername = (profile.usernameChangeCount ?? 0) < 1;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setSaved(false);
        setValidationError(null);

        const isNameValid = validateName(name);
        const isPhoneValid = validatePhone(phone);
        const isDobValid = validateDob(dob);

        if (!isNameValid || !isPhoneValid || !isDobValid) {
          return;
        }

        updateMutation.mutate({
          username: username !== profile.username ? username : undefined,
          name: name.trim(),
          phone: phone.trim(),
          dob: dob || null,
          gender: (gender as "male" | "female" | "other") || null,
          description: description || null,
        });
      }}
      className="space-y-6 w-full"
    >
      {/* Email (read-only) */}
      <div>
        <label htmlFor="profile-email" className="mb-1.5 block text-sm font-medium text-foreground">
          {translate("customerProfile.emailLabel", currentLocale)}
        </label>
        <Input
          id="profile-email"
          type="email"
          disabled
          value={profile.email}
          className="bg-muted"
        />
        <p className="mt-1.5 text-xs text-muted-foreground">
          {translate("customerProfile.emailLockedDesc", currentLocale)}
        </p>
      </div>

      {/* Username */}
      <div>
        <label
          htmlFor="profile-username"
          className="mb-1.5 flex items-center gap-2 text-sm font-medium text-foreground"
        >
          <AtSign className="h-4 w-4 text-muted-foreground" />
          {translate("customerProfile.usernameLabel", currentLocale)}
        </label>
        <Input
          id="profile-username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase())}
          disabled={!canChangeUsername}
          className="disabled:bg-muted"
          placeholder={translate("customerProfile.usernamePlaceholder", currentLocale)}
        />
        {canChangeUsername ? (
          <p className="mt-1.5 flex items-center gap-1 text-xs text-amber-600">
            <AlertCircle className="h-3.5 w-3.5" />
            {translate("customerProfile.usernameChangeLimitAlert", currentLocale)}
          </p>
        ) : (
          <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
            {translate("customerProfile.usernameChangeLockedAlert", currentLocale)}
          </p>
        )}
      </div>

      {/* Full Name */}
      <div>
        <label htmlFor="profile-name" className="mb-1.5 block text-sm font-medium text-foreground">
          {translate("customerProfile.nameLabel", currentLocale)}
          <span className="text-destructive ml-0.5">*</span>
        </label>
        <Input
          id="profile-name"
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            validateName(e.target.value);
          }}
          onBlur={() => validateName(name)}
          placeholder={translate("customerProfile.namePlaceholder", currentLocale)}
        />
        {nameError && <p className="mt-1.5 text-xs text-destructive">{nameError}</p>}
      </div>

      {/* Phone */}
      <div>
        <label htmlFor="profile-phone" className="mb-1.5 block text-sm font-medium text-foreground">
          {translate("customerProfile.phoneLabel", currentLocale)}
          <span className="text-destructive ml-0.5">*</span>
        </label>
        <PhoneInput
          id="profile-phone"
          value={phone}
          onChange={(val) => {
            setPhone(val);
            validatePhone(val);
          }}
          placeholder={translate("customerProfile.phonePlaceholder", currentLocale)}
          error={phoneError || undefined}
        />
      </div>

      {/* DOB + Gender */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <span className="mb-1.5 block text-sm font-medium text-foreground">
            {translate("customerProfile.dobLabel", currentLocale)}
          </span>
          <DatePicker
            value={dob}
            onChange={(value) => {
              setDob(value);
              validateDob(value);
            }}
            disabledDays={(date) => {
              const today = new Date();
              today.setHours(23, 59, 59, 999);
              return date > today;
            }}
          />
          {dobError && <p className="mt-1.5 text-xs text-destructive">{dobError}</p>}
        </div>
        <div>
          <span className="mb-1.5 block text-sm font-medium text-foreground">
            {translate("customerProfile.genderLabel", currentLocale)}
          </span>
          <Select value={gender || undefined} onValueChange={(val) => setGender(val)}>
            <SelectTrigger id="profile-gender">
              <SelectValue placeholder={translate("customerProfile.genderSelect", currentLocale)} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">
                {translate("customerProfile.genderMale", currentLocale)}
              </SelectItem>
              <SelectItem value="female">
                {translate("customerProfile.genderFemale", currentLocale)}
              </SelectItem>
              <SelectItem value="other">
                {translate("customerProfile.genderOther", currentLocale)}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Description */}
      <div>
        <label
          htmlFor="profile-description"
          className="mb-1.5 block text-sm font-medium text-foreground"
        >
          {translate("customerProfile.descriptionLabel", currentLocale)}
        </label>
        <Textarea
          id="profile-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={1000}
          rows={3}
          className="w-full resize-none transition-all"
          placeholder={translate("customerProfile.descriptionPlaceholder", currentLocale)}
        />
      </div>

      {(validationError || updateMutation.error) && (
        <p className="text-sm text-destructive font-medium">
          {validationError || updateMutation.error?.message}
        </p>
      )}

      {saved && (
        <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
          <CheckCircle className="h-4 w-4" />
          {translate("customerProfile.saveSuccess", currentLocale)}
        </p>
      )}

      <button
        type="submit"
        disabled={updateMutation.isPending}
        className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
      >
        {updateMutation.isPending
          ? translate("customerProfile.saving", currentLocale)
          : translate("customerProfile.saveChanges", currentLocale)}
      </button>
    </form>
  );
}

const checkNameError = (val: string, locale: string) => {
  if (!val.trim()) {
    return translate("customerAuth.profileModal.nameRequired", locale);
  }
  return null;
};

const checkPhoneError = (val: string, locale: string) => {
  if (!val.trim()) {
    return translate("customerAuth.profileModal.phoneRequired", locale);
  }
  const phoneClean = val.replace(/[\s-+()]/g, "");
  if (phoneClean.length < 8 || !/^\d+$/.test(phoneClean)) {
    return translate("customerAuth.profileModal.phoneInvalid", locale);
  }
  return null;
};

const checkDobError = (val: string, locale: string) => {
  if (!val) {
    return null;
  }
  const selectedDate = new Date(val);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (selectedDate > today) {
    return translate("customerProfile.dobFuture", locale);
  }
  return null;
};
