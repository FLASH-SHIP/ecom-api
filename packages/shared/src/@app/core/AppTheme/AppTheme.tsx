import { memo, type ReactNode, useEffect, useLayoutEffect } from "react";
import type { AppResolvedTheme } from "../AppSettings/hooks/themeHooks";

const useEnhancedEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

type AppThemeProps = {
  children: ReactNode;
  theme: AppResolvedTheme;
  root?: boolean;
};

/**
 * AppTheme — sets document direction and dark/light mode class on body.
 * Lightweight theme context wrapper.
 */
function AppTheme(props: AppThemeProps) {
  const { theme, children, root = false } = props;
  const mode = theme.palette?.mode ?? "light";
  const langDirection = theme.direction ?? "ltr";

  useEnhancedEffect(() => {
    if (root) {
      document.documentElement.dir = langDirection;
    }
  }, [langDirection, root]);

  useEffect(() => {
    if (root) {
      document.body.classList.add(mode === "light" ? "light" : "dark");
      document.body.classList.remove(mode === "light" ? "dark" : "light");
    }
  }, [mode, root]);

  if (root) {
    return <div className="flex min-h-screen w-full flex-col">{children}</div>;
  }

  return <>{children}</>;
}

export default memo(AppTheme);
