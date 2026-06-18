import { createContext } from "react";
import type { AppSettingsConfigType, AppThemesType } from "./AppSettings";

// AppSettingsContext type
export type AppSettingsContextType = {
  data: AppSettingsConfigType;
  setSettings: (newSettings: Partial<AppSettingsConfigType>) => AppSettingsConfigType;
  changeTheme: (newTheme: AppThemesType) => void;
};

// Context with a default value of undefined
const AppSettingsContext = createContext<AppSettingsContextType | undefined>(undefined);

export default AppSettingsContext;
