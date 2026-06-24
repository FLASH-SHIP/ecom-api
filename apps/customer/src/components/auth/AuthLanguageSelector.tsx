import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type SupportedLocale } from "../../lib/i18n";
import { trpc } from "../../lib/trpc";

function getFlagEmoji(countryCode: string | null | undefined): string {
  if (!countryCode) return "🌐";
  const code = countryCode.toUpperCase();
  if (code.length !== 2) return countryCode;
  const codePoints = [...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65);
  return String.fromCodePoint(...codePoints);
}

export function AuthLanguageSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const [langOpen, setLangOpen] = useState(false);

  // Fetch languages dynamically from the database
  const { data: dbLanguages } = trpc.public.languages.getActive.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // cache for 5 minutes
  });

  // Detect current locale from path
  const currentLocale: SupportedLocale = pathname
    ? ((SUPPORTED_LOCALES.find(
        (l) => pathname.startsWith(`/${l}/`) || pathname === `/${l}`,
      ) as SupportedLocale) ?? DEFAULT_LOCALE)
    : DEFAULT_LOCALE;

  // Fallback static list in case DB query is loading or empty
  const defaultLocalesList = [
    { code: "vi", name: "Tiếng Việt", flag: "vn" },
    { code: "en", name: "English", flag: "us" },
  ];

  // Filter languages to only show active ones that are supported by the customer app
  const activeLanguages = dbLanguages
    ? dbLanguages
        .filter((lang) => {
          const matchCode = lang.code.toLowerCase();
          const matchLocale = lang.locale.toLowerCase();
          return (
            SUPPORTED_LOCALES.includes(matchCode as SupportedLocale) ||
            SUPPORTED_LOCALES.includes(matchLocale as SupportedLocale)
          );
        })
        .map((lang) => {
          const code = SUPPORTED_LOCALES.includes(lang.code as SupportedLocale)
            ? lang.code
            : lang.locale;
          let flagCode = lang.flag || "";
          if (!flagCode) {
            flagCode = code === "vi" ? "vn" : "us";
          }
          return {
            code,
            name: lang.name,
            flag: getFlagEmoji(flagCode),
          };
        })
    : defaultLocalesList.map((l) => ({ ...l, flag: getFlagEmoji(l.flag) }));

  // Find label and flag for current locale
  const currentLanguage = activeLanguages.find((l) => l.code === currentLocale) || {
    code: currentLocale,
    name: currentLocale === "vi" ? "Tiếng Việt" : "English",
    flag: currentLocale === "vi" ? "🇻🇳" : "🇺🇸",
  };

  function switchLocale(targetLocale: string) {
    if (targetLocale === currentLocale) {
      setLangOpen(false);
      return;
    }

    if (!pathname) return;

    let newPath: string;
    if (pathname.startsWith(`/${currentLocale}/`)) {
      newPath = `/${targetLocale}/${pathname.slice(currentLocale.length + 2)}`;
    } else if (pathname === `/${currentLocale}`) {
      newPath = `/${targetLocale}`;
    } else {
      newPath = `/${targetLocale}${pathname}`;
    }

    // biome-ignore lint/suspicious/noDocumentCookie: cookie needs to be set client-side
    document.cookie = `NEXT_LOCALE=${targetLocale}; path=/; max-age=${365 * 24 * 60 * 60}; SameSite=Lax`;
    setLangOpen(false);
    router.push(newPath);
  }

  return (
    <div className="relative z-50">
      <button
        type="button"
        onClick={() => setLangOpen(!langOpen)}
        className="flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-sm cursor-pointer select-none"
      >
        <span className="text-base leading-none">{currentLanguage.flag}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500"
        >
          <title>Caret Down</title>
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {langOpen && (
        <>
          {/* Overlay to close when clicking outside */}
          <button
            type="button"
            aria-label="Close language selector"
            className="fixed inset-0 z-40 bg-transparent cursor-default w-full h-full"
            onClick={() => setLangOpen(false)}
          />
          <div className="absolute right-0 top-full z-50 mt-1.5 min-w-[140px] rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 py-1 shadow-xl">
            {activeLanguages.map((localeObj) => {
              const isActive = localeObj.code === currentLocale;
              return (
                <button
                  key={localeObj.code}
                  type="button"
                  onClick={() => switchLocale(localeObj.code)}
                  className={`flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-xs font-bold transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer ${
                    isActive
                      ? "text-cyan-500 bg-cyan-50/30 dark:bg-cyan-500/10"
                      : "text-slate-600 dark:text-slate-300"
                  }`}
                >
                  <span className="text-base leading-none">{localeObj.flag}</span>
                  <span>{localeObj.name}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
