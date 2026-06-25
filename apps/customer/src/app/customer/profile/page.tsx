"use client";

import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "@customer/lib/i18n";
import { trpc } from "@customer/lib/trpc";
import { translate } from "@ecom/i18n";
import { AlertCircle, AtSign, CheckCircle } from "lucide-react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export default function CustomerProfilePage() {
  const pathname = usePathname();
  const { status } = useSession();

  const currentLocale =
    SUPPORTED_LOCALES.find((l) => pathname.startsWith(`/${l}/`) || pathname === `/${l}`) ??
    DEFAULT_LOCALE;

  const getLocalizedHref = (href: string) => {
    return `/${currentLocale}${href === "/" ? "" : href}`;
  };

  const { data: profile, isLoading: isLoadingProfile } = trpc.customer.auth.me.useQuery(undefined, {
    enabled: status === "authenticated",
  });

  const isLoading = status === "loading" || isLoadingProfile;

  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [description, setDescription] = useState("");
  const [saved, setSaved] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

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
      setTimeout(() => setSaved(false), 3000);
    },
    onError: () => {
      setSaved(false);
    },
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <p className="text-center text-sm text-muted-foreground">
          {translate("customerProfile.loading", currentLocale)}
        </p>
      </div>
    );
  }

  if (status === "unauthenticated" || !profile) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <h1 className="text-2xl font-bold">
          {translate("customerProfile.notLoggedIn", currentLocale)}
        </h1>
        <NextLink
          href={getLocalizedHref("/auth/login")}
          className="mt-4 inline-block text-primary hover:underline"
        >
          {translate("customerProfile.loginButton", currentLocale)}
        </NextLink>
      </div>
    );
  }

  const canChangeUsername = (profile.usernameChangeCount ?? 0) < 1;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{translate("customerProfile.title", currentLocale)}</h1>
        <NextLink
          href={getLocalizedHref("/customer/dashboard")}
          className="text-sm text-primary hover:underline"
        >
          {translate("customerProfile.backToDashboard", currentLocale)}
        </NextLink>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSaved(false);
          setValidationError(null);

          if (!name.trim()) {
            setValidationError(translate("profileModal.nameRequired", currentLocale));
            return;
          }
          if (!phone.trim()) {
            setValidationError(translate("profileModal.phoneRequired", currentLocale));
            return;
          }

          const phoneClean = phone.replace(/[\s-+()]/g, "");
          if (phoneClean.length < 8 || !/^\d+$/.test(phoneClean)) {
            setValidationError(translate("profileModal.phoneInvalid", currentLocale));
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
        className="space-y-6 rounded-xl border border-border bg-card p-6"
      >
        {/* Email (read-only) */}
        <div>
          <label htmlFor="profile-email" className="mb-1 block text-sm font-medium">
            {translate("customerProfile.emailLabel", currentLocale)}
          </label>
          <input
            id="profile-email"
            type="email"
            disabled
            value={profile.email}
            className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {translate("customerProfile.emailLockedDesc", currentLocale)}
          </p>
        </div>

        {/* Username */}
        <div>
          <label
            htmlFor="profile-username"
            className="mb-1 flex items-center gap-2 text-sm font-medium"
          >
            <AtSign className="h-4 w-4" />
            {translate("customerProfile.usernameLabel", currentLocale)}
          </label>
          <input
            id="profile-username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            disabled={!canChangeUsername}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm disabled:bg-muted disabled:text-muted-foreground"
            placeholder={translate("customerProfile.usernamePlaceholder", currentLocale)}
          />
          {canChangeUsername ? (
            <p className="mt-1 flex items-center gap-1 text-xs text-amber-600">
              <AlertCircle className="h-3 w-3" />
              {translate("customerProfile.usernameChangeLimitAlert", currentLocale)}
            </p>
          ) : (
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              {translate("customerProfile.usernameChangeLockedAlert", currentLocale)}
            </p>
          )}
        </div>

        {/* Full Name */}
        <div>
          <label htmlFor="profile-name" className="mb-1 block text-sm font-medium">
            {translate("customerProfile.nameLabel", currentLocale)}
          </label>
          <input
            id="profile-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            placeholder={translate("customerProfile.namePlaceholder", currentLocale)}
          />
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="profile-phone" className="mb-1 block text-sm font-medium">
            {translate("customerProfile.phoneLabel", currentLocale)}
          </label>
          <input
            id="profile-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            placeholder={translate("customerProfile.phonePlaceholder", currentLocale)}
          />
        </div>

        {/* DOB + Gender */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="profile-dob" className="mb-1 block text-sm font-medium">
              {translate("customerProfile.dobLabel", currentLocale)}
            </label>
            <input
              id="profile-dob"
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="profile-gender" className="mb-1 block text-sm font-medium">
              {translate("customerProfile.genderLabel", currentLocale)}
            </label>
            <select
              id="profile-gender"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">{translate("customerProfile.genderSelect", currentLocale)}</option>
              <option value="male">{translate("customerProfile.genderMale", currentLocale)}</option>
              <option value="female">
                {translate("customerProfile.genderFemale", currentLocale)}
              </option>
              <option value="other">
                {translate("customerProfile.genderOther", currentLocale)}
              </option>
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="profile-description" className="mb-1 block text-sm font-medium">
            {translate("customerProfile.descriptionLabel", currentLocale)}
          </label>
          <textarea
            id="profile-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
            rows={3}
            className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm"
            placeholder={translate("customerProfile.descriptionPlaceholder", currentLocale)}
          />
        </div>

        {(validationError || updateMutation.error) && (
          <p className="text-sm text-destructive">
            {validationError || updateMutation.error?.message}
          </p>
        )}

        {saved && (
          <p className="flex items-center gap-1 text-sm font-medium text-emerald-600">
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
    </div>
  );
}
