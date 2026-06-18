"use client";

import { AppDialogContextProvider } from "@app/core/AppDialog/contexts/AppDialogContext/AppDialogContextProvider";
import { AppSettingsProvider } from "@app/core/AppSettings/AppSettingsProvider";
import ErrorBoundary from "@app/utils/ErrorBoundary";
import { NavbarContextProvider } from "@ecom/shared/components/theme-layouts/components/navbar/contexts/NavbarContext/NavbarContextProvider";
import { NavigationContextProvider } from "@ecom/shared/components/theme-layouts/components/navigation/contexts/NavigationContextProvider";
import { QuickPanelProvider } from "@ecom/shared/components/theme-layouts/components/quickPanel/contexts/QuickPanelContext/QuickPanelContextProvider";
import AppContext from "@ecom/shared/contexts/AppContext";
import MainThemeProvider from "@ecom/shared/contexts/MainThemeProvider";
import RootThemeProvider from "@ecom/shared/contexts/RootThemeProvider";
import { I18nProvider } from "@i18n/I18nProvider";
import { SnackbarProvider } from "notistack";

type AdminAppProps = {
  children?: React.ReactNode;
};

/**
 * AdminApp — client-side provider tree for Ecom Admin.
 *
 * Wraps all app providers: theme, i18n, settings, navigation, dialogs, snackbar.
 * This is the client boundary for the design system in Next.js App Router.
 */
function AdminApp({ children }: AdminAppProps) {
  const appContextValue = {};

  return (
    <ErrorBoundary>
      <AppContext value={appContextValue}>
        <AppSettingsProvider>
          <I18nProvider>
            <RootThemeProvider>
              <MainThemeProvider>
                <NavbarContextProvider>
                  <NavigationContextProvider>
                    <AppDialogContextProvider>
                      <SnackbarProvider
                        maxSnack={5}
                        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                        classes={{
                          containerRoot: "bottom-0 right-0 mb-13 md:mb-17 mr-2 lg:mr-20 z-99",
                        }}
                      >
                        <QuickPanelProvider>{children}</QuickPanelProvider>
                      </SnackbarProvider>
                    </AppDialogContextProvider>
                  </NavigationContextProvider>
                </NavbarContextProvider>
              </MainThemeProvider>
            </RootThemeProvider>
          </I18nProvider>
        </AppSettingsProvider>
      </AppContext>
    </ErrorBoundary>
  );
}

export default AdminApp;
