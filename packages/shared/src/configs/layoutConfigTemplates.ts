import type { DeepPartial } from "react-hook-form";
import type { AppSettingsConfigType } from "../@app/core/AppSettings/AppSettings";

export const layoutConfigOnlyMain: DeepPartial<AppSettingsConfigType>["layout"] = {
  config: {
    navbar: {
      display: false,
    },
    toolbar: {
      display: false,
    },
    footer: {
      display: false,
    },
    leftSidePanel: {
      display: false,
    },
    rightSidePanel: {
      display: false,
    },
  },
};

export const layoutConfigOnlyMainFullWidth: DeepPartial<AppSettingsConfigType>["layout"] = {
  config: {
    ...layoutConfigOnlyMain.config,
    mode: "fullwidth",
  },
};

export const layoutNoContainer: DeepPartial<AppSettingsConfigType>["layout"] = {
  config: {
    mode: "fullwidth",
  },
};
