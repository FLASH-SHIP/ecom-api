"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useTheme } from "../lib/CustomerThemeProvider";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = "" }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className={`w-9 h-9 rounded-full ${className}`} />;
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`flex items-center justify-center w-9 h-9 rounded-full border border-white/20 bg-slate-950/40 dark:bg-white/10 backdrop-blur-md text-white hover:bg-slate-900/60 dark:hover:bg-white/20 transition-all shadow-md cursor-pointer ${className}`}
      aria-label="Toggle theme"
    >
      {theme === "dark" ? (
        <Sun className="w-4.5 h-4.5 text-amber-400 animate-pulse" />
      ) : (
        <Moon className="w-4.5 h-4.5 text-slate-100" />
      )}
    </button>
  );
}
