import { useEffect, useState } from "react";

/**
 * Delays updating the returned value until `delay` ms have passed
 * since the last change to `value`. Useful for search inputs to avoid
 * firing an API request on every keystroke.
 *
 * @example
 * const debouncedSearch = useDebounce(search, 300);
 * // Only triggers re-query when the user stops typing for 300ms
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
