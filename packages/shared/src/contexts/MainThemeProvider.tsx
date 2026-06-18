import type * as React from "react";
import { useMainTheme } from "../@app/core/AppSettings/hooks/themeHooks";
import AppTheme from "../@app/core/AppTheme";

type MainThemeProviderProps = {
  children: React.ReactNode;
};

function MainThemeProvider({ children }: MainThemeProviderProps) {
  const mainTheme = useMainTheme();

  return (
    <AppTheme theme={mainTheme} root>
      {children}
    </AppTheme>
  );
}

export default MainThemeProvider;
