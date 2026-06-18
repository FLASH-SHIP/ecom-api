import React from "react";
import { AppDialog, type AppDialogProps } from "../../AppDialog";
import { AppDialogContext, AppDialogDefaultContext } from "./AppDialogContext";

interface AppDialogContextProviderProps {
  children: React.ReactNode;
}

export function AppDialogContextProvider(props: AppDialogContextProviderProps) {
  const { children } = props;
  const [dialogs, setDialogs] = React.useState(AppDialogDefaultContext.dialogs);

  function openDialog(dialogProps: AppDialogProps) {
    setDialogs((prev) => ({
      ...prev,
      [dialogProps.id]: { ...dialogProps, open: true },
    }));
  }

  function closeDialog(id: AppDialogProps["id"]) {
    setDialogs((prev) => {
      const newDialogs = { ...prev };
      delete newDialogs[id];

      return newDialogs;
    });
  }

  return (
    <AppDialogContext.Provider value={{ dialogs, openDialog, closeDialog }}>
      {children}
      {Object.entries(dialogs).map(([id, dialog]) => (
        <AppDialog {...dialog} key={id} onClose={closeDialog} />
      ))}
    </AppDialogContext.Provider>
  );
}
