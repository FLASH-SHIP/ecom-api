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
    const { buildPasswordResetEmail } = await import("@ecom/emails");
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
    const { buildWelcomeEmail } = await import("@ecom/emails");
    const email = buildWelcomeEmail({
      name: "Alice",
      loginUrl: "https://example.com/login",
    });
    expect(email.subject).toContain("Chào mừng");
    expect(email.html).toContain("Alice");
  });

  it("should build contact reply email", async () => {
    const { buildContactReplyEmail } = await import("@ecom/emails");
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
    const { buildCommentNotificationEmail } = await import("@ecom/emails");
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
    const { buildMemberWelcomeEmail } = await import("@ecom/emails");
    const email = buildMemberWelcomeEmail({
      memberName: "Dave",
      loginUrl: "https://example.com/login",
    });
    expect(email.subject).toContain("thành viên");
    expect(email.html).toContain("Dave");
  });

  it("should send email via SMTP transport", async () => {
    const { sendEmail } = await import("@ecom/emails");
    const result = await sendEmail({
      to: "user@example.com",
      subject: "Test",
      html: "<p>Hello</p>",
    });
    expect(result).toBe(true);
  });
});
