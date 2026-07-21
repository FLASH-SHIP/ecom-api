"use client";

import { translate } from "@ecom/i18n";
import { type LanguageType, useI18n } from "@ecom/shared/@i18n";
import { Button } from "@ecom/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@ecom/ui/components/dropdown-menu";
import { CirclePlusIcon } from "@ecom/ui/components/icon-component/CirclePlusIcon";
import { CloseIcon } from "@ecom/ui/components/icon-component/CloseIcon";
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
  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;

  return (
    <NextLink
      href={item.href}
      className={cn(
        "group flex items-center rounded-lg transition-all duration-300 cursor-pointer overflow-hidden whitespace-nowrap",
        isCollapsed
          ? "px-0 py-2.5 justify-center h-10 w-10 mx-auto"
          : "px-4 py-3 text-sm font-medium gap-3 w-full h-11",
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
      <span
        className={cn(
          "truncate transition-all duration-300 ease-in-out",
          isCollapsed ? "w-0 opacity-0 invisible" : "w-auto opacity-100 visible",
        )}
      >
        {item.label}
      </span>
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
        "border-t border-[#DADADA] dark:border-zinc-800 p-4 flex items-center justify-center gap-3 text-sm transition-all duration-300",
        isCollapsed && "p-3",
      )}
    >
      <span
        className={cn(
          "text-muted-foreground font-medium transition-all duration-300 ease-in-out truncate",
          isCollapsed ? "w-0 opacity-0 invisible mr-0" : "mr-auto w-auto opacity-100 visible",
        )}
      >
        {translate("customerDashboard.sidebar.language", currentLocale)}
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            type="button"
            className={cn(
              "flex items-center rounded-[10px] border border-border bg-card text-xs font-semibold text-foreground hover:bg-accent shadow-[0_1px_2px_rgba(0,0,0,0.1)] focus:outline-none cursor-pointer transition-all duration-300 h-auto",
              isCollapsed ? "p-2 justify-center" : "gap-1.5 px-3 py-1.5",
            )}
            title={
              isCollapsed
                ? translate("customerDashboard.sidebar.changeLanguage", currentLocale)
                : undefined
            }
          >
            <span className="uppercase">{language?.id === "en" ? "ENG" : language?.id}</span>
            <ChevronDown
              className={cn(
                "size-3.5 text-muted-foreground transition-all duration-300",
                isCollapsed ? "w-0 opacity-0 scale-0 ml-0" : "w-3.5 opacity-100 scale-100 ml-1.5",
              )}
            />
          </Button>
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

export function CustomerSidebar({
  isCollapsed = false,
  isDrawer = false,
  onClose,
}: {
  isCollapsed?: boolean;
  isDrawer?: boolean;
  onClose?: () => void;
}) {
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
          href: "/developer",
          icon: ServerCogIcon,
        },
      ],
    },
  ];

  if (isDrawer) {
    return (
      <div className="flex h-full w-full flex-col overflow-hidden bg-[var(--sidebar-bg)] text-foreground">
        {/* Header (chứa icon close ở bên phải) */}
        <div className="flex items-center justify-end px-6 py-4 border-b border-[#DADADA] dark:border-zinc-800 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            type="button"
            onClick={onClose}
            className="cursor-pointer h-8 w-8 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            <CloseIcon className="size-5" />
          </Button>
        </div>

        {/* Content ở giữa chứa Menu */}
        <div className="flex-1 px-4 py-6 flex flex-col gap-6 overflow-y-auto">
          {menuGroups.map((group) => (
            <div key={group.title} className="flex flex-col gap-2">
              <span className="px-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                {group.title}
              </span>
              <nav className="flex flex-col gap-1">
                {group.items.map((item) => (
                  <SidebarNavItem
                    key={item.href}
                    item={item}
                    pathname={pathname}
                    isCollapsed={false}
                  />
                ))}
              </nav>
            </div>
          ))}
        </div>

        {/* Footer (Chứa button đa ngôn ngữ) */}
        <div className="shrink-0">
          <LanguageSelector
            isCollapsed={false}
            currentLocale={currentLocale}
            language={language}
            languages={languages}
            changeLanguage={changeLanguage}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[var(--sidebar-bg)] text-foreground">
      {/* Navigation list */}
      <div className="flex-1 px-4 py-6 flex flex-col gap-6 overflow-y-auto">
        {menuGroups.map((group, index) => (
          <div key={group.title} className="flex flex-col gap-2">
            {/* Group Title */}
            <span
              className={cn(
                "px-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase transition-all duration-300 ease-in-out overflow-hidden block whitespace-nowrap",
                isCollapsed
                  ? "h-0 opacity-0 scale-95 pointer-events-none"
                  : "h-4 opacity-100 scale-100",
              )}
            >
              {group.title}
            </span>
            {/* Separator line when collapsed */}
            {index > 0 && (
              <div
                className={cn(
                  "h-px bg-border/60 transition-all duration-300 ease-in-out mx-1",
                  isCollapsed ? "my-2 opacity-100" : "h-0 my-0 opacity-0 overflow-hidden",
                )}
              />
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
