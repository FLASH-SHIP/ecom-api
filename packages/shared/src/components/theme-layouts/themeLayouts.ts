import type React from "react";
import type { ComponentType } from "react";

/**
 * The type definition for the theme layouts.
 */
export type themeLayoutsType = Record<string, ComponentType<{ children?: React.ReactNode }>>;

/**
 * The theme layouts.
 * Layout1/2/3 removed — dead code after migration.
 * Admin uses its own custom AdminLayout component instead.
 */
const themeLayouts: themeLayoutsType = {};

export default themeLayouts;
