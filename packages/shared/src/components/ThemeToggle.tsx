"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState, useCallback } from "react";

interface ThemeToggleProps {
  className?: string;
  storageKey?: string;
}

export function ThemeToggle({ className = "", storageKey = "theme" }: ThemeToggleProps) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
        setTheme("dark");
        document.documentElement.classList.add("dark");
      } else {
        setTheme("light");
        document.documentElement.classList.remove("dark");
      }
    } catch {
      // Fallback
    }
  }, [storageKey]);

  const toggleTheme = useCallback(() => {
    const html = document.documentElement;
    const nextTheme = theme === "dark" ? "light" : "dark";
    if (nextTheme === "dark") {
      html.classList.add("dark");
    } else {
      html.classList.remove("dark");
    }
    setTheme(nextTheme);
    try {
      localStorage.setItem(storageKey, nextTheme);
    } catch {
      // Ignore
    }
  }, [theme, storageKey]);

  if (!mounted) {
    return <div className={`w-9 h-9 rounded-lg ${className}`} />;
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`flex cursor-pointer size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${className}`}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
    >
      {theme === "dark" ? (
        <Sun className="h-[18px] w-[18px] text-amber-400" strokeWidth={1.8} />
      ) : (
        <Moon className="h-[18px] w-[18px]" strokeWidth={1.8} />
      )}
    </button>
  );
}
