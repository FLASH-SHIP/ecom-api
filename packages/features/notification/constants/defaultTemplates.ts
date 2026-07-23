export const defaultTemplates: Record<
  string,
  {
    titleTemplate: Record<string, string>;
    messageTemplate: Record<string, string>;
    emailSubjectTemplate: Record<string, string> | null;
    emailBodyTemplate: Record<string, string> | null;
    variables: Record<string, string>;
  }
> = {
  "layout.default": {
    titleTemplate: { en: "Default Layout", vi: "Layout mặc định" },
    messageTemplate: { en: "Default Layout", vi: "Layout mặc định" },
    emailSubjectTemplate: { en: "{{title}}", vi: "{{title}}" },
    emailBodyTemplate: {
      en: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{title}}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background-color: #f3f4f6;
      margin: 0;
      padding: 0;
    }
    .wrapper {
      max-width: 600px;
      margin: 20px auto;
      background: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      border: 1px solid #e5e7eb;
    }
    .header {
      background-color: #2563eb;
      padding: 24px;
      text-align: center;
    }
    .header h2 {
      color: #ffffff;
      margin: 0;
      font-size: 20px;
    }
    .content {
      padding: 24px;
    }
    .footer {
      background-color: #f9fafb;
      padding: 16px;
      text-align: center;
      font-size: 12px;
      color: #6b7280;
      border-top: 1px solid #e5e7eb;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h2>Ecom Express</h2>
    </div>
    <div class="content">
      {{{body}}}
    </div>
    <div class="footer">
      &copy; 2026 Ecom Express. All rights reserved.
    </div>
  </div>
</body>
</html>`,
      vi: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{title}}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background-color: #f3f4f6;
      margin: 0;
      padding: 0;
    }
    .wrapper {
      max-width: 600px;
      margin: 20px auto;
      background: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      border: 1px solid #e5e7eb;
    }
    .header {
      background-color: #2563eb;
      padding: 24px;
      text-align: center;
    }
    .header h2 {
      color: #ffffff;
      margin: 0;
      font-size: 20px;
    }
    .content {
      padding: 24px;
    }
    .footer {
      background-color: #f9fafb;
      padding: 16px;
      text-align: center;
      font-size: 12px;
      color: #6b7280;
      border-top: 1px solid #e5e7eb;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h2>Ecom Express</h2>
    </div>
    <div class="content">
      {{{body}}}
    </div>
    <div class="footer">
      &copy; 2026 Ecom Express. Tất cả các quyền được bảo lưu.
    </div>
  </div>
</body>
</html>`,
    },
    variables: {
      body: "Nội dung Email / Email Body",
      title: "Tiêu đề Email / Email Title",
    },
  },
  "layout.marketing": {
    titleTemplate: { en: "Marketing Layout", vi: "Layout tiếp thị" },
    messageTemplate: { en: "Marketing Layout", vi: "Layout tiếp thị" },
    emailSubjectTemplate: { en: "{{title}}", vi: "{{title}}" },
    emailBodyTemplate: {
      en: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{title}}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background-color: #f0fdf4;
      margin: 0;
      padding: 0;
    }
    .wrapper {
      max-width: 600px;
      margin: 20px auto;
      background: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      border: 1px solid #d1fae5;
    }
    .header {
      background-color: #10b981;
      padding: 32px 24px;
      text-align: center;
    }
    .header h2 {
      color: #ffffff;
      margin: 0;
      font-size: 24px;
    }
    .content {
      padding: 32px 24px;
    }
    .footer {
      background-color: #f9fafb;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #6b7280;
      border-top: 1px solid #e5e7eb;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h2>Ecom Marketplace</h2>
    </div>
    <div class="content">
      {{{body}}}
    </div>
    <div class="footer">
      &copy; 2026 Ecom Marketplace. All rights reserved.
    </div>
  </div>
</body>
</html>`,
      vi: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{title}}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background-color: #f0fdf4;
      margin: 0;
      padding: 0;
    }
    .wrapper {
      max-width: 600px;
      margin: 20px auto;
      background: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      border: 1px solid #d1fae5;
    }
    .header {
      background-color: #10b981;
      padding: 32px 24px;
      text-align: center;
    }
    .header h2 {
      color: #ffffff;
      margin: 0;
      font-size: 24px;
    }
    .content {
      padding: 32px 24px;
    }
    .footer {
      background-color: #f9fafb;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #6b7280;
      border-top: 1px solid #e5e7eb;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h2>Ecom Marketplace</h2>
    </div>
    <div class="content">
      {{{body}}}
    </div>
    <div class="footer">
      &copy; 2026 Ecom Marketplace. Tất cả các quyền được bảo lưu.
    </div>
  </div>
</body>
</html>`,
    },
    variables: {
      body: "Nội dung Email / Email Body",
      title: "Tiêu đề Email / Email Title",
    },
  },
  "order.created": {
    titleTemplate: {
      en: "Order Placed Successfully",
      vi: "Đơn hàng đã tạo thành công",
    },
    messageTemplate: {
      en: "Order #{{code}} has been placed successfully.",
      vi: "Đơn hàng #{{code}} đã được tạo thành công.",
    },
    emailSubjectTemplate: {
      en: "Order #{{code}} Placed Successfully",
      vi: "Đơn hàng #{{code}} đã tạo thành công",
    },
    emailBodyTemplate: {
      en: "Dear Customer,\n\nWe have successfully received your order #{{code}}.\n\nThank you for choosing Ecom Express!",
      vi: "Chào Quý khách,\n\nĐơn hàng #{{code}} của Quý khách đã được tiếp nhận thành công.\n\nCảm ơn Quý khách đã mua sắm tại Ecom Express!",
    },
    variables: {
      code: "Mã đơn hàng / Order Code",
    },
  },
  "order.status_updated": {
    titleTemplate: {
      en: "Order Status Updated",
      vi: "Cập nhật trạng thái đơn hàng",
    },
    messageTemplate: {
      en: "Order #{{code}} status changed to: {{status}}.",
      vi: "Đơn hàng #{{code}} chuyển sang trạng thái: {{status}}.",
    },
    emailSubjectTemplate: {
      en: "Order #{{code}} Status Update: {{status}}",
      vi: "Cập nhật trạng thái đơn hàng #{{code}}: {{status}}",
    },
    emailBodyTemplate: {
      en: "Dear Customer,\n\nThe status of your order #{{code}} has been updated to: {{status}}.\n\nPlease check your dashboard for further details.",
      vi: "Chào Quý khách,\n\nTrạng thái đơn hàng #{{code}} của Quý khách đã được cập nhật thành: {{status}}.\n\nVui lòng truy cập trang quản trị để biết thêm chi tiết.",
    },
    variables: {
      code: "Mã đơn hàng / Order Code",
      status: "Trạng thái mới / New status",
    },
  },
  "order.checkpoint_added": {
    titleTemplate: {
      en: "New Shipment Checkpoint",
      vi: "Đơn hàng có hành trình mới",
    },
    messageTemplate: {
      en: "Order #{{code}} has a new update: {{description}}.",
      vi: "Đơn hàng #{{code}} có cập nhật hành trình mới: {{description}}.",
    },
    emailSubjectTemplate: {
      en: "Shipment Update for Order #{{code}}",
      vi: "Đơn hàng #{{code}} của bạn có hành trình mới",
    },
    emailBodyTemplate: {
      en: "Dear Customer,\n\nYour order #{{code}} has a new shipment update:\n\n{{description}}\n\nTrack your shipment live on our portal.",
      vi: "Chào Quý khách,\n\nĐơn hàng #{{code}} của Quý khách có cập nhật hành trình mới:\n\n{{description}}\n\nTheo dõi trực tuyến hành trình trên trang web của chúng tôi.",
    },
    variables: {
      code: "Mã đơn hàng / Order Code",
      description: "Hành trình mới / Shipment update",
    },
  },
  "webhook.deactivated": {
    titleTemplate: {
      en: "Webhook Auto-Deactivated",
      vi: "Tự động tắt Webhook",
    },
    messageTemplate: {
      en: 'Webhook "{{name}}" to {{url}} has been auto-deactivated due to 50 consecutive failures.',
      vi: 'Webhook "{{name}}" tới {{url}} đã bị tự động tắt do lỗi 50 lần liên tiếp.',
    },
    emailSubjectTemplate: {
      en: 'URGENT: Webhook "{{name}}" Auto-Deactivated',
      vi: 'KHẨN CẤP: Tự động tắt Webhook "{{name}}"',
    },
    emailBodyTemplate: {
      en: 'Dear Developer,\n\nThis is an automated alert. The webhook "{{name}}" sending to {{url}} has been auto-deactivated due to 50 consecutive delivery failures.\n\nPlease check your endpoint server logs and reactivate the webhook in the CMS dashboard.',
      vi: 'Chào Quý đối tác,\n\nĐây là thông báo tự động. Webhook "{{name}}" gửi tới {{url}} đã bị tự động vô hiệu hóa do lỗi kết nối 50 lần liên tiếp.\n\nVui lòng kiểm tra nhật ký máy chủ và kích hoạt lại webhook trên trang quản trị.',
    },
    variables: {
      name: "Tên Webhook / Webhook name",
      url: "Đường dẫn Webhook / Webhook URL",
    },
  },
  "auth.password_reset": {
    titleTemplate: {
      en: "Reset Password",
      vi: "Đặt lại mật khẩu",
    },
    messageTemplate: {
      en: "Password reset request received.",
      vi: "Yêu cầu đặt lại mật khẩu của bạn đã được ghi nhận.",
    },
    emailSubjectTemplate: {
      en: "Reset Password — Ecom",
      vi: "Đặt lại mật khẩu — Ecom",
    },
    emailBodyTemplate: {
      en: '<h2>Hello {{name}},</h2><p>You requested to reset your password. Click the button below:</p><p style="margin: 20px 0;"><a href="{{resetUrl}}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Reset Password</a></p><p style="color:#64748b;font-size:13px;">This link will expire in 1 hour. If you did not request this, please ignore this email.</p>',
      vi: '<h2>Xin chào {{name}},</h2><p>Bạn đã yêu cầu đặt lại mật khẩu. Nhấn vào nút bên dưới:</p><p style="margin: 20px 0;"><a href="{{resetUrl}}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Đặt lại mật khẩu</a></p><p style="color:#64748b;font-size:13px;">Link này sẽ hết hạn sau 1 giờ. Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>',
    },
    variables: {
      name: "Tên người dùng / User display name",
      resetUrl: "Đường dẫn đặt lại / Reset link URL",
    },
  },
  "auth.welcome": {
    titleTemplate: {
      en: "Welcome to Ecom",
      vi: "Chào mừng đến Ecom",
    },
    messageTemplate: {
      en: "Your administrator account has been created.",
      vi: "Tài khoản quản trị của bạn đã được tạo thành công.",
    },
    emailSubjectTemplate: {
      en: "Welcome to Ecom",
      vi: "Chào mừng đến Ecom",
    },
    emailBodyTemplate: {
      en: '<h2>Welcome {{name}}!</h2><p>Your account has been created successfully.</p><p style="margin: 20px 0;"><a href="{{loginUrl}}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Login Now</a></p>',
      vi: '<h2>Chào mừng {{name}}!</h2><p>Tài khoản của bạn đã được tạo thành công.</p><p style="margin: 20px 0;"><a href="{{loginUrl}}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Đăng nhập ngay</a></p>',
    },
    variables: {
      name: "Tên người dùng / User display name",
      loginUrl: "Đường dẫn đăng nhập / Login URL",
    },
  },
  "contact.reply": {
    titleTemplate: {
      en: "Reply from Ecom Support",
      vi: "Phản hồi từ Hỗ trợ Ecom",
    },
    messageTemplate: {
      en: "Your contact request has a new reply.",
      vi: "Yêu cầu liên hệ của bạn đã nhận được phản hồi.",
    },
    emailSubjectTemplate: {
      en: "Reply from Ecom",
      vi: "Phản hồi từ Ecom",
    },
    emailBodyTemplate: {
      en: '<h2>Hello {{contactName}},</h2><p>Thank you for contacting us. Here is our reply:</p><div style="padding:16px;background:#f1f5f9;border-radius:8px;margin:16px 0;"><p style="color:#64748b;font-size:13px;margin-bottom:8px;">Your message:</p><p style="color:#475569;">{{originalMessage}}</p></div><div style="padding:16px;background:#eff6ff;border-radius:8px;border-left:4px solid #2563eb;"><p style="color:#1e40af;margin:0;">{{replyMessage}}</p></div>',
      vi: '<h2>Xin chào {{contactName}},</h2><p>Cảm ơn bạn đã liên hệ với chúng tôi. Dưới đây là phản hồi:</p><div style="padding:16px;background:#f1f5f9;border-radius:8px;margin:16px 0;"><p style="color:#64748b;font-size:13px;margin-bottom:8px;">Tin nhắn của bạn:</p><p style="color:#475569;">{{originalMessage}}</p></div><div style="padding:16px;background:#eff6ff;border-radius:8px;border-left:4px solid #2563eb;"><p style="color:#1e40af;margin:0;">{{replyMessage}}</p></div>',
    },
    variables: {
      contactName: "Tên người gửi / Sender name",
      originalMessage: "Tin nhắn gốc / Original message content",
      replyMessage: "Nội dung phản hồi / Reply message content",
    },
  },
  "comment.moderation": {
    titleTemplate: {
      en: "New Comment Moderation Alert",
      vi: "Bình luận mới cần phê duyệt",
    },
    messageTemplate: {
      en: '{{commentAuthor}} commented on "{{postTitle}}".',
      vi: '{{commentAuthor}} đã bình luận trên bài viết "{{postTitle}}".',
    },
    emailSubjectTemplate: {
      en: 'New comment on "{{postTitle}}" — Ecom',
      vi: 'Bình luận mới trên "{{postTitle}}" — Ecom',
    },
    emailBodyTemplate: {
      en: '<h2>New comment pending approval</h2><p><strong>{{commentAuthor}}</strong> has commented on the article <strong>"{{postTitle}}"</strong>:</p><div style="padding:16px;background:#f1f5f9;border-radius:8px;margin:16px 0;"><p style="color:#475569;margin:0;">{{commentContent}}</p></div><p style="margin: 20px 0;"><a href="{{moderationUrl}}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Approve Comment</a></p>',
      vi: '<h2>Bình luận mới cần duyệt</h2><p><strong>{{commentAuthor}}</strong> đã bình luận trên bài viết <strong>"{{postTitle}}"</strong>:</p><div style="padding:16px;background:#f1f5f9;border-radius:8px;margin:16px 0;"><p style="color:#475569;margin:0;">{{commentContent}}</p></div><p style="margin: 20px 0;"><a href="{{moderationUrl}}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Duyệt bình luận</a></p>',
    },
    variables: {
      postTitle: "Tiêu đề bài viết / Post title",
      commentAuthor: "Tác giả bình luận / Comment author",
      commentContent: "Nội dung bình luận / Comment content",
      moderationUrl: "Đường dẫn quản trị / Moderation URL",
    },
  },
  "customer.welcome": {
    titleTemplate: {
      en: "Welcome new customer",
      vi: "Chào mừng khách hàng mới",
    },
    messageTemplate: {
      en: "Your customer account has been registered successfully.",
      vi: "Tài khoản khách hàng của bạn đã được đăng ký thành công.",
    },
    emailSubjectTemplate: {
      en: "Welcome new customer — Ecom",
      vi: "Chào mừng khách hàng mới — Ecom",
    },
    emailBodyTemplate: {
      en: '<h2>Welcome {{customerName}}!</h2><p>Your account has been registered successfully.</p><p style="margin: 20px 0;"><a href="{{loginUrl}}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Login</a></p>',
      vi: '<h2>Chào mừng {{customerName}}!</h2><p>Tài khoản của bạn đã được đăng ký thành công.</p><p style="margin: 20px 0;"><a href="{{loginUrl}}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Đăng nhập</a></p>',
    },
    variables: {
      customerName: "Tên khách hàng / Customer name",
      loginUrl: "Đường dẫn đăng nhập / Login URL",
    },
  },
  "customer.email_verification": {
    titleTemplate: {
      en: "Verify Email",
      vi: "Xác minh email",
    },
    messageTemplate: {
      en: "Please verify your email address.",
      vi: "Vui lòng xác minh địa chỉ email của bạn.",
    },
    emailSubjectTemplate: {
      en: "Verify Email — Ecom",
      vi: "Xác minh email — Ecom",
    },
    emailBodyTemplate: {
      en: '<h2>Hello {{name}},</h2><p>Please verify your email address by clicking the button below:</p><p style="margin: 20px 0;"><a href="{{verifyUrl}}" style="display:inline-block;padding:12px 24px;background:#16a34a;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Verify Email</a></p><p style="color:#64748b;font-size:13px;">This link will expire in 24 hours.</p>',
      vi: '<h2>Xin chào {{name}},</h2><p>Vui lòng xác minh địa chỉ email của bạn bằng cách nhấn vào nút bên dưới:</p><p style="margin: 20px 0;"><a href="{{verifyUrl}}" style="display:inline-block;padding:12px 24px;background:#16a34a;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Xác minh email</a></p><p style="color:#64748b;font-size:13px;">Link này sẽ hết hạn sau 24 giờ.</p>',
    },
    variables: {
      name: "Tên khách hàng / Customer name",
      verifyUrl: "Đường dẫn xác minh / Verification link URL",
    },
  },
  "customer.password_reset": {
    titleTemplate: {
      en: "Reset Account Password",
      vi: "Đặt lại mật khẩu tài khoản",
    },
    messageTemplate: {
      en: "Customer password reset request received.",
      vi: "Yêu cầu đặt lại mật khẩu tài khoản khách hàng đã ghi nhận.",
    },
    emailSubjectTemplate: {
      en: "Reset Account Password — Ecom",
      vi: "Đặt lại mật khẩu tài khoản — Ecom",
    },
    emailBodyTemplate: {
      en: '<h2>Hello {{name}},</h2><p>You requested to reset your customer account password. Click the button below:</p><p style="margin: 20px 0;"><a href="{{resetUrl}}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Reset Password</a></p><p style="color:#64748b;font-size:13px;">This link will expire in 1 hour. If you did not request this, please ignore this email.</p>',
      vi: '<h2>Xin chào {{name}},</h2><p>Bạn đã yêu cầu đặt lại mật khẩu tài khoản khách hàng. Nhấn vào nút bên dưới:</p><p style="margin: 20px 0;"><a href="{{resetUrl}}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Đặt lại mật khẩu</a></p><p style="color:#64748b;font-size:13px;">Link này sẽ hết hạn sau 1 giờ. Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>',
    },
    variables: {
      name: "Tên khách hàng / Customer name",
      resetUrl: "Đường dẫn đặt lại / Reset link URL",
    },
  },
  "customer.verification_code": {
    titleTemplate: {
      en: "Registration Verification Code",
      vi: "Mã xác minh đăng ký",
    },
    messageTemplate: {
      en: "Your registration verification code is {{code}}.",
      vi: "Mã xác minh đăng ký của bạn là {{code}}.",
    },
    emailSubjectTemplate: {
      en: "Registration Verification Code — Ecom",
      vi: "Mã xác minh đăng ký — Ecom",
    },
    emailBodyTemplate: {
      en: '<h2>Hello,</h2><p>Your verification code to register an account is:</p><div style="font-size:24px;font-weight:bold;color:#2563eb;letter-spacing:4px;margin:20px 0;padding:12px;background:#f8fafc;border-radius:8px;text-align:center;">{{code}}</div><p style="color:#64748b;font-size:13px;">This code will expire in 5 minutes. Please do not share this code with anyone.</p>',
      vi: '<h2>Xin chào,</h2><p>Mã xác minh của bạn để đăng ký tài khoản là:</p><div style="font-size:24px;font-weight:bold;color:#2563eb;letter-spacing:4px;margin:20px 0;padding:12px;background:#f8fafc;border-radius:8px;text-align:center;">{{code}}</div><p style="color:#64748b;font-size:13px;">Mã này sẽ hết hạn sau 5 phút. Vui lòng không chia sẻ mã này với bất kỳ ai.</p>',
    },
    variables: {
      code: "Mã xác minh / Verification code",
    },
  },
};
