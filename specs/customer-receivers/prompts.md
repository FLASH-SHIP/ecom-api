# Lưu Thông Tin Receiver — Prompts

Prompt log dùng để tạo feature này.

---

## Prompt: Lên plan Customer Receivers

**Date:** 2025-07-15

**Input:**

> Phần Receiver cũng có checkbox Save your setting for repeated use tương tự phần Sender.
> Giúp tôi tạo bảng, lên plan chi tiết bằng tiếng Việt, lên specs chi tiết như customer-sender.
> Khi nào Process mới tiến hành code.

**Context:**

- Sender đã được triển khai hoàn chỉnh:
  - Bảng `customer_senders` + Repository + Service + tRPC Router + UI integration
  - Dropdown chọn sender đã lưu + checkbox save + auto-fill default sender
- Receiver hiện đang dùng `localStorage("default_receiver_info")` — chỉ lưu 1 bộ
- Receiver fields khác Sender: `address1` + `address2`, `state` thay vì `ward`, country = US

**Output:**

- Tạo thư mục `specs/customer-receivers/` với đầy đủ specs
- Design, Implementation, Decisions, AGENTS, Future-work, Prompts
- Chờ user approve trước khi code
