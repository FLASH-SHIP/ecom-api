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

import crypto from "node:crypto";

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

async function sendSmtpEmail(payload: EmailPayload): Promise<boolean> {
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
    console.error("[EmailService] Failed to send email via SMTP:", err);
    return false;
  }
}

// ─── AWS SES Transport ────────────────────────────────────────

function calculateSesSmtpPassword(secretAccessKey: string): string {
  const date = "SendRawEmail";
  const signature = crypto.createHmac("sha256", secretAccessKey).update(date).digest();

  const version = Buffer.from([0x02]);
  const passwordBuffer = Buffer.concat([version, signature]);
  return passwordBuffer.toString("base64");
}

let _sesTransporter: Transporter | null = null;

function getSesTransporter(): Transporter {
  if (!_sesTransporter) {
    const accessKeyId = process.env.AWS_SES_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SES_SECRET_ACCESS_KEY;
    const region = process.env.AWS_SES_REGION ?? "ap-southeast-1";

    if (!accessKeyId || !secretAccessKey) {
      throw new Error(
        "AWS SES credentials (AWS_SES_ACCESS_KEY_ID, AWS_SES_SECRET_ACCESS_KEY) are required",
      );
    }

    const smtpPassword = calculateSesSmtpPassword(secretAccessKey);

    _sesTransporter = nodemailer.createTransport({
      host: `email-smtp.${region}.amazonaws.com`,
      port: 465,
      secure: true,
      auth: {
        user: accessKeyId,
        pass: smtpPassword,
      },
    });
  }
  return _sesTransporter;
}

async function sendSesEmail(payload: EmailPayload): Promise<boolean> {
  try {
    const from = process.env.MAIL_FROM ?? "noreply@ecom.com";
    await getSesTransporter().sendMail({
      from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    });
    return true;
  } catch (err) {
    console.error("[EmailService] Failed to send email via AWS SES:", err);
    return false;
  }
}

// ─── Resend REST Transport ────────────────────────────────────

async function sendResendEmail(payload: EmailPayload): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[EmailService] Resend API Key (RESEND_API_KEY) is missing");
    return false;
  }
  try {
    const from = process.env.MAIL_FROM ?? "noreply@ecom.com";
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error(`[EmailService] Resend API responded with error: ${res.status} ${errText}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[EmailService] Failed to send email via Resend:", err);
    return false;
  }
}

// ─── Circuit Breaker & Stateful Failover ──────────────────────

interface ProviderState {
  consecutiveFailures: number;
  lastFailureTime: number;
}

const providerStates: Record<string, ProviderState> = {
  smtp: { consecutiveFailures: 0, lastFailureTime: 0 },
  resend: { consecutiveFailures: 0, lastFailureTime: 0 },
  ses: { consecutiveFailures: 0, lastFailureTime: 0 },
};

const FAILURE_THRESHOLD = 5;
const COOLDOWN_MS = 300000; // 5 minutes

function getActiveProvider(): "smtp" | "resend" | "ses" {
  const primary = (process.env.EMAIL_PROVIDER_PRIMARY as "smtp" | "resend" | "ses") || "smtp";
  const secondary = (process.env.EMAIL_PROVIDER_SECONDARY as "smtp" | "resend" | "ses") || "resend";

  const primaryState = providerStates[primary];
  if (primaryState && primaryState.consecutiveFailures >= FAILURE_THRESHOLD) {
    const now = Date.now();
    if (now - primaryState.lastFailureTime > COOLDOWN_MS) {
      primaryState.consecutiveFailures = 0;
      return primary;
    }
    return secondary;
  }
  return primary;
}

async function dispatchWithProvider(
  provider: "smtp" | "resend" | "ses",
  payload: EmailPayload,
): Promise<boolean> {
  if (provider === "resend") return sendResendEmail(payload);
  if (provider === "ses") return sendSesEmail(payload);
  return sendSmtpEmail(payload);
}

/**
 * Send an email using primary/secondary config with circuit breaker and failover.
 */
export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  const activeProvider = getActiveProvider();
  let success = await dispatchWithProvider(activeProvider, payload);

  if (success) {
    const state = providerStates[activeProvider];
    if (state) state.consecutiveFailures = 0;
    return true;
  }

  // Record failure for active provider
  const state = providerStates[activeProvider];
  if (state) {
    state.consecutiveFailures++;
    state.lastFailureTime = Date.now();
  }

  // Trigger immediate failover
  const primary = (process.env.EMAIL_PROVIDER_PRIMARY as "smtp" | "resend" | "ses") || "smtp";
  const secondary = (process.env.EMAIL_PROVIDER_SECONDARY as "smtp" | "resend" | "ses") || "resend";
  const failoverProvider = activeProvider === primary ? secondary : primary;

  console.warn(
    `[EmailService] Active provider ${activeProvider} failed. Triggering failover via ${failoverProvider}`,
  );
  success = await dispatchWithProvider(failoverProvider, payload);

  if (success) {
    const fState = providerStates[failoverProvider];
    if (fState) fState.consecutiveFailures = 0;
    return true;
  }

  console.error(`[EmailService] Failover email delivery via ${failoverProvider} also failed.`);
  return false;
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

// ─── Email Template Layout & Security Helpers ─────────────────

export function wrapEmailLayout(bodyHtml: string): string {
  const BRAND = "Ecom";
  const FOOTER = `<p style="color:#94a3b8;font-size:12px;margin-top:32px;">— ${BRAND}</p>`;
  return `
    <div style="font-family:'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:32px;color:#1e293b;">
      ${bodyHtml}
      ${FOOTER}
    </div>
  `;
}

export function formatEmailBody(body: string): string {
  if (body.includes("<") && body.includes(">")) {
    return body;
  }
  return body
    .split("\n\n")
    .map(
      (p) => `<p style="margin-bottom: 12px; line-height: 1.5;">${p.replace(/\n/g, "<br/>")}</p>`,
    )
    .join("");
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const BRAND = "Ecom";

function wrap(body: string): string {
  return wrapEmailLayout(body);
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

export interface VerificationCodeEmailData {
  code: string;
}

export function buildVerificationCodeEmail(data: VerificationCodeEmailData): EmailPayload {
  return {
    to: "",
    subject: `Mã xác minh đăng ký — ${BRAND}`,
    html: wrap(`
      <h2 style="color:#1e293b;">Xin chào,</h2>
      <p>Mã xác minh của bạn để đăng ký tài khoản là:</p>
      <div style="font-size:24px;font-weight:bold;color:#2563eb;letter-spacing:4px;margin:20px 0;padding:12px;background:#f8fafc;border-radius:8px;text-align:center;">
        ${data.code}
      </div>
      <p style="margin-top:16px;color:#64748b;">Mã này sẽ hết hạn sau 5 phút. Vui lòng không chia sẻ mã này với bất kỳ ai.</p>
    `),
    text: `Mã xác minh đăng ký của bạn là: ${data.code}`,
  };
}
