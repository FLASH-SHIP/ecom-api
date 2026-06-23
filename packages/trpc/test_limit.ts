import { initTRPC, TRPCError } from "@trpc/server";
import { dynamicRateLimit } from "./server/middleware/rateLimit";
import { appRouter } from "./server/routers/_app";

// Initialize a mock tRPC system to test dynamic rate limiter middleware isolation
const t = initTRPC.create();
const router = t.router;
const publicProcedure = t.procedure;

// Define a test dynamic limiter:
// - Premium users are bypassed (return null)
// - Guests are limited to 2 requests per 10 seconds by IP
const testDynamicLimiter = dynamicRateLimit((ctx: unknown) => {
  const typedCtx = ctx as { user?: { isPremium?: boolean }; ip?: string | null };
  if (typedCtx.user?.isPremium) return null;
  return {
    maxRequests: 2,
    windowSeconds: 10,
    key: typedCtx.ip ?? "unknown",
  };
}, "test-dynamic");

const testRouter = router({
  testEndpoint: publicProcedure.use(testDynamicLimiter).mutation(() => {
    return { success: true };
  }),
});

async function testStatic() {
  console.log("=== 1. Testing Backwards-Compatible Static Rate Limiting ===");
  const ctxStatic = {
    user: null,
    ip: "127.0.0.88", // Fresh IP for static limit test
    userAgent: "Mozilla/5.0",
    locale: "en",
  };
  const callerStatic = appRouter.createCaller(ctxStatic);

  for (let i = 1; i <= 12; i++) {
    try {
      await callerStatic.customer.auth.verifyEmail({ token: "test_token_xyz" });
    } catch (error: unknown) {
      if (error instanceof TRPCError) {
        console.log(`Call ${i}: [${error.code}] ${error.message}`);
      } else {
        console.log(`Call ${i} Failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
}

async function testDynamicGuest(callerGuest: ReturnType<typeof testRouter.createCaller>) {
  console.log("\n=== 2. Testing Dynamic Rate Limiting (Guest - Limited to 2) ===");
  for (let i = 1; i <= 4; i++) {
    try {
      const res = await callerGuest.testEndpoint();
      console.log(`Call ${i} (Guest): Success - ${JSON.stringify(res)}`);
    } catch (error: unknown) {
      if (error instanceof TRPCError) {
        console.log(`Call ${i} (Guest): [${error.code}] ${error.message}`);
      } else {
        console.log(
          `Call ${i} (Guest) Failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }
}

async function testDynamicPremium(callerPremium: ReturnType<typeof testRouter.createCaller>) {
  console.log("\n=== 3. Testing Dynamic Rate Limiting (Premium - Bypassed/Unlimited) ===");
  for (let i = 1; i <= 4; i++) {
    try {
      const res = await callerPremium.testEndpoint();
      console.log(`Call ${i} (Premium): Success - ${JSON.stringify(res)}`);
    } catch (error: unknown) {
      if (error instanceof TRPCError) {
        console.log(`Call ${i} (Premium): [${error.code}] ${error.message}`);
      } else {
        console.log(
          `Call ${i} (Premium) Failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }
}

async function run() {
  await testStatic();

  const ctxGuest = {
    user: null,
    ip: "127.0.0.77",
    userAgent: "Mozilla/5.0",
    locale: "en",
  };
  const callerGuest = testRouter.createCaller(ctxGuest);
  await testDynamicGuest(callerGuest);

  const ctxPremium = {
    user: { id: 1, isPremium: true },
    ip: "127.0.0.77", // Same IP address
    userAgent: "Mozilla/5.0",
    locale: "en",
  };
  const callerPremium = testRouter.createCaller(ctxPremium);
  await testDynamicPremium(callerPremium);
}

run().catch(console.error);
