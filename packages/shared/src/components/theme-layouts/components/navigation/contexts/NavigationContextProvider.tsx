// Create the provider component
import { type ReactNode, useCallback, useState } from "react";
import type { PartialDeep } from "type-fest";
import NavItemModel from "../../../../../@app/core/navigation/models/NavItemModel";
import type {
  FlatNavItemType,
  NavItemType,
} from "../../../../../@app/core/navigation/types/NavItemType";
import navigationHelper from "../../../../../@app/utils/navigationHelper";
import navigationConfig from "../../../../../configs/navigationConfig";
import { NavigationContext } from "./NavigationContext";

export function NavigationContextProvider({ children }: { children: ReactNode }) {
  const [navigationItems, setNavigationItems] = useState<FlatNavItemType[]>(
    navigationHelper.flattenNavigation(navigationConfig),
  );

  const setNavigation = useCallback((items: NavItemType[]) => {
    setNavigationItems(navigationHelper.flattenNavigation(items));
  }, []);

  const appendNavigationItem = useCallback(
    (item: NavItemType, parentId?: string | null) => {
      const navigation = navigationHelper.unflattenNavigation(navigationItems);
      setNavigation(navigationHelper.appendNavItem(navigation, NavItemModel(item), parentId));
    },
    [navigationItems, setNavigation],
  );

  const prependNavigationItem = useCallback(
    (item: NavItemType, parentId?: string | null) => {
      const navigation = navigationHelper.unflattenNavigation(navigationItems);
      setNavigation(navigationHelper.prependNavItem(navigation, NavItemModel(item), parentId));
    },
    [navigationItems, setNavigation],
  );

  const updateNavigationItem = useCallback(
    (id: string, item: PartialDeep<NavItemType>) => {
      const navigation = navigationHelper.unflattenNavigation(navigationItems);
      setNavigation(navigationHelper.updateNavItem(navigation, id, item));
    },
    [navigationItems, setNavigation],
  );

  const removeNavigationItem = useCallback(
    (id: string) => {
      const navigation = navigationHelper.unflattenNavigation(navigationItems);
      setNavigation(navigationHelper.removeNavItem(navigation, id));
    },
    [navigationItems, setNavigation],
  );

  const resetNavigation = useCallback(() => {
    setNavigationItems(navigationHelper.flattenNavigation(navigationConfig));
  }, []);

  const getNavigationItemById = useCallback(
    (id: string) => navigationItems.find((item) => item.id === id),
    [navigationItems],
  );

  const value = {
    setNavigation,
    navigationItems,
    appendNavigationItem,
    prependNavigationItem,
    updateNavigationItem,
    removeNavigationItem,
    resetNavigation,
    getNavigationItemById,
  };

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}
