import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**"],
  },
  resolve: {
    alias: {
      "@flash-ship/ecom-lib": new URL("../../../ecom-shared-packages/packages/lib/src", import.meta.url).pathname,
    },
  },
});
