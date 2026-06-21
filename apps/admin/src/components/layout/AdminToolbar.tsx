"use client";

import useNavigationItems from "@ecom/shared/components/theme-layouts/components/navigation/hooks/useNavigationItems";
import { PerfectScroll } from "@ecom/ui/components/perfect-scroll";
import { Popover, PopoverContent, PopoverTrigger } from "@ecom/ui/components/popover";
import { cn } from "@ecom/ui/lib/utils";
import type { LanguageType } from "@i18n/I18nContext";
import useI18n from "@i18n/useI18n";
import { ALargeSmall, Maximize, Minimize, Moon, PanelLeft, Search, Star, Sun } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAdminSidebar } from "./AdminSidebarContext";
import { getNavIcon } from "./nav-icons";

// ─── LanguageSwitcher ─────────────────────────────────────────────────────────

function LanguageSwitcherInline() {
  const { language, languages, changeLanguage } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!mounted || !language) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <Image
          className="h-4 w-5"
          src={`/assets/images/flags/${language.flag}.svg`}
          alt={language.title}
          width={20}
          height={16}
        />
        <span className="uppercase">{language.id}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[160px] rounded-lg border border-border bg-popover p-1 shadow-lg">
          {languages.map((lng: LanguageType) => (
            <button
              key={lng.id}
              type="button"
              onClick={() => {
                changeLanguage(lng.id);
                setOpen(false);
              }}
              className={cn(
                "flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent",
                lng.id === language.id && "bg-accent font-medium",
              )}
            >
              <Image
                className="h-4 w-5"
                src={`/assets/images/flags/${lng.flag}.svg`}
                alt={lng.title}
                width={20}
                height={16}
              />
              {lng.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── AdjustFontSize ───────────────────────────────────────────────────────────

const FONT_SIZE_MIN = 70;
const FONT_SIZE_MAX = 130;
const FONT_SIZE_DEFAULT = 100;

const FONT_SIZE_LABELS = [70, 80, 90, 100, 110, 120, 130];
const FONT_SIZE_STORAGE_KEY = "admin_font_size";

function AdjustFontSizeButton() {
  const [fontSize, setFontSize] = useState(FONT_SIZE_DEFAULT);

  // Restore saved font size preference on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(FONT_SIZE_STORAGE_KEY);
      if (saved) {
        const parsed = Number(saved);
        if (parsed >= FONT_SIZE_MIN && parsed <= FONT_SIZE_MAX) {
          setFontSize(parsed);
          document.documentElement.style.fontSize = `${parsed}%`;
        }
      }
    } catch {
      // localStorage unavailable
    }
  }, []);

  const handleChange = useCallback((value: number) => {
    setFontSize(value);
    document.documentElement.style.fontSize = `${value}%`;
    try {
      if (value === FONT_SIZE_DEFAULT) {
        localStorage.removeItem(FONT_SIZE_STORAGE_KEY);
      } else {
        localStorage.setItem(FONT_SIZE_STORAGE_KEY, String(value));
      }
    } catch {
      // localStorage unavailable
    }
  }, []);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex cursor-pointer size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          title="Font Size"
        >
          <ALargeSmall className="h-5 w-5" strokeWidth={1.8} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="center" className="w-80 p-0">
        <div className="px-4 py-3">
          {/* Title row */}
          <div className="mb-4 flex items-center justify-center gap-2 text-sm font-semibold text-muted-foreground">
            <ALargeSmall className="h-5 w-5" strokeWidth={1.8} />
            Font Size
          </div>

          {/* Layer 1: Rail + Dots (absolute positioning for perfect vertical centering) */}
          <div className="relative mx-auto h-7" style={{ width: "calc(100% - 24px)" }}>
            {/* Rail line — perfectly centered vertically */}
            <div className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 bg-primary/20" />

            {/* Dots — absolutely positioned at exact % on the rail */}
            {FONT_SIZE_LABELS.map((mark, i) => {
              const pct = (i / (FONT_SIZE_LABELS.length - 1)) * 100;
              const isActive = mark === fontSize;
              return (
                <button
                  key={mark}
                  type="button"
                  onClick={() => handleChange(mark)}
                  className="group absolute top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-pointer"
                  style={{ left: `${pct}%` }}
                >
                  {/* Hover ring */}
                  <span className="absolute left-1/2 top-1/2 h-0 w-0 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-150 group-hover:h-7 group-hover:w-7 group-hover:bg-primary/10" />
                  {/* Dot */}
                  <span
                    className={cn(
                      "relative z-10 block rounded-full transition-all duration-150",
                      isActive
                        ? "h-3 w-3 bg-primary"
                        : "h-1.5 w-1.5 bg-primary/30 group-hover:bg-primary/50",
                    )}
                  />
                </button>
              );
            })}
          </div>

          {/* Layer 2: Labels — same container width and absolute positioning as dots */}
          <div className="relative mx-auto mt-2 h-5" style={{ width: "calc(100% - 24px)" }}>
            {FONT_SIZE_LABELS.map((mark, i) => {
              const pct = (i / (FONT_SIZE_LABELS.length - 1)) * 100;
              const isActive = mark === fontSize;
              return (
                <button
                  key={mark}
                  type="button"
                  onClick={() => handleChange(mark)}
                  className={cn(
                    "absolute -translate-x-1/2 cursor-pointer text-xs font-semibold tabular-nums transition-colors",
                    isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                  style={{ left: `${pct}%` }}
                >
                  {mark}%
                </button>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── FullScreenToggle ─────────────────────────────────────────────────────────

interface FullscreenDoc extends Document {
  webkitFullscreenElement?: Element | null;
  mozFullScreenElement?: Element | null;
  webkitExitFullscreen?: () => void;
  mozCancelFullScreen?: () => void;
}

interface FullscreenElem extends HTMLElement {
  webkitRequestFullscreen?: () => void;
  mozRequestFullScreen?: () => void;
}

function getFullscreenElement(): Element | null {
  const doc = document as FullscreenDoc;
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? doc.mozFullScreenElement ?? null;
}

function openFullscreen() {
  const elem = document.documentElement as FullscreenElem;
  if (elem.requestFullscreen) {
    elem.requestFullscreen();
  } else if (elem.webkitRequestFullscreen) {
    elem.webkitRequestFullscreen();
  } else if (elem.mozRequestFullScreen) {
    elem.mozRequestFullScreen();
  }
}

function closeFullscreen() {
  const doc = document as FullscreenDoc;
  if (doc.exitFullscreen) {
    doc.exitFullscreen();
  } else if (doc.webkitExitFullscreen) {
    doc.webkitExitFullscreen();
  } else if (doc.mozCancelFullScreen) {
    doc.mozCancelFullScreen();
  }
}

function FullScreenToggleButton() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    function handleChange() {
      setIsFullscreen(!!getFullscreenElement());
    }
    document.addEventListener("fullscreenchange", handleChange);
    document.addEventListener("webkitfullscreenchange", handleChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleChange);
      document.removeEventListener("webkitfullscreenchange", handleChange);
    };
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (getFullscreenElement()) {
      closeFullscreen();
    } else {
      openFullscreen();
    }
  }, []);

  return (
    <button
      type="button"
      onClick={toggleFullscreen}
      className="flex cursor-pointer size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
    >
      {isFullscreen ? (
        <Minimize className="h-[18px] w-[18px]" strokeWidth={1.8} />
      ) : (
        <Maximize className="h-[18px] w-[18px]" strokeWidth={1.8} />
      )}
    </button>
  );
}

// ─── ThemeToggle (Fix #3: dark mode persistence) ──────────────────────────────

function ThemeToggleButton() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Restore saved theme preference from localStorage
    try {
      const saved = localStorage.getItem("theme");
      if (saved === "dark") {
        document.documentElement.classList.add("dark");
        setIsDark(true);
      } else if (saved === "light") {
        document.documentElement.classList.remove("dark");
        setIsDark(false);
      } else {
        // No saved preference — read current DOM state
        setIsDark(document.documentElement.classList.contains("dark"));
      }
    } catch {
      setIsDark(document.documentElement.classList.contains("dark"));
    }
  }, []);

  const toggleTheme = useCallback(() => {
    const html = document.documentElement;
    const nextDark = !html.classList.contains("dark");
    if (nextDark) {
      html.classList.add("dark");
    } else {
      html.classList.remove("dark");
    }
    setIsDark(nextDark);
    try {
      localStorage.setItem("theme", nextDark ? "dark" : "light");
    } catch {
      // Ignore storage errors
    }
  }, []);

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex cursor-pointer size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      title={isDark ? "Light mode" : "Dark mode"}
    >
      {isDark ? (
        <Sun className="h-[18px] w-[18px]" strokeWidth={1.8} />
      ) : (
        <Moon className="h-[18px] w-[18px]" strokeWidth={1.8} />
      )}
    </button>
  );
}

function SearchButton() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { flattenData: navigation } = useNavigationItems();

  const allItems = useMemo(
    () =>
      navigation?.filter(
        (item) => item.type === "item" && item.url && item.hasPermission !== false,
      ) ?? [],
    [navigation],
  );

  const results = useMemo(() => {
    if (!query.trim()) return allItems.slice(0, 10);
    const q = query.toLowerCase();
    return allItems.filter((item) => item.title?.toLowerCase().includes(q)).slice(0, 15);
  }, [query, allItems]);

  // Cmd+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Auto-focus and reset query when dialog opens
  useEffect(() => {
    if (open) {
      setQuery("");
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex cursor-pointer size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        title="Search (⌘K)"
      >
        <Search className="h-[18px] w-[18px]" strokeWidth={1.8} />
      </button>

      {open && (
        <>
          {/* Backdrop — semantic button for click-to-dismiss */}
          <button
            type="button"
            className="fixed inset-0 z-modal bg-black/50"
            onClick={() => setOpen(false)}
            aria-label="Close search"
          />

          {/* Search dialog */}
          <div className="fixed inset-0 z-modal flex pointer-events-none items-start justify-center pt-[15vh]">
            <div className="pointer-events-auto relative w-full max-w-lg overflow-hidden rounded-xl border border-border bg-popover shadow-2xl">
              {/* Search input */}
              <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                <Search className="size-5 shrink-0 text-muted-foreground" strokeWidth={1.8} />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search pages..."
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setOpen(false);
                  }}
                />
                <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-block">
                  ESC
                </kbd>
              </div>

              {/* Results */}
              <PerfectScroll className="max-h-72 py-2">
                {results.length === 0 && query.trim() && (
                  <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                    No results found.
                  </p>
                )}
                {results.map((item) => {
                  const Icon = getNavIcon(item.icon as string);
                  return (
                    <Link
                      key={item.id}
                      href={item.url ?? "#"}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-accent"
                    >
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        {Icon ? (
                          <Icon className="size-4" strokeWidth={1.8} />
                        ) : (
                          <span className="text-xs font-semibold uppercase">{item.title?.[0]}</span>
                        )}
                      </span>
                      <span className="flex-1 truncate">{item.title}</span>
                    </Link>
                  );
                })}
              </PerfectScroll>
            </div>
          </div>
        </>
      )}
    </>
  );
}

// ─── ToolbarShortcuts ─────────────────────────────────────────────────────────

const SHORTCUTS_STORAGE_KEY = "admin_shortcuts";

function loadShortcutIds(): string[] {
  try {
    const raw = localStorage.getItem(SHORTCUTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveShortcutIds(ids: string[]) {
  try {
    localStorage.setItem(SHORTCUTS_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // localStorage unavailable
  }
}

/**
 * Admin-style toolbar shortcuts with pin/unpin popover.
 *
 * - Shows pinned nav items as icon links
 * - Amber star icon opens a Popover with search + pin/unpin list
 * - Pinned shortcuts are persisted to localStorage
 */
function ToolbarShortcuts() {
  const { flattenData: navigation } = useNavigationItems();
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [searchText, setSearchText] = useState("");
  const [popoverOpen, setPopoverOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load pinned shortcuts from localStorage on mount
  useEffect(() => {
    setPinnedIds(loadShortcutIds());
  }, []);

  // Auto-focus search when popover opens
  useEffect(() => {
    if (popoverOpen) {
      // Small delay to let the popover animate in
      const timer = setTimeout(() => searchInputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
    setSearchText("");
  }, [popoverOpen]);

  const togglePin = useCallback((id: string) => {
    setPinnedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id];
      saveShortcutIds(next);
      return next;
    });
  }, []);

  // All permissioned nav items
  const allItems = useMemo(
    () =>
      navigation?.filter(
        (item) => item.type === "item" && item.url && item.hasPermission !== false,
      ) ?? [],
    [navigation],
  );

  // Pinned items resolved from IDs
  const pinnedItems = useMemo(
    () => pinnedIds.map((id) => allItems.find((item) => item.id === id)).filter(Boolean),
    [pinnedIds, allItems],
  );

  // Search results
  const searchResults = useMemo(() => {
    if (!searchText.trim()) return [];
    return allItems.filter((item) => item.title?.toLowerCase().includes(searchText.toLowerCase()));
  }, [searchText, allItems]);

  // Items to show in popover when not searching
  const defaultItems = useMemo(() => {
    return pinnedItems.length > 0 ? pinnedItems : allItems.slice(0, 8);
  }, [pinnedItems, allItems]);

  const itemsToShow = searchText.trim() ? searchResults : defaultItems;

  return (
    <div className="flex items-center gap-0.5">
      {/* Pinned shortcut icon links */}
      {pinnedItems.map((item) => {
        if (!item) return null;
        const Icon = getNavIcon(item.icon as string);
        return (
          <Link
            key={item.id}
            href={item.url ?? "#"}
            title={item.title}
            className="flex cursor-pointer size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            {Icon ? (
              <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
            ) : (
              <span className="text-xs font-semibold uppercase">{item.title?.[0]}</span>
            )}
          </Link>
        );
      })}

      {/* Star button opens popover */}
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            title="Click to add/remove shortcut"
            className="flex cursor-pointer size-9 items-center justify-center rounded-lg transition-colors hover:bg-accent"
          >
            <Star className="h-[18px] w-[18px] fill-amber-400 text-amber-400" strokeWidth={1.8} />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-0">
          {/* Search input */}
          <div className="border-b border-border px-3 py-2">
            <input
              ref={searchInputRef}
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search for an app or page"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          {/* Items list */}
          <PerfectScroll className="max-h-64 py-1">
            {itemsToShow.length === 0 && searchText.trim() && (
              <p className="px-3 py-2 text-sm text-muted-foreground">No results..</p>
            )}
            {itemsToShow.map((item) => {
              if (!item) return null;
              const Icon = getNavIcon(item.icon as string);
              const isPinned = pinnedIds.includes(item.id);
              return (
                <Link
                  key={item.id}
                  href={item.url ?? "#"}
                  onClick={() => setPopoverOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-accent"
                >
                  <span className="flex size-6 shrink-0 items-center justify-center text-muted-foreground">
                    {Icon ? (
                      <Icon className="size-4" strokeWidth={1.8} />
                    ) : (
                      <span className="text-xs font-semibold uppercase">{item.title?.[0]}</span>
                    )}
                  </span>
                  <span className="flex-1 truncate">{item.title}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      togglePin(item.id);
                    }}
                    className="flex cursor-pointer size-6 shrink-0 items-center justify-center rounded transition-colors hover:bg-accent"
                  >
                    <Star
                      className={cn(
                        "size-4",
                        isPinned ? "fill-amber-400 text-amber-400" : "text-muted-foreground",
                      )}
                      strokeWidth={1.8}
                    />
                  </button>
                </Link>
              );
            })}
          </PerfectScroll>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// ─── AdminToolbar ─────────────────────────────────────────────────────────────

/**
 * AdminToolbar — sticky top toolbar.
 * Left: sidebar toggle + navigation shortcuts (pure Tailwind)
 * Right: language, font size, fullscreen, theme, search
 */
function AdminToolbar() {
  const { toggle } = useAdminSidebar();

  return (
    <header className="sticky top-0 z-header flex h-12 items-center bg-background px-2 md:h-16 md:px-4">
      {/* Left section */}
      <div className="flex flex-1 items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          className="flex cursor-pointer size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          title="Toggle sidebar"
        >
          <PanelLeft className="h-[18px] w-[18px]" strokeWidth={1.8} />
        </button>

        <div className="hidden lg:block h-6 w-px bg-border" />

        {/* Navigation shortcuts */}
        <div className="hidden lg:flex">
          <ToolbarShortcuts />
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-0.5">
        <LanguageSwitcherInline />
        <AdjustFontSizeButton />
        <FullScreenToggleButton />
        <ThemeToggleButton />
        <SearchButton />
      </div>
    </header>
  );
}

export default memo(AdminToolbar);
