import { useMemo } from "react";

/**
 * Returns the client browser's local timezone offset in "+HH:MM" or "-HH:MM" format.
 * Memoized to prevent recalculation.
 */
export function useTimezoneOffset(): string {
  return useMemo(() => {
    const offsetMinutes = new Date().getTimezoneOffset();
    const sign = offsetMinutes <= 0 ? "+" : "-";
    const absMinutes = Math.abs(offsetMinutes);
    const hours = String(Math.floor(absMinutes / 60)).padStart(2, "0");
    const minutes = String(absMinutes % 60).padStart(2, "0");
    return `${sign}${hours}:${minutes}`;
  }, []);
}
