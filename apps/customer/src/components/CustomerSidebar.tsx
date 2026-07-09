"use client";

import { translate } from "@ecom/i18n";
import { type LanguageType, useI18n } from "@ecom/shared/@i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@ecom/ui/components/dropdown-menu";
import { CirclePlusIcon } from "@ecom/ui/components/icon-component/CirclePlusIcon";
import { FileInputIcon } from "@ecom/ui/components/icon-component/FileInputIcon";
import { LayoutDashboardIcon } from "@ecom/ui/components/icon-component/LayoutDashboardIcon";
import { NotepadTextIcon } from "@ecom/ui/components/icon-component/NotepadTextIcon";
import { PrinterIcon } from "@ecom/ui/components/icon-component/PrinterIcon";
import { ServerCogIcon } from "@ecom/ui/components/icon-component/ServerCogIcon";
import { cn } from "@ecom/ui/lib/utils";
import { ChevronDown } from "lucide-react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";

interface SidebarNavItemProps {
  item: {
    label: string;
    href: string;
    icon: ComponentType<{ className?: string }>;
  };
  pathname: string;
  isCollapsed: boolean;
}

function SidebarNavItem({ item, pathname, isCollapsed }: SidebarNavItemProps) {
  const isActive = pathname === item.href;
  const Icon = item.icon;

  return (
    <NextLink
      href={item.href}
      className={cn(
        "group flex items-center rounded-lg transition-all duration-150 cursor-pointer",
        isCollapsed ? "justify-center h-10 w-10 mx-auto" : "gap-3 px-4 py-3 text-sm font-medium",
        isActive
          ? "bg-[#0F798C]/12 text-[#0F798C] dark:bg-[#0F798C]/20 dark:text-cyan-400"
          : "text-[#7B7B7B] hover:bg-accent hover:text-foreground",
      )}
      title={isCollapsed ? item.label : undefined}
    >
      <Icon
        className={cn(
          "h-5 w-5 shrink-0 transition-colors",
          isActive
            ? "text-[#0F798C] dark:text-cyan-400"
            : "text-[#7B7B7B] group-hover:text-foreground",
        )}
      />
      {!isCollapsed && <span className="truncate">{item.label}</span>}
    </NextLink>
  );
}

interface LanguageSelectorProps {
  isCollapsed: boolean;
  currentLocale: string;
  language: LanguageType | undefined;
  languages: LanguageType[];
  changeLanguage: (id: string) => void;
}

function LanguageSelector({
  isCollapsed,
  currentLocale,
  language,
  languages,
  changeLanguage,
}: LanguageSelectorProps) {
  return (
    <div
      className={cn(
        "border-t border-[var(--sidebar-border)] p-4 flex items-center justify-between gap-3 text-sm",
        isCollapsed && "justify-center p-3",
      )}
    >
      {!isCollapsed && (
        <span className="text-muted-foreground font-medium">
          {translate("customerDashboard.sidebar.language", currentLocale)}
        </span>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex items-center rounded-[10px] border border-border bg-card text-xs font-semibold text-foreground hover:bg-accent shadow-[0_1px_2px_rgba(0,0,0,0.1)] focus:outline-none cursor-pointer",
              isCollapsed ? "p-2 justify-center" : "gap-1.5 px-3 py-1.5",
            )}
            title={
              isCollapsed
                ? translate("customerDashboard.sidebar.changeLanguage", currentLocale)
                : undefined
            }
          >
            <span className="uppercase">{language?.id === "en" ? "ENG" : language?.id}</span>
            {!isCollapsed && <ChevronDown className="size-3.5 text-muted-foreground" />}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align={isCollapsed ? "center" : "end"}
          side="top"
          className="w-40 z-[9999]"
        >
          {languages.map((lng) => {
            const isActive = lng.id === language?.id;
            return (
              <DropdownMenuItem
                key={lng.id}
                onClick={() => changeLanguage(lng.id)}
                className={cn(
                  "flex items-center gap-2 cursor-pointer text-xs",
                  isActive && "bg-accent font-semibold",
                )}
              >
                {/* biome-ignore lint/performance/noImgElement: static svg flag */}
                <img
                  className="h-4 w-4 shrink-0 object-cover rounded-full"
                  src={`/assets/images/flags/${lng.flag}.svg`}
                  alt={lng.title}
                />
                <span>{lng.title}</span>
                {isActive && <span className="ml-auto text-primary text-xs">✓</span>}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function CustomerSidebar({ isCollapsed = false }: { isCollapsed?: boolean }) {
  const pathname = usePathname();
  const { languageId: currentLocale, language, languages, changeLanguage } = useI18n();

  // Sidebar navigation menu groups
  const menuGroups = [
    {
      title: translate("customerDashboard.sidebar.general", currentLocale),
      items: [
        {
          label: translate("customerDashboard.sidebar.home", currentLocale),
          href: "/dashboard",
          icon: LayoutDashboardIcon,
        },
      ],
    },
    {
      title: translate("customerDashboard.sidebar.orderInformation", currentLocale),
      items: [
        {
          label: translate("customerDashboard.sidebar.orderList", currentLocale),
          href: "/orders",
          icon: NotepadTextIcon,
        },
        {
          label: translate("customerDashboard.sidebar.labelPrinting", currentLocale),
          href: "/label-printing",
          icon: PrinterIcon,
        },
      ],
    },
    {
      title: translate("customerDashboard.sidebar.inboundOrders", currentLocale),
      items: [
        {
          label: translate("customerDashboard.sidebar.singleOrder", currentLocale),
          href: "/orders/single",
          icon: CirclePlusIcon,
        },
        {
          label: translate("customerDashboard.sidebar.importOrder", currentLocale),
          href: "/orders/import",
          icon: FileInputIcon,
        },
        {
          label: translate("customerDashboard.sidebar.api", currentLocale),
          href: "/api-docs",
          icon: ServerCogIcon,
        },
      ],
    },
  ];

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[var(--sidebar-bg)] text-foreground">
      {/* Navigation list */}
      <div className="flex-1 px-4 py-6 flex flex-col gap-6 overflow-y-auto">
        {menuGroups.map((group, index) => (
          <div key={group.title} className="flex flex-col gap-2">
            {/* Group Title or Separator */}
            {!isCollapsed ? (
              <span className="px-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                {group.title}
              </span>
            ) : (
              index > 0 && <div className="h-px bg-border/60 my-2 mx-1" />
            )}

            {/* Group Items */}
            <nav className="flex flex-col gap-1">
              {group.items.map((item) => (
                <SidebarNavItem
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  isCollapsed={isCollapsed}
                />
              ))}
            </nav>
          </div>
        ))}
      </div>

      {/* Bottom Language Selector */}
      <LanguageSelector
        isCollapsed={isCollapsed}
        currentLocale={currentLocale}
        language={language}
        languages={languages}
        changeLanguage={changeLanguage}
      />
    </div>
  );
}
