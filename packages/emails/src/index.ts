import type { Transporter } from "nodemailer";
import nodemailer from "nodemailer";

/**
 * Email payload interface — all templates produce this shape.
 */
export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// ─── SMTP Transport ──────────────────────────────────────────

let _transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? "localhost",
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASS
          ? {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            }
          : undefined,
    });
  }
  return _transporter;
}

/**
 * Send an email via SMTP.
 * Logs errors but does not throw — email failures should not block business logic.
 */
export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  try {
    const from = process.env.MAIL_FROM ?? "noreply@ecom.com";
    await getTransporter().sendMail({
      from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    });
    return true;
  } catch (err) {
    console.error("[EmailService] Failed to send email:", err);
    return false;
  }
}

// ─── Email Template Data Types ───────────────────────────────

export interface PasswordResetEmailData {
  name: string;
  resetUrl: string;
}

export interface WelcomeEmailData {
  name: string;
  loginUrl: string;
}

export interface ContactReplyEmailData {
  contactName: string;
  originalMessage: string;
  replyMessage: string;
}

export interface CommentNotificationData {
  postTitle: string;
  commentAuthor: string;
  commentContent: string;
  moderationUrl: string;
}

export interface MemberWelcomeEmailData {
  memberName: string;
  loginUrl: string;
}

export interface EmailVerificationData {
  name: string;
  verifyUrl: string;
}

export interface CustomerPasswordResetData {
  name: string;
  resetUrl: string;
}

export interface CustomerWelcomeEmailData {
  customerName: string;
  loginUrl: string;
}

// ─── Email Template Builders ─────────────────────────────────

const BRAND = "Ecom";
const FOOTER = `<p style="color:#94a3b8;font-size:12px;margin-top:32px;">— ${BRAND}</p>`;

function wrap(body: string): string {
  return `
    <div style="font-family:'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:32px;color:#1e293b;">
      ${body}
      ${FOOTER}
    </div>
  `;
}

export function buildPasswordResetEmail(data: PasswordResetEmailData): EmailPayload {
  return {
    to: "",
    subject: `Đặt lại mật khẩu — ${BRAND}`,
    html: wrap(`
      <h2 style="color:#1e293b;">Xin chào ${data.name},</h2>
      <p>Bạn đã yêu cầu đặt lại mật khẩu. Nhấn vào nút bên dưới:</p>
      <a href="${data.resetUrl}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Đặt lại mật khẩu</a>
      <p style="margin-top:16px;color:#64748b;">Link này sẽ hết hạn sau 1 giờ. Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
    `),
    text: `Đặt lại mật khẩu: ${data.resetUrl}`,
  };
}

export function buildWelcomeEmail(data: WelcomeEmailData): EmailPayload {
  return {
    to: "",
    subject: `Chào mừng đến ${BRAND}`,
    html: wrap(`
      <h2 style="color:#1e293b;">Chào mừng ${data.name}!</h2>
      <p>Tài khoản của bạn đã được tạo thành công.</p>
      <a href="${data.loginUrl}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Đăng nhập ngay</a>
    `),
    text: `Chào mừng ${data.name}! Đăng nhập: ${data.loginUrl}`,
  };
}

export function buildContactReplyEmail(data: ContactReplyEmailData): EmailPayload {
  return {
    to: "",
    subject: `Phản hồi từ ${BRAND}`,
    html: wrap(`
      <h2 style="color:#1e293b;">Xin chào ${data.contactName},</h2>
      <p>Cảm ơn bạn đã liên hệ với chúng tôi. Dưới đây là phản hồi:</p>
      <div style="padding:16px;background:#f1f5f9;border-radius:8px;margin:16px 0;">
        <p style="color:#64748b;font-size:13px;margin-bottom:8px;">Tin nhắn của bạn:</p>
        <p style="color:#475569;">${data.originalMessage}</p>
      </div>
      <div style="padding:16px;background:#eff6ff;border-radius:8px;border-left:4px solid #2563eb;">
        <p style="color:#1e40af;">${data.replyMessage}</p>
      </div>
    `),
    text: `Phản hồi: ${data.replyMessage}`,
  };
}

export function buildCommentNotificationEmail(data: CommentNotificationData): EmailPayload {
  return {
    to: "",
    subject: `Bình luận mới trên "${data.postTitle}" — ${BRAND}`,
    html: wrap(`
      <h2 style="color:#1e293b;">Bình luận mới cần duyệt</h2>
      <p><strong>${data.commentAuthor}</strong> đã bình luận trên bài viết <strong>"${data.postTitle}"</strong>:</p>
      <div style="padding:16px;background:#f1f5f9;border-radius:8px;margin:16px 0;">
        <p style="color:#475569;">${data.commentContent}</p>
      </div>
      <a href="${data.moderationUrl}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Duyệt bình luận</a>
    `),
    text: `Bình luận mới từ ${data.commentAuthor}: ${data.commentContent}`,
  };
}

/** @deprecated Use buildCustomerWelcomeEmail instead */
export function buildMemberWelcomeEmail(data: MemberWelcomeEmailData): EmailPayload {
  return buildCustomerWelcomeEmail({ customerName: data.memberName, loginUrl: data.loginUrl });
}

export function buildCustomerWelcomeEmail(data: CustomerWelcomeEmailData): EmailPayload {
  return {
    to: "",
    subject: `Chào mừng khách hàng mới — ${BRAND}`,
    html: wrap(`
      <h2 style="color:#1e293b;">Chào mừng ${data.customerName}!</h2>
      <p>Tài khoản của bạn đã được đăng ký thành công.</p>
      <a href="${data.loginUrl}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Đăng nhập</a>
    `),
    text: `Chào mừng ${data.customerName}! Đăng nhập: ${data.loginUrl}`,
  };
}

export function buildEmailVerificationEmail(data: EmailVerificationData): EmailPayload {
  return {
    to: "",
    subject: `Xác minh email — ${BRAND}`,
    html: wrap(`
      <h2 style="color:#1e293b;">Xin chào ${data.name},</h2>
      <p>Vui lòng xác minh địa chỉ email của bạn bằng cách nhấn vào nút bên dưới:</p>
      <a href="${data.verifyUrl}" style="display:inline-block;padding:12px 24px;background:#16a34a;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Xác minh email</a>
      <p style="margin-top:16px;color:#64748b;">Link này sẽ hết hạn sau 24 giờ.</p>
    `),
    text: `Xác minh email: ${data.verifyUrl}`,
  };
}

export function buildCustomerPasswordResetEmail(data: CustomerPasswordResetData): EmailPayload {
  return {
    to: "",
    subject: `Đặt lại mật khẩu tài khoản — ${BRAND}`,
    html: wrap(`
      <h2 style="color:#1e293b;">Xin chào ${data.name},</h2>
      <p>Bạn đã yêu cầu đặt lại mật khẩu tài khoản khách hàng. Nhấn vào nút bên dưới:</p>
      <a href="${data.resetUrl}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Đặt lại mật khẩu</a>
      <p style="margin-top:16px;color:#64748b;">Link này sẽ hết hạn sau 1 giờ. Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
    `),
    text: `Đặt lại mật khẩu: ${data.resetUrl}`,
  };
}
