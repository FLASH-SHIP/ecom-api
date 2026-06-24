import { type ExecutionContext, RequestTimeoutException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { of, throwError } from "rxjs";
import { delay } from "rxjs/operators";
import { describe, expect, it, vi } from "vitest";
import { SetTimeout, TIMEOUT_KEY } from "../common/decorators/timeout.decorator";
import { TimeoutInterceptor } from "../common/interceptors/timeout.interceptor";

describe("TimeoutInterceptor & SetTimeout Decorator", () => {
  it("should define the SetTimeout decorator and set metadata", () => {
    class TestController {
      @SetTimeout(5000)
      testMethod() {}
    }

    const controller = new TestController();
    const metadata = Reflect.getMetadata(TIMEOUT_KEY, controller.testMethod);
    expect(metadata).toBe(5000);
  });

  it("should use default timeout when no metadata is present", async () => {
    const reflector = new Reflector();
    vi.spyOn(reflector, "getAllAndOverride").mockReturnValue(undefined);

    const mockConfigService = {
      get: vi.fn().mockReturnValue(10000),
    } as unknown as ConfigService;

    const interceptor = new TimeoutInterceptor(reflector, mockConfigService);

    const mockHandler = {
      handle: () => of("ok"),
    };

    const mockContext = {
      getHandler: () => {},
      getClass: () => {},
    } as unknown as ExecutionContext;

    const result = await interceptor.intercept(mockContext, mockHandler).toPromise();
    expect(result).toBe("ok");
    expect(mockConfigService.get).toHaveBeenCalledWith("API_TIMEOUT_MS");
  });

  it("should throw RequestTimeoutException when request exceeds resolved timeout", async () => {
    const reflector = new Reflector();
    vi.spyOn(reflector, "getAllAndOverride").mockReturnValue(10); // 10ms timeout

    const mockConfigService = {
      get: vi.fn().mockReturnValue(10000),
    } as unknown as ConfigService;

    const interceptor = new TimeoutInterceptor(reflector, mockConfigService);

    const mockHandler = {
      handle: () => of("slow-response").pipe(delay(50)), // takes 50ms
    };

    const mockContext = {
      getHandler: () => {},
      getClass: () => {},
    } as unknown as ExecutionContext;

    const observable = interceptor.intercept(mockContext, mockHandler);
    await expect(observable.toPromise()).rejects.toThrow(RequestTimeoutException);
  });

  it("should propagate original error if request fails within timeout limit", async () => {
    const reflector = new Reflector();
    vi.spyOn(reflector, "getAllAndOverride").mockReturnValue(100);

    const mockConfigService = {
      get: vi.fn().mockReturnValue(10000),
    } as unknown as ConfigService;

    const interceptor = new TimeoutInterceptor(reflector, mockConfigService);

    const mockHandler = {
      handle: () => throwError(() => new Error("Something went wrong")),
    };

    const mockContext = {
      getHandler: () => {},
      getClass: () => {},
    } as unknown as ExecutionContext;

    const observable = interceptor.intercept(mockContext, mockHandler);
    await expect(observable.toPromise()).rejects.toThrow("Something went wrong");
  });
});
