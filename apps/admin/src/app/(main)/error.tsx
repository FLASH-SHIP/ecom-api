"use client";

import Error500Page from "@admin/components/errors/Error500Page";
import { useEffect } from "react";

export default function AdminError({
  error: pageError,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[AdminApp] Page Error:", pageError);
  }, [pageError]);

  return <Error500Page reset={reset} />;
}
