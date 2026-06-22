# Technical Documentation: Internationalization (i18n) Architecture & Optimizations

This document explains the decoupled internationalization (i18n) architecture implemented in the Ecom admin application, detailing how translation files are structured, loaded on demand, strictly type-checked, and validated.

---

## 1. Architectural Overview

To prevent performance degradation (network overhead, HTML hydration bloat) and eliminate frequent git merge conflicts from a single massive `common.json` file, the translations are decomposed into modular, domain-specific namespace files. 

The architecture consists of four pillars:
1. **Decomposed Translation Keys**: Segmented JSON files representing distinct feature domains.
2. **Scoped Loading (`ModuleI18nProvider`)**: A React Server Component wrapping modules/pages to serialize and load only the required translations on demand.
3. **Strict Type-Safety**: Global TypeScript interface declarations enabling autocomplete and compilation errors for missing/misspelled keys.
4. **Translation Sync Verification**: An automated validation script running in the CI/CD pipeline to verify translation keys match exactly between locales.

---

## 2. Directory Structure & Namespace Files

Locales are maintained inside the `@ecom/i18n` package under the [packages/i18n/locales/](file:///Users/tuandang/Data/FlashShip/ecom/packages/i18n/locales/) directory:

```bash
packages/i18n/locales/
  ├── en/
  │    ├── common.json         # Layout-wide elements, navigation, auth, and error pages
  │    ├── customers.json      # Customer accounts listing, drawer form, details
  │    ├── posts.json          # Blog posts listing, creation, status, and actions
  │    ├── categories.json     # Categories listing, edit drawer
  │    ├── users.json          # Admin users, user profile updates, passwords
  │    └── ... (other domain-specific json files)
  └── vi/
       ├── common.json
       ├── customers.json
       └── ...
```

---

## 3. next-intl Request Loader

The request configuration resides in [apps/admin/src/i18n/request.ts](file:///Users/tuandang/Data/FlashShip/ecom/apps/admin/src/i18n/request.ts). It imports all namespace files explicitly (retaining full Next.js Turbopack compatibility) and merges them into the returned `messages` context:

```typescript
export default getRequestConfig(async () => {
  // ...
  const messages = locale === "vi" 
    ? {
        ...(await import("@ecom/i18n/locales/vi/common.json")).default,
        customers: (await import("@ecom/i18n/locales/vi/customers.json")).default,
        posts: (await import("@ecom/i18n/locales/vi/posts.json")).default,
        // ... (all other namespaces)
      }
    : {
        ...(await import("@ecom/i18n/locales/en/common.json")).default,
        customers: (await import("@ecom/i18n/locales/en/customers.json")).default,
        posts: (await import("@ecom/i18n/locales/en/posts.json")).default,
        // ... (all other namespaces)
      };

  return { locale, messages };
});
```

*Note: By keeping the keys nested under their respective namespace names inside the merged object, existing `useTranslations("namespace")` references continue working with zero code modifications.*

---

## 4. Scoped Client-Side Loading (`ModuleI18nProvider`)

By default, loading all translations inside Next.js's root layout sends the entire translation database (all 24 JSON files) to the client browser. 

To resolve this, we use the custom React Server Component [ModuleI18nProvider.tsx](file:///Users/tuandang/Data/FlashShip/ecom/apps/admin/src/components/i18n/ModuleI18nProvider.tsx) to wrap page/module routes:

```tsx
import ModuleI18nProvider from "@admin/components/i18n/ModuleI18nProvider";

export default function CustomersPage() {
  return (
    <ModuleI18nProvider namespaces={["customers", "users"]}>
      <CustomersContent />
    </ModuleI18nProvider>
  );
}
```

### Inner Workings:
1. It queries next-intl's `getMessages()` on the server side.
2. It picks only the requested `namespaces`.
3. It **automatically appends** shared layouts namespaces (`common`, `auth`, `nav`, `errors`, `dataTable`) so global components (navigation sidebar, headers, tables, toasts, buttons) continue to resolve successfully.
4. It wraps the page content in a nested client-side `<NextIntlClientProvider>` containing only this optimized subset of messages, avoiding loading thousands of irrelevant keys.

---

## 5. Strict Type-Safety

We configure TypeScript declaration merges in [i18n.d.ts](file:///Users/tuandang/Data/FlashShip/ecom/apps/admin/src/types/i18n.d.ts) to type check all next-intl translation calls:

```typescript
import type enCommon from "@ecom/i18n/locales/en/common.json";
import type enCustomers from "@ecom/i18n/locales/en/customers.json";

type Messages = typeof enCommon & {
  customers: typeof enCustomers;
  // ...
};

declare global {
  interface IntlMessages extends Messages {}
}
```

### Benefits:
* **IDE Autocomplete**: Typing `t("customers.f...")` automatically suggests `fields`, `form`, etc.
* **Compile-Time Checks**: If a key is changed or removed, or if a typo is introduced (e.g. `t("customers.field.name")` instead of `fields`), `yarn type-check` will throw a compilation error, preventing broken keys from reaching production.

---

## 6. Translation Synchronization Verification

To prevent translation drift (e.g. adding a key to `vi/customers.json` but forgetting it in `en/customers.json`), an automated script checks both locale directories recursively:

### Running the Validator:
```bash
yarn workspace @ecom/i18n validate
```
This script runs in the CI/CD pipelines and checks that the key hierarchies of English and Vietnamese translation files match 100% identically.

---

## 7. Developer Guide: Adding & Modifying Translations

### Step 1: Identify or Create the Namespace
* If you are editing an existing module (e.g. `customers`), add your keys to the existing file:
  * `packages/i18n/locales/vi/customers.json`
  * `packages/i18n/locales/en/customers.json`
* If you are building a new module (e.g. `inventory`):
  1. Create `inventory.json` in both `locales/en/` and `locales/vi/`.
  2. Add the file import to `request.ts` for both languages:
     `inventory: (await import("@ecom/i18n/locales/[locale]/inventory.json")).default`
  3. Import and add it to `apps/admin/src/types/i18n.d.ts` inside the `Messages` type intersection.

### Step 2: Validate Keys
Always run the validation script and type check to ensure correctness:
```bash
yarn workspace @ecom/i18n validate
yarn type-check
```

### Step 3: Scope the Page
If writing a new page, make the entry point file (`page.tsx` or `layout.tsx`) a Server Component (remove `"use client"` if present) and wrap your main layout/client components with the scoped provider:
```tsx
import ModuleI18nProvider from "@admin/components/i18n/ModuleI18nProvider";

export default function NewModulePage() {
  return (
    <ModuleI18nProvider namespaces={["inventory"]}>
      <InventoryContent />
    </ModuleI18nProvider>
  );
}
```
