import type * as React from "react";

type RootThemeProviderProps = {
  children: React.ReactNode;
};

/**
 * RootThemeProvider — provides application-level theme context.
 * Now a pass-through since CSS reset is handled by Tailwind's Preflight/base layer
 * and theme tokens are defined in globals.css.
 */
function RootThemeProvider({ children }: RootThemeProviderProps) {
  return <>{children}</>;
}

export default RootThemeProvider;
