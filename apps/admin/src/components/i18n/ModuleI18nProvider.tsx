import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

interface ModuleI18nProviderProps {
  namespaces: string[];
  children: React.ReactNode;
}

export default async function ModuleI18nProvider({
  namespaces,
  children,
}: ModuleI18nProviderProps) {
  const allMessages = await getMessages();

  // Always include shared layout namespaces to prevent UI layout keys from failing
  const requiredNamespaces = Array.from(
    new Set([...namespaces, "common", "auth", "nav", "errors", "dataTable"]),
  );

  // Pick only the requested namespaces
  const scopedMessages: Record<string, unknown> = {};
  for (const ns of requiredNamespaces) {
    if (allMessages && ns in allMessages) {
      scopedMessages[ns] = allMessages[ns];
    }
  }

  return <NextIntlClientProvider messages={scopedMessages}>{children}</NextIntlClientProvider>;
}
