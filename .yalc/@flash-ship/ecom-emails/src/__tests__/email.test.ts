import { describe, expect, it, vi } from "vitest";

// Mock nodemailer before imports
vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: vi.fn().mockResolvedValue({ messageId: "test-id" }),
    })),
  },
}));

describe("EmailService", () => {
  it("should build password reset email", async () => {
    const { buildPasswordResetEmail } = await import("@flash-ship/ecom-emails");
    const email = buildPasswordResetEmail({
      name: "John",
      resetUrl: "https://example.com/reset/abc123",
    });
    expect(email.subject).toContain("mật khẩu");
    expect(email.html).toContain("John");
    expect(email.html).toContain("https://example.com/reset/abc123");
    expect(email.text).toContain("https://example.com/reset/abc123");
  });

  it("should build welcome email", async () => {
    const { buildWelcomeEmail } = await import("@flash-ship/ecom-emails");
    const email = buildWelcomeEmail({
      name: "Alice",
      loginUrl: "https://example.com/login",
    });
    expect(email.subject).toContain("Chào mừng");
    expect(email.html).toContain("Alice");
  });

  it("should build contact reply email", async () => {
    const { buildContactReplyEmail } = await import("@flash-ship/ecom-emails");
    const email = buildContactReplyEmail({
      contactName: "Bob",
      originalMessage: "Hello, I need help",
      replyMessage: "We will help you soon",
    });
    expect(email.subject).toContain("Phản hồi");
    expect(email.html).toContain("Bob");
    expect(email.html).toContain("Hello, I need help");
    expect(email.html).toContain("We will help you soon");
  });

  it("should build comment notification email", async () => {
    const { buildCommentNotificationEmail } = await import("@flash-ship/ecom-emails");
    const email = buildCommentNotificationEmail({
      postTitle: "My Post",
      commentAuthor: "Charlie",
      commentContent: "Great article!",
      moderationUrl: "https://admin.example.com/comments",
    });
    expect(email.subject).toContain("My Post");
    expect(email.html).toContain("Charlie");
    expect(email.html).toContain("Great article!");
  });

  it("should build member welcome email", async () => {
    const { buildMemberWelcomeEmail } = await import("@flash-ship/ecom-emails");
    const email = buildMemberWelcomeEmail({
      memberName: "Dave",
      loginUrl: "https://example.com/login",
    });
    expect(email.subject).toContain("khách hàng mới");
    expect(email.html).toContain("Dave");
  });

  it("should send email via SMTP transport", async () => {
    process.env.EMAIL_PROVIDER_PRIMARY = "smtp";
    const { sendEmail } = await import("@flash-ship/ecom-emails");
    const result = await sendEmail({
      to: "user@example.com",
      subject: "Test",
      html: "<p>Hello</p>",
    });
    expect(result).toBe(true);
  });

  it("should support Resend API via fetch", async () => {
    process.env.EMAIL_PROVIDER_PRIMARY = "resend";
    process.env.RESEND_API_KEY = "test_key";
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      text: async () => "ok",
    } as unknown as Response);

    const { sendEmail } = await import("@flash-ship/ecom-emails");
    const result = await sendEmail({
      to: "resend@example.com",
      subject: "Resend Test",
      html: "<p>Hello</p>",
    });

    expect(result).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test_key",
        }),
      }),
    );
    fetchMock.mockRestore();
  });

  it("should trigger failover to secondary provider when primary fails", async () => {
    process.env.EMAIL_PROVIDER_PRIMARY = "resend";
    process.env.EMAIL_PROVIDER_SECONDARY = "smtp";
    process.env.RESEND_API_KEY = "test_key";

    // Resend fails
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "Internal Error",
    } as unknown as Response);

    const { sendEmail } = await import("@flash-ship/ecom-emails");
    const result = await sendEmail({
      to: "failover@example.com",
      subject: "Failover Test",
      html: "<p>Hello</p>",
    });

    // Should return true because SMTP (mocked) succeeds
    expect(result).toBe(true);
    expect(fetchMock).toHaveBeenCalled();
    fetchMock.mockRestore();
  });
});
