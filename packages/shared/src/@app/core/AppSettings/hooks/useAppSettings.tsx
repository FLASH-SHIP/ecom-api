import { useContext } from "react";
import AppSettingsContext, { type AppSettingsContextType } from "../AppSettingsContext";

const useAppSettings = (): AppSettingsContextType => {
  const context = useContext(AppSettingsContext);

  if (!context) {
    throw new Error("useSettings must be used within a AppSettingsProvider");
  }

  return context;
};

export default useAppSettings;
