/**
 * Next.js Instrumentation — runs once when the server starts.
 *
 * Registers graceful shutdown handlers for clean DB/Redis disconnection.
 * See: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { gracefulShutdown } = await import("@ecom/features/shutdown/GracefulShutdown");
    const { disconnectRedis } = await import("@ecom/lib/redis");

    gracefulShutdown.register("Prisma", async () => {
      const { prisma } = await import("@ecom/prisma");
      await prisma.$disconnect();
    });

    gracefulShutdown.register("Redis", async () => {
      await disconnectRedis();
    });

    gracefulShutdown.enable();
  }
}
