/**
 * Helper to check if development diagnostics bypass is enabled.
 * Default is `true` in non-production environments (`NODE_ENV !== "production"`).
 * Can be explicitly disabled by setting `ENABLE_DIAGNOSTICS_DEV_BYPASS=false` or `0`.
 */
export function isDevDiagnosticsBypassEnabled(): boolean {
  if (process.env.NODE_ENV === "production") {
    return false;
  }
  const flag = process.env.ENABLE_DIAGNOSTICS_DEV_BYPASS;
  if (flag === "false" || flag === "0") {
    return false;
  }
  return true;
}
