"use client";

import { Button } from "@ecom/ui/components/button";
import { Card, CardContent } from "@ecom/ui/components/card";
import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

export default function AdminError({
  error: pageError,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("common");
  useEffect(() => {
    // Log to error monitoring (e.g. Sentry)
    console.error("[AdminApp] Page Error:", pageError);
  }, [pageError]);

  return (
    <div className="flex justify-center p-8">
      <Card className="w-full max-w-[500px] text-center">
        <CardContent className="flex flex-col gap-4 p-8">
          <h2 className="text-xl font-bold">{t("error")}</h2>

          <div className="flex items-start gap-3 rounded-md border border-destructive/30 bg-red-50 px-4 py-3 text-left text-sm text-destructive dark:bg-red-950">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            {pageError.message ?? t("unexpectedError")}
          </div>

          {pageError.digest && (
            <p className="text-xs text-muted-foreground">Error ID: {pageError.digest}</p>
          )}

          <Button onClick={reset}>{t("refresh")}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
