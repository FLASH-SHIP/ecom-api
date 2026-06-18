import { useContext } from "react";
import { AppDialogContext } from "./AppDialogContext";

// App Dialog hook to access the context
export function useAppDialogContext() {
  const context = useContext(AppDialogContext);

  if (context === null) {
    throw new Error("useAppDialogContext must be used within a AppProvider");
  }

  return context;
}
