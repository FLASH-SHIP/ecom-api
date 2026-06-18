"use client";
import type { AppSettingsConfigType } from "../core/AppSettings/AppSettings";

/**
 * The defaultTheme object defines the default color palette for the application.
 * Matches the theme "default" palette exactly.
 */
const defaultTheme = {
  palette: {
    mode: "light",
    text: {
      primary: "rgb(17, 24, 39)",
      secondary: "rgb(107, 114, 128)",
      disabled: "rgb(149, 156, 169)",
    },
    common: {
      black: "rgb(17, 24, 39)",
      white: "rgb(255, 255, 255)",
    },
    primary: {
      light: "#363B44",
      main: "#1F232B",
      dark: "#0F1115",
      contrastText: "#FFFFFF",
    },
    secondary: {
      light: "#3C83D6",
      main: "#1565C0",
      dark: "#0E4B90",
      contrastText: "#FFFFFF",
    },
    background: {
      paper: "#FFFFFF",
      default: "#F6F7F8",
    },
    error: {
      light: "#F87171",
      main: "#EF4444",
      dark: "#B91C1C",
      contrastText: "#FFFFFF",
    },
  },
};

/**
 * The defaultSettings object defines the default settings for the application.
 */
export const defaultSettings = {
  customScrollbars: true,
  direction: "ltr",
  layout: {},
  theme: {
    main: defaultTheme,
    navbar: defaultTheme,
    toolbar: defaultTheme,
    footer: defaultTheme,
  },
};

/**
 * The getParsedQuerySettings function parses the query string to retrieve the default settings for the application.
 */
export function getParsedQuerySettings(): AppSettingsConfigType | object {
  if (typeof window === "undefined") {
    return null;
  }

  const parsedQueryString = new URLSearchParams(window?.location?.search);
  const defaultSettingsParam = parsedQueryString.get("defaultSettings");

  if (defaultSettingsParam) {
    return JSON.parse(defaultSettingsParam) as AppSettingsConfigType;
  }

  return {};
}

/**
 * Default theme options.
 * Only palette, typography, breakpoints, spacing, shape.
 */
export const defaultThemeOptions = {
  spacing: "0.5rem",
  typography: {
    fontFamily: ["Geist", "Roboto", '"Helvetica"', "Arial", "sans-serif"].join(","),
    fontWeightLight: 300,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 960,
      lg: 1280,
      xl: 1920,
    },
  },
  shape: {
    borderRadius: 8,
  },
};

/**
 * Must-have theme options that override user settings.
 */
export const mustHaveThemeOptions = {};

/**
 * Extends a theme config with toolbar/navbar mixins.
 */
export function extendThemeWithMixins(obj: Record<string, unknown>) {
  const themeObj = obj as { breakpoints?: { values?: Record<string, number> } };
  const breakpoints = themeObj?.breakpoints?.values ?? defaultThemeOptions.breakpoints.values;

  return {
    border: (width = 1) => ({ borderWidth: width }),
    borderLeft: (width = 1) => ({ borderLeftWidth: width }),
    borderRight: (width = 1) => ({ borderRightWidth: width }),
    borderTop: (width = 1) => ({ borderTopWidth: width }),
    borderBottom: (width = 1) => ({ borderBottomWidth: width }),
    toolbar: {
      minHeight: 48,
      [`@media (min-width: ${breakpoints.sm}px)`]: {
        minHeight: 48,
      },
    },
  };
}
