/**
 * Next.js Instrumentation — runs once when the server starts.
 *
 * Validates environment variables on startup.
 * See: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Validate environment variables on startup
    await import("./env");
  }
}
