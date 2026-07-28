/**
 * Parses a date string (either ISO-8601 with timezone or YYYY-MM-DD date-only)
 * into a UTC Date object representing either the start or end of that day.
 *
 * @param dateStr The input date string
 * @param isEnd Whether to target the end of the day (23:59:59.999) instead of the start (00:00:00.000)
 * @param timezoneOffset Optional client timezone offset (e.g., "+07:00" or "-05:00"). Defaults to "+07:00".
 */
export function parseDateTimezone(dateStr: string, isEnd = false, timezoneOffset = "+07:00"): Date {
  const cleanStr = dateStr.trim();

  // 1. If it contains offset info (e.g., ending with Z, +HH:MM, -HH:MM)
  const hasTimezone = /Z|[+-]\d{2}:?\d{2}$/.test(cleanStr);
  if (hasTimezone) {
    return new Date(cleanStr);
  }

  // 2. If it's a date-only string (e.g., YYYY-MM-DD)
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(cleanStr);
  if (isDateOnly) {
    const timePart = isEnd ? "23:59:59.999" : "00:00:00.000";
    return new Date(`${cleanStr}T${timePart}${timezoneOffset}`);
  }

  // 3. Fallback for date-time strings without timezone (e.g., YYYY-MM-DDTHH:MM:SS)
  if (cleanStr.includes("T")) {
    return new Date(`${cleanStr}${timezoneOffset}`);
  }

  return new Date(cleanStr);
}
