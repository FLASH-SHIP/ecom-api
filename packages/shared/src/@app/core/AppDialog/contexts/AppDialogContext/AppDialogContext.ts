"use client";

import React from "react";
import type { AppDialogProps } from "../../AppDialog";

export interface AppDialogContextType {
  dialogs: Record<string, AppDialogProps>;
  openDialog: (T: AppDialogProps) => void;
  closeDialog: (id: AppDialogProps["id"]) => void;
}

export const AppDialogDefaultContext: AppDialogContextType = {
  dialogs: {},
  openDialog: () => null,
  closeDialog: () => null,
};

// App Dialog context
export const AppDialogContext = React.createContext<AppDialogContextType>(AppDialogDefaultContext);
