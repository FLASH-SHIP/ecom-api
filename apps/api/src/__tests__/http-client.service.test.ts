import { loggerContext } from "@ecom/lib/logger";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HttpClientService } from "../common/http/http-client.service";

describe("HttpClientService", () => {
  let service: HttpClientService;

  beforeEach(() => {
    service = new HttpClientService();
    vi.restoreAllMocks();
  });

  it("should send GET request and return JSON response", async () => {
    const mockResponse = { data: "hello" };
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => mockResponse,
    } as unknown as Response);

    const result = await service.get<{ data: string }>("https://api.example.com/test");

    expect(fetchSpy).toHaveBeenCalledWith("https://api.example.com/test", expect.any(Object));
    expect(result).toEqual(mockResponse);
  });

  it("should propagate x-trace-id header from loggerContext", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ success: true }),
    } as unknown as Response);

    await loggerContext.run({ traceId: "my-custom-trace-id" }, async () => {
      await service.get("https://api.example.com/test");
    });

    expect(fetchSpy).toHaveBeenCalled();
    const call = fetchSpy.mock.calls[0];
    expect(call).toBeDefined();
    const headersArg = (call![1] as RequestInit).headers as Headers;
    expect(headersArg.get("x-trace-id")).toBe("my-custom-trace-id");
  });

  it("should stringify body and set content-type for POST request", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ success: true }),
    } as unknown as Response);

    await service.post("https://api.example.com/test", { key: "value" });

    expect(fetchSpy).toHaveBeenCalled();
    const call = fetchSpy.mock.calls[0];
    expect(call).toBeDefined();
    const options = call![1] as RequestInit;
    expect(options.method).toBe("POST");
    expect(options.body).toBe(JSON.stringify({ key: "value" }));
    const headers = options.headers as Headers;
    expect(headers.get("content-type")).toBe("application/json");
  });
});
