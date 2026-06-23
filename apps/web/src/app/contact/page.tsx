"use client";

import { CheckCircle, Mail, Send, User } from "lucide-react";
import { useState } from "react";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 md:py-20">
        <div className="rounded-2xl border border-border p-8 text-center md:p-12">
          <CheckCircle className="mx-auto mb-4 h-16 w-16 text-emerald-500" />
          <h2 className="mb-2 text-xl font-bold">Cảm ơn bạn!</h2>
          <p className="mb-6 text-muted-foreground">
            Tin nhắn của bạn đã được gửi. Chúng tôi sẽ liên hệ lại trong thời gian sớm nhất.
          </p>
          <button
            type="button"
            onClick={() => {
              setSubmitted(false);
              setForm({ name: "", email: "", message: "" });
            }}
            className="rounded-lg border border-border px-5 py-2 text-sm font-semibold transition-colors hover:bg-muted"
          >
            Gửi tin nhắn khác
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="border-b border-border bg-muted/50 py-10 md:py-14">
        <div className="mx-auto max-w-5xl px-4">
          <div className="mb-3 flex items-center gap-3">
            <Mail className="h-9 w-9 text-primary" />
            <h1 className="text-3xl font-extrabold">Liên hệ</h1>
          </div>
          <p className="text-muted-foreground">
            Bạn có câu hỏi hoặc phản hồi? Chúng tôi rất muốn được lắng nghe.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-10 md:py-16">
        <div className="grid items-start gap-12 md:grid-cols-[1fr_2fr]">
          {/* Contact Info */}
          <div>
            <h2 className="mb-2 text-lg font-bold">Thông tin liên hệ</h2>
            <p className="mb-6 leading-relaxed text-sm text-muted-foreground">
              Điền vào form bên phải và chúng tôi sẽ phản hồi trong vòng 24 giờ làm việc.
            </p>

            <div className="flex gap-3">
              <Mail className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-semibold">Email</p>
                <p className="text-sm text-muted-foreground">hello@ecom.io</p>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="rounded-2xl border border-border p-6 md:p-10">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="contact-name" className="mb-1.5 block text-sm font-medium">
                    Họ tên
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="contact-name"
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Nguyễn Văn A"
                      className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="contact-email" className="mb-1.5 block text-sm font-medium">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="contact-email"
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="you@example.com"
                      className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="contact-message" className="mb-1.5 block text-sm font-medium">
                  Tin nhắn
                </label>
                <textarea
                  id="contact-message"
                  required
                  rows={6}
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  placeholder="Nội dung tin nhắn của bạn..."
                  className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Đang gửi...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Gửi tin nhắn
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
