# Lưu Thông Tin Receiver — Implementation (Optimized)

## Status: not-started

## Completed

## In Progress

## Blocked

## Next Steps

### Phase 1: Schema (1 bước)

1. Thêm `CustomerReceiver` model + relation vào [customer.prisma](file:///Users/hy/SourceCode/flashship/ecom/packages/prisma/schema/customer.prisma), chạy `npx prisma db push && npx prisma generate`

```prisma
model CustomerReceiver {
  id         Int      @id @default(autoincrement())
  customerId String   @map("customer_id") @db.Uuid
  customer   Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)

  label      String?
  name       String
  phone      String?
  email      String?
  address1   String   @map("address_1") @db.Text
  address2   String?  @map("address_2") @db.Text
  city       String
  state      String
  zipCode    String   @map("zip_code")
  country    String   @default("US")
  isDefault  Boolean  @default(false) @map("is_default")

  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")
  deletedAt  DateTime? @map("deleted_at")

  @@index([customerId])
  @@index([customerId, isDefault])
  @@map("customer_receivers")
}
```

> Thêm `receivers CustomerReceiver[]` vào model `Customer` và thêm `@map()` cho tất cả fields.

---

### Phase 2: Backend — Repo + Service + tRPC (5 bước)

> Pattern 100% tương tự Sender — chỉ thay đổi fields.

| Layer | Sender file (template) | Receiver file (mới) |
|:---|:---|:---|
| Repository | `CustomerSenderRepository.ts` | `CustomerReceiverRepository.ts` |
| Service | `CustomerSenderService.ts` | `CustomerReceiverService.ts` |
| DI | `di/containers/CustomerSenderService.ts` | `di/containers/CustomerReceiverService.ts` |
| Handler | `senders/procedures/senders.handler.ts` | `receivers/receivers.handler.ts` |
| Router | `senders/_router.ts` | `receivers/_router.ts` |

**Fields mapping Sender → Receiver:**

| Sender field | Receiver field | Khác biệt |
|:---|:---|:---|
| `address` (String) | `address1` + `address2` | Receiver có 2 dòng địa chỉ |
| `city` (Tỉnh VN) | `city` (City US) | Cùng tên, khác nghĩa |
| `ward` (Quận/Huyện) | `state` (Bang US) | Thay thế hoàn toàn |
| `zipCode` (optional) | `zipCode` (required) | Receiver bắt buộc |
| `country: "VN"` | `country: "US"` | Default khác |

2. Tạo `CustomerReceiverRepository.ts` — copy từ Sender, thay fields:
   - `SENDER_SELECT` → `RECEIVER_SELECT` (thay `address`/`ward` → `address1`/`address2`/`state`)
   - `customerSender` → `customerReceiver` (Prisma model name)

3. Tạo `CustomerReceiverService.ts` — copy từ Sender, thay:
   - Deps: `senderRepo` → `receiverRepo`
   - Validation: `address is required` → `address1 is required`, thêm validate `state`, `zipCode`
   - Error messages: `"Sender not found"` → `"Receiver not found"`

4. Tạo DI container + tRPC handler + router:
   - `receivers/receivers.handler.ts` — 5 procedures, Zod schema:
     ```typescript
     const receiverInputSchema = z.object({
       label: z.string().nullish(),
       name: z.string().min(1),
       phone: z.string().nullish(),
       email: z.string().nullish(),
       address1: z.string().min(1),
       address2: z.string().nullish(),
       city: z.string().min(1),
       state: z.string().min(1),
       zipCode: z.string().min(1),     // required cho US
       country: z.string().default("US"),
       isDefault: z.boolean().default(false),
     });
     ```
   - `receivers/_router.ts`

5. Đăng ký trong [_app.ts](file:///Users/hy/SourceCode/flashship/ecom/packages/trpc/server/routers/_app.ts) → `customer.receivers`

6. **Verify backend**: `yarn type-check:ci` — fix trước khi sang frontend

---

### Phase 3: Frontend (4 bước)

Thay đổi trong [page.tsx](file:///Users/hy/SourceCode/flashship/ecom/apps/customer/src/app/orders/single/page.tsx)

7. **State + Query** — thêm cạnh sender logic (line ~337):
   ```typescript
   const [selectedReceiverId, setSelectedReceiverId] = useState<number | null>(null);
   const { data: savedReceivers = [] } = trpc.customer.receivers.list.useQuery();
   const createReceiverMutation = trpc.customer.receivers.create.useMutation();
   const updateReceiverMutation = trpc.customer.receivers.update.useMutation();
   ```

8. **Dropdown + auto-fill** — tương tự sender:
   ```typescript
   const savedReceiverOptions = useMemo(() =>
     savedReceivers.map((r) => ({
       value: String(r.id),
       label: r.label || `${r.name} — ${r.city}, ${r.state}`,
     })),
     [savedReceivers],
   );

   const handleSelectSavedReceiver = useCallback((val: string) => {
     const receiver = savedReceivers.find((r) => r.id === Number(val));
     if (!receiver) { setSelectedReceiverId(null); return; }
     setSelectedReceiverId(receiver.id);
     setValue("receiverName", receiver.name);
     setValue("receiverPhone", receiver.phone ?? "");
     setValue("receiverEmail", receiver.email ?? "");
     setValue("receiverAddress1", receiver.address1);
     setValue("receiverAddress2", receiver.address2 ?? "");
     setValue("receiverCity", receiver.city);
     setValue("receiverState", receiver.state);
     setValue("receiverZipCode", receiver.zipCode);
     setValue("receiverCountry", receiver.country ?? "US");
     setSaveReceiverSetting(true);
   }, [savedReceivers, setValue]);
   ```

9. **Save logic** — trong `onSuccess`, thay `localStorage` bằng API call:
   - Bỏ `localStorage.setItem("default_receiver_info", ...)`
   - Bỏ `localStorage.removeItem("default_receiver_info")`
   - Thêm `receivers.create` / `receivers.update` (pattern giống sender)

10. **Restore logic** — trong mount useEffect:
    - Bỏ `localStorage.getItem("default_receiver_info")`
    - Dùng `savedReceivers` → tìm `isDefault === true` → auto-fill + `setSaveReceiverSetting(true)`

---

### Phase 4: Verify (3 bước)

11. `yarn type-check:ci`
12. `yarn biome check --write .`
13. Test thủ công: tạo đơn → tick checkbox receiver → submit → tạo đơn mới → verify auto-fill

## Tối ưu so với bản gốc

| Aspect | Bản gốc | Tối ưu |
|:---|:---|:---|
| Số bước | 18 | 13 |
| Phases | 5 | 4 (gộp Backend + tRPC) |
| Handler structure | `procedures/receivers.handler.ts` (nested) | `receivers.handler.ts` (flat) |
| Fields mapping | Mô tả chung | Bảng mapping chi tiết Sender → Receiver |
| Code samples | Không có | Code cụ thể cho state, dropdown, auto-fill |
| Verify backend riêng | Không | Có (bước 6) — fix type errors trước khi sang UI |

## Session Notes
