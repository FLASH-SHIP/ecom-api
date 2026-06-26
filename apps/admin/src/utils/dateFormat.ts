/**
 * Standardised date formatting utilities for the admin CMS.
 *
 * Display format : DD-MM-YYYY  (e.g. 07-06-2026)
 * DateTime format: DD-MM-YYYY HH:mm (e.g. 07-06-2026 14:30)
 * API format     : YYYY-MM-DD  (e.g. 2026-06-07)
 * DatePicker fmt : dd-MM-yyyy  (date-fns token)
 */

/** date-fns display format token */
export const DATE_PICKER_FORMAT = "dd-MM-yyyy";

/** Display placeholder matching the standard format */
export const DATE_DISPLAY_PLACEHOLDER = "DD-MM-YYYY";

// ── Internal helper ────────────────────────────────────────────────────────────

function toSafeDate(value: string | number | Date | null | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

// ── Display formatters ─────────────────────────────────────────────────────────

/** Format a Date-like value as DD-MM-YYYY */
export function formatDate(value: string | number | Date | null | undefined): string {
  const d = toSafeDate(value);
  if (!d) return value != null ? String(value) : "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

/** Format a Date-like value with a custom format (default: "DD-MM-YYYY HH:mm") */
export function formatDateTime(
  value: string | number | Date | null | undefined,
  format = "DD-MM-YYYY HH:mm",
): string {
  const d = toSafeDate(value);
  if (!d) return value != null ? String(value) : "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear());
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const seconds = String(d.getSeconds()).padStart(2, "0");

  return format
    .replace(/DD|dd/g, day)
    .replace(/MM/g, month)
    .replace(/YYYY|yyyy/g, year)
    .replace(/HH|hh/g, hours)
    .replace(/mm/g, minutes)
    .replace(/ss/g, seconds);
}

// ── API formatter ──────────────────────────────────────────────────────────────

/** Format a Date-like value as YYYY-MM-DD for server/API communication */
export function formatDateForApi(value: string | number | Date | null | undefined): string {
  const d = toSafeDate(value);
  if (!d) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// ── Relative time ──────────────────────────────────────────────────────────────

const RELATIVE_THRESHOLDS: { max: number; divisor: number; unit: Intl.RelativeTimeFormatUnit }[] = [
  { max: 60, divisor: 1, unit: "second" },
  { max: 3600, divisor: 60, unit: "minute" },
  { max: 86400, divisor: 3600, unit: "hour" },
  { max: 2592000, divisor: 86400, unit: "day" },
  { max: Infinity, divisor: 2592000, unit: "month" },
];

/**
 * Format a Date-like value as locale-aware relative time (e.g. "5 minutes ago").
 * Uses Intl.RelativeTimeFormat for proper i18n support.
 *
 * @param value - Date-like input
 * @param locale - BCP 47 locale string (defaults to "vi")
 */
export function formatRelativeTime(
  value: string | number | Date | null | undefined,
  locale = "vi",
): string {
  const d = toSafeDate(value);
  if (!d) return "";
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 0) return formatDateTime(value);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  for (const { max, divisor, unit } of RELATIVE_THRESHOLDS) {
    if (seconds < max) {
      const amount = -Math.floor(seconds / divisor);
      return rtf.format(amount, unit);
    }
  }

  return formatDate(value);
}
