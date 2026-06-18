import _ from "lodash";
import { darkPaletteText, lightPaletteText } from "../../../../configs/themesConfig";
import {
  defaultThemeOptions,
  extendThemeWithMixins,
  mustHaveThemeOptions,
} from "../../../default-settings";
import type { AppThemeType } from "../AppSettings";
import useAppSettings from "./useAppSettings";

type Direction = "ltr" | "rtl";

/**
 * Plain theme object.
 * Contains only the palette, direction, typography, breakpoints,
 * spacing, shape, and mixins that layout components use.
 */
export type AppResolvedTheme = {
  direction: Direction;
  palette: {
    mode: "light" | "dark";
    primary: { main: string; light: string; dark: string; contrastText: string };
    secondary: { main: string; light: string; dark: string; contrastText: string };
    background: { default: string; paper: string };
    text: { primary: string; secondary: string; disabled?: string };
    divider: string;
    common?: { black: string; white: string; background?: string };
    error?: { main: string; light?: string; dark?: string; contrastText?: string };
    success?: { main: string; light?: string; dark?: string; contrastText?: string };
    warning?: { main: string; light?: string; dark?: string; contrastText?: string };
    info?: { main: string; light?: string; dark?: string; contrastText?: string };
    action?: {
      active?: string;
      hover?: string;
      selected?: string;
      disabled?: string;
      disabledBackground?: string;
      focus?: string;
    };
    [key: string]: unknown;
  };
  typography?: {
    fontFamily?: string;
    fontWeightLight?: number;
    fontWeightRegular?: number;
    fontWeightMedium?: number;
  };
  breakpoints?: { values?: Record<string, number> };
  spacing?: string;
  shape?: { borderRadius: number };
  mixins?: Record<string, unknown>;
};

/**
 * Generates a plain theme config object.
 */
const generateTheme = (theme: AppThemeType, direction: Direction): AppResolvedTheme => {
  const merged = _.merge({}, defaultThemeOptions, theme, mustHaveThemeOptions);
  return {
    ...merged,
    direction,
    mixins: extendThemeWithMixins(merged),
    palette: {
      ...merged.palette,
      mode: (merged.palette?.mode as "light" | "dark") ?? "light",
      primary: merged.palette?.primary ?? {
        main: "#2563eb",
        light: "#3b82f6",
        dark: "#1d4ed8",
        contrastText: "#ffffff",
      },
      secondary: merged.palette?.secondary ?? {
        main: "#f1f5f9",
        light: "#f8fafc",
        dark: "#e2e8f0",
        contrastText: "#0f172a",
      },
      background: merged.palette?.background ?? { default: "#ffffff", paper: "#ffffff" },
      text: merged.palette?.text ?? { primary: "#0f172a", secondary: "#64748b" },
      divider: (merged.palette?.divider as string) ?? "#e2e8f0",
    },
  } as AppResolvedTheme;
};

export const useMainTheme = (): AppResolvedTheme => {
  const { data: current } = useAppSettings();
  return generateTheme(current.theme.main, current.direction);
};

export const useNavbarTheme = (): AppResolvedTheme => {
  const { data: current } = useAppSettings();
  return generateTheme(current.theme.navbar, current.direction);
};

export const useToolbarTheme = (): AppResolvedTheme => {
  const { data: current } = useAppSettings();
  return generateTheme(current.theme.toolbar, current.direction);
};

export const useFooterTheme = (): AppResolvedTheme => {
  const { data: current } = useAppSettings();
  return generateTheme(current.theme.footer, current.direction);
};

export const changeThemeMode = (theme: AppThemeType, mode: "dark" | "light"): AppThemeType => {
  const modes = {
    dark: {
      palette: {
        mode: "dark",
        divider: "rgba(241,245,249,.12)",
        background: {
          paper: "#1E2125",
          default: "#121212",
        },
        text: darkPaletteText,
      },
    },
    light: {
      palette: {
        mode: "light",
        divider: "#e2e8f0",
        background: {
          paper: "#FFFFFF",
          default: "#F7F7F7",
        },
        text: lightPaletteText,
      },
    },
  };
  return _.merge({}, theme, modes[mode]);
};

/**
 * Returns relative luminance of an sRGB hex color.
 * Formula from WCAG 2.0 §1.4.3.
 */
function relativeLuminance(hex: string): number {
  const h = hex.replace("#", "");
  const r = Number.parseInt(h.substring(0, 2), 16) / 255;
  const g = Number.parseInt(h.substring(2, 4), 16) / 255;
  const b = Number.parseInt(h.substring(4, 6), 16) / 255;

  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function getContrastRatio(fg: string, bg: string): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export const useContrastMainTheme = (bgColor: string): AppResolvedTheme => {
  const isDark = (color: string): boolean => getContrastRatio(color, "#ffffff") >= 3;
  const darkTheme = useMainThemeDark();
  const lightTheme = useMainThemeLight();

  return isDark(bgColor) ? darkTheme : lightTheme;
};

export const useMainThemeDark = (): AppResolvedTheme => {
  const { data: current } = useAppSettings();
  return generateTheme(changeThemeMode(current.theme.main, "dark"), current.direction);
};

export const useMainThemeLight = (): AppResolvedTheme => {
  const { data: current } = useAppSettings();
  return generateTheme(changeThemeMode(current.theme.main, "light"), current.direction);
};
