import type { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { ThrottlerModuleOptions, ThrottlerStorage } from "@nestjs/throttler";
import type { ThrottlerRequest } from "@nestjs/throttler/dist/throttler.guard.interface";
import { describe, expect, it, vi } from "vitest";
import { AuthContextThrottlerGuard } from "../common/guards/auth-context-throttler.guard";

interface TestableThrottlerGuard {
  getTracker(req: unknown): Promise<string>;
  handleRequest(props: unknown): Promise<boolean>;
}

describe("AuthContextThrottlerGuard", () => {
  it("should extract correct tracker key based on request authentication state", async () => {
    const mockStorage = {} as ThrottlerStorage;
    const guard = new AuthContextThrottlerGuard(
      { throttlers: [] } as unknown as ThrottlerModuleOptions,
      mockStorage,
      new Reflector(),
    );

    const testableGuard = guard as unknown as TestableThrottlerGuard;

    // 1. Anonymous request
    const anonymousReq = {
      headers: {},
      ip: "127.0.0.1",
    };
    const anonTracker = await testableGuard.getTracker(anonymousReq);
    expect(anonTracker).toBe("127.0.0.1");

    // 2. JWT Request
    const jwtReq = {
      headers: {
        authorization: "Bearer my-jwt-token-xyz",
      },
      ip: "127.0.0.1",
    };
    const jwtTracker = await testableGuard.getTracker(jwtReq);
    // SEC-07: tracker key is now hashed for stability (not raw token)
    expect(jwtTracker).toMatch(/^bearer:[a-f0-9]{16}$/);

    // 3. Proxy Request - cf-connecting-ip
    const cfReq = {
      headers: {
        "cf-connecting-ip": "203.0.113.195",
      },
      ip: "127.0.0.1",
    };
    const cfTracker = await testableGuard.getTracker(cfReq);
    expect(cfTracker).toBe("203.0.113.195");

    // 4. Proxy Request - x-forwarded-for (list)
    const xffReq = {
      headers: {
        "x-forwarded-for": "198.51.100.101, 192.168.1.1, 10.0.0.1",
      },
      ip: "127.0.0.1",
    };
    const xffTracker = await testableGuard.getTracker(xffReq);
    expect(xffTracker).toBe("198.51.100.101");

    // 5. Proxy Request - x-real-ip
    const realIpReq = {
      headers: {
        "x-real-ip": "198.51.100.202",
      },
      ip: "127.0.0.1",
    };
    const realIpTracker = await testableGuard.getTracker(realIpReq);
    expect(realIpTracker).toBe("198.51.100.202");
  });

  it("should scale limits dynamically based on actor authorization levels", async () => {
    const mockStorage = {} as ThrottlerStorage;
    const guard = new AuthContextThrottlerGuard(
      { throttlers: [] } as unknown as ThrottlerModuleOptions,
      mockStorage,
      new Reflector(),
    );

    const testableGuard = guard as unknown as TestableThrottlerGuard;

    // 1. Test anonymous limit modification
    const mockContextAnon = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {},
          ip: "192.168.1.1",
        }),
      }),
    } as unknown as ExecutionContext;

    const requestPropsAnon = {
      context: mockContextAnon,
      limit: 100,
      ttl: 60,
      throttler: {},
      blockDuration: 60,
      getTracker: vi.fn(),
      generateKey: vi.fn(),
    };

    let resolvedLimit = 0;
    vi.spyOn(
      Object.getPrototypeOf(AuthContextThrottlerGuard.prototype) as {
        handleRequest: (props: ThrottlerRequest) => Promise<boolean>;
      },
      "handleRequest",
    ).mockImplementation((props: ThrottlerRequest) => {
      resolvedLimit = props.limit;
      return Promise.resolve(true);
    });

    await testableGuard.handleRequest(requestPropsAnon);
    expect(resolvedLimit).toBe(60); // 60 requests limit for anonymous

    // 2. Test user limit modification
    const mockContextUser = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {
            authorization: "Bearer user-token-xyz",
          },
          ip: "192.168.1.1",
        }),
      }),
    } as unknown as ExecutionContext;

    const requestPropsUser = {
      context: mockContextUser,
      limit: 100,
      ttl: 60,
      throttler: {},
      blockDuration: 60,
      getTracker: vi.fn(),
      generateKey: vi.fn(),
    };

    await testableGuard.handleRequest(requestPropsUser);
    expect(resolvedLimit).toBe(300); // 300 requests limit for standard users

    // 3. Test API Key limit modification
    const mockContextApiKey = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {
            authorization: "Bearer ecom_api_key_12345",
          },
          ip: "192.168.1.1",
        }),
      }),
    } as unknown as ExecutionContext;

    const requestPropsApiKey = {
      context: mockContextApiKey,
      limit: 100,
      ttl: 60,
      throttler: {},
      blockDuration: 60,
      getTracker: vi.fn(),
      generateKey: vi.fn(),
    };

    await testableGuard.handleRequest(requestPropsApiKey);
    expect(resolvedLimit).toBe(1000); // 1000 requests limit for CI/automation keys
  });
});
