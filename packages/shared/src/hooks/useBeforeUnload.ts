import { useEffect } from "react";

/**
 * Custom hook to prevent accidental page reload, tab closure, or URL navigation.
 * Shared across monorepo applications (Admin & Customer).
 * @param shouldBlock - Condition flag to determine whether to enable the page leave blocker.
 */
export function useBeforeUnload(shouldBlock: boolean) {
  useEffect(() => {
    if (!shouldBlock) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [shouldBlock]);
}
