import { useMemo } from "react";
import type { NavItemType } from "../../../../../@app/core/navigation/types/NavItemType";
import appUtils from "../../../../../@app/utils";
import navigationHelper from "../../../../../@app/utils/navigationHelper";
import useUser from "../../../../../@auth/useUser";
import useI18n from "../../../../../@i18n/useI18n";
import { useNavigationContext } from "../contexts/useNavigationContext";

function useNavigationItems() {
  const { navigationItems: navigationData } = useNavigationContext();

  const { data: user } = useUser();
  const userRole = user?.role;
  const { languageId } = useI18n();

  const data = useMemo(() => {
    const _navigation = navigationHelper.unflattenNavigation(navigationData);

    function setAdditionalData(data: NavItemType[]): NavItemType[] {
      return data?.map((item) => ({
        hasPermission: Boolean(appUtils.hasPermission(item?.auth, userRole)),
        ...item,
        ...(item?.children ? { children: setAdditionalData(item?.children) } : {}),
      }));
    }

    const translatedValues = setAdditionalData(_navigation);

    return translatedValues;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigationData, userRole, languageId]);

  const flattenData = useMemo(() => {
    return navigationHelper.flattenNavigation(data);
  }, [data]);

  return { data, flattenData };
}

export default useNavigationItems;
