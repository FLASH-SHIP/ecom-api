/**
 * Theme layout configuration defaults.
 *
 * The admin app no longer uses the layout1/2/3 components
 * (they were removed during the Tailwind v4 migration),
 * but AppSettingsProvider still references this map for settings merging.
 *
 * Each key provides minimal defaults so that
 * `themeLayoutConfigs[style]?.defaults` never blows up at runtime.
 */
import type ThemeFormConfigTypes from "../../@app/core/AppSettings/ThemeFormConfigTypes";

export type themeLayoutDefaultsProps = {
  mode: "container" | "fullwidth";
  scroll: "content" | "body";
  navbar: { display: boolean; style?: string; position?: string; open?: boolean };
  toolbar: { display: boolean; position?: string; style?: string };
  footer: { display: boolean; position?: string; style?: string };
  leftSidePanel?: { display: boolean };
  rightSidePanel?: { display: boolean };
};

export type themeLayoutProps = {
  title: string;
  defaults: themeLayoutDefaultsProps;
  form?: ThemeFormConfigTypes;
};

export type themeLayoutConfigsProps = Record<string, themeLayoutProps>;

const layout1Defaults: themeLayoutDefaultsProps = {
  mode: "container",
  scroll: "content",
  navbar: { display: true, style: "style-1", position: "left", open: true },
  toolbar: { display: true, style: "fixed", position: "below" },
  footer: { display: false, style: "fixed" },
};

const themeLayoutConfigs: themeLayoutConfigsProps = {
  layout1: { title: "Layout 1", defaults: layout1Defaults },
  layout2: { title: "Layout 2", defaults: { ...layout1Defaults, mode: "fullwidth" } },
  layout3: { title: "Layout 3", defaults: { ...layout1Defaults, mode: "fullwidth" } },
};

export default themeLayoutConfigs;
