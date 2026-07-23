import { prisma } from "@ecom/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { JobQueue } from "../../JobQueue";
import { registerFallbackEmailWorker } from "../fallbackEmailWorker";

// Mock @ecom/emails
const mockSendEmail = vi.fn().mockResolvedValue(true);
vi.mock("@ecom/emails", () => ({
  sendEmail: (payload: unknown) => mockSendEmail(payload),
}));

// Mock prisma client
vi.mock("@ecom/prisma", () => ({
  prisma: {
    notification: {
      findUnique: vi.fn(),
    },
  },
}));

describe("FallbackEmailWorker", () => {
  let jobHandler: (payload: Record<string, unknown>) => Promise<void>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Spy on JobQueue.register to capture handler
    const registerSpy = vi.spyOn(JobQueue, "register");
    registerFallbackEmailWorker();

    // biome-ignore lint/suspicious/noExplicitAny: vitest type mapping helper
    jobHandler = registerSpy.mock.calls[0]?.[1] as any;
    expect(jobHandler).toBeDefined();
    registerSpy.mockRestore();
  });

  it("should send email if notification is not clicked", async () => {
    vi.mocked(prisma.notification.findUnique).mockResolvedValue({
      clickedAt: null,
    } as unknown as never);

    await jobHandler({
      notificationId: 123,
      to: "fallback@example.com",
      subject: "Test Subject",
      html: "<p>Hello</p>",
    });

    expect(prisma.notification.findUnique).toHaveBeenCalledWith({
      where: { id: 123 },
      select: { clickedAt: true },
    });
    expect(mockSendEmail).toHaveBeenCalledWith({
      to: "fallback@example.com",
      subject: "Test Subject",
      html: "<p>Hello</p>",
      text: undefined,
    });
  });

  it("should skip sending email if notification is already clicked", async () => {
    vi.mocked(prisma.notification.findUnique).mockResolvedValue({
      clickedAt: new Date(),
    } as unknown as never);

    await jobHandler({
      notificationId: 123,
      to: "fallback@example.com",
      subject: "Test Subject",
      html: "<p>Hello</p>",
    });

    expect(prisma.notification.findUnique).toHaveBeenCalledWith({
      where: { id: 123 },
      select: { clickedAt: true },
    });
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("should skip sending email if notification record no longer exists", async () => {
    vi.mocked(prisma.notification.findUnique).mockResolvedValue(null as unknown as never);

    await jobHandler({
      notificationId: 123,
      to: "fallback@example.com",
      subject: "Test Subject",
      html: "<p>Hello</p>",
    });

    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});
