"use client";

/**
 * Tailwind handles base reset and theming via CSS variables.
 * This provider is a no-op passthrough — kept for backward compatibility
 * without external theme provider dependencies.
 */
export function CustomerThemeProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
