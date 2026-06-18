import type { PartialDeep } from "type-fest";
import type { themeLayoutDefaultsProps } from "../../../components/theme-layouts/themeLayoutConfigs";

/**
 * Plain palette config.
 */
export type PaletteConfig = {
  mode?: "light" | "dark";
  primary?: { main: string; light?: string; dark?: string; contrastText?: string };
  secondary?: { main: string; light?: string; dark?: string; contrastText?: string };
  background?: { default?: string; paper?: string };
  text?: { primary?: string; secondary?: string; disabled?: string };
  divider?: string;
  common?: { black?: string; white?: string; background?: string };
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
  grey?: Record<string | number, string>;
  [key: string]: unknown;
};

export type AppThemeType = { palette: PartialDeep<PaletteConfig> };
export type AppThemesType = Record<string, AppThemeType>;
export type AppSettingsConfigType = {
  layout: { style?: string; config?: PartialDeep<themeLayoutDefaultsProps> };
  customScrollbars?: boolean;
  direction: "rtl" | "ltr";
  theme: {
    main: AppThemeType;
    navbar: AppThemeType;
    toolbar: AppThemeType;
    footer: AppThemeType;
  };
  defaultAuth?: string[];
  loginRedirectUrl: string;
};
