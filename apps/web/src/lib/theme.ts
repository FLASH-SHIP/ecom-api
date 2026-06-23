/**
 * Customer theme tokens.
 * These values are used by globals.css (via @theme) and available as Tailwind utilities.
 */
export const customerTheme = {
  colors: {
    primary: {
      DEFAULT: "#2563EB", // blue-600
      light: "#3B82F6", // blue-500
      dark: "#1D4ED8", // blue-700
      foreground: "#FFFFFF",
    },
    secondary: {
      DEFAULT: "#7C3AED", // violet-600
      light: "#8B5CF6",
      dark: "#6D28D9",
      foreground: "#FFFFFF",
    },
    background: {
      DEFAULT: "#F8FAFC",
      card: "#FFFFFF",
    },
    foreground: {
      DEFAULT: "#0F172A",
      muted: "#475569",
    },
    border: "#E2E8F0",
  },
  borderRadius: "0.75rem",
} as const;
