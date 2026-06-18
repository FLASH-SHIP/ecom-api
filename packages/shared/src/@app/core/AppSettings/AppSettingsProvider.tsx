import _ from "lodash";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import type { PartialDeep } from "type-fest";
import useUser from "../../../@auth/useUser";
import themeLayoutConfigs from "../../../components/theme-layouts/themeLayoutConfigs";
import settingsConfig from "../../../configs/settingsConfig";
import { defaultSettings, getParsedQuerySettings } from "../../default-settings";
import type { AppSettingsConfigType, AppThemesType } from "./AppSettings";
import AppSettingsContext from "./AppSettingsContext";

// Get initial settings
const getInitialSettings = (): AppSettingsConfigType => {
  const defaultLayoutStyle = settingsConfig.layout?.style || "layout1";
  const layout = {
    style: defaultLayoutStyle,
    config: themeLayoutConfigs[defaultLayoutStyle]?.defaults,
  };
  return _.merge({}, defaultSettings, { layout }, settingsConfig, getParsedQuerySettings());
};

const initialSettings = getInitialSettings();

const generateSettings = (
  _defaultSettings: AppSettingsConfigType,
  _newSettings: PartialDeep<AppSettingsConfigType>,
) => {
  return _.merge(
    {},
    _defaultSettings,
    { layout: { config: themeLayoutConfigs[_newSettings?.layout?.style]?.defaults } },
    _newSettings,
  );
};

// AppSettingsProvider component
export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const { data: user, isGuest } = useUser();

  const userSettings = useMemo(() => user?.settings || {}, [user]);

  const calculateSettings = useCallback(() => {
    const defaultSettings = _.merge({}, initialSettings);
    return isGuest ? defaultSettings : _.merge({}, defaultSettings, userSettings);
  }, [isGuest, userSettings]);

  const [data, setData] = useState<AppSettingsConfigType>(calculateSettings());

  // Sync data with userSettings when isGuest or userSettings change
  useEffect(() => {
    const newSettings = calculateSettings();

    // Only update if settings are different
    if (!_.isEqual(data, newSettings)) {
      setData(newSettings);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calculateSettings]);

  const setSettings = useCallback(
    (newSettings: Partial<AppSettingsConfigType>) => {
      const _settings = generateSettings(data, newSettings);

      if (!_.isEqual(_settings, data)) {
        setData(_.merge({}, _settings));
      }

      return _settings;
    },
    [data],
  );

  const changeTheme = useCallback(
    (newTheme: AppThemesType) => {
      const { navbar, footer, toolbar, main } = newTheme;

      const newSettings: AppSettingsConfigType = {
        ...data,
        theme: {
          main,
          navbar,
          toolbar,
          footer,
        },
      };

      setSettings(newSettings);
    },
    [data, setSettings],
  );

  return (
    <AppSettingsContext
      value={useMemo(
        () => ({
          data,
          setSettings,
          changeTheme,
        }),
        [data, setSettings, changeTheme],
      )}
    >
      {children}
    </AppSettingsContext>
  );
}

export default AppSettingsProvider;
