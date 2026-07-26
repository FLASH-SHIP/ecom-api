/**
 * Helper to check if development diagnostics bypass is enabled.
 * Default is `true` unless `ALLOW_DEV_DIAGNOSTICS` is explicitly set to `"0"` or `"false"`.
 */
export function isDevDiagnosticsBypassEnabled(): boolean {
  const flag = process.env.ALLOW_DEV_DIAGNOSTICS;
  if (flag === "0" || flag === "false") {
    return false;
  }
  return true;
}
