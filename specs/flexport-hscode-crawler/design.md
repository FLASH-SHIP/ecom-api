# Flexport HS Code Crawler — Design

## Tổng Quan

Hệ thống cần thu thập (crawl) thông tin ghi chú chương (Chapter Notes) từ trang dữ liệu biểu thuế quan Flexport (`https://www.flexport.com/data/hs-code`) để hỗ trợ việc tra cứu mã HS Code và thuế suất nhập khẩu một cách chính xác nhất (bao gồm cả ghi chú bổ sung của Hoa Kỳ - Additional U.S. Notes).

Thông tin này sẽ được lưu trữ và cập nhật vào bảng `crawl_hscode` dưới dạng HTML để hiển thị trực quan trên giao diện ứng dụng.

## Vấn Đề Hiện Tại

- Dữ liệu HS Code ban đầu được import thô nhưng thiếu phần "Chapter Notes" (ghi chú hướng dẫn phân loại hàng hóa ở cấp độ chương).
- Việc thiếu Chapter Notes dẫn tới việc nhân viên nghiệp vụ khó phân loại các mặt hàng nhạy cảm hoặc cần tuân thủ quy tắc thuế quan đặc biệt.
- Quy trình crawl hiện tại chỉ chạy bằng file script thủ công qua console, chưa được tích hợp vào hệ thống seeding tự động của dự án. Điều này gây khó khăn khi triển khai trên các môi trường staging/production mới.

## Thiết Kế Kỹ Thuật

### 1. Database Schema
Dữ liệu Chapter Notes sau khi crawl sẽ được lưu vào bảng `crawl_hscode` (model `CrawlHsCode` trong [hscode.prisma](file:///Users/hy/SourceCode/flashship/ecom/packages/prisma/schema/hscode.prisma)):

```prisma
model CrawlHsCode {
  no                     Int     @id
  portOfClearance        String? @map("port_of_clearance") @db.VarChar
  hsCode                 String? @map("hs_code") @db.VarChar
  articleDescription     String? @map("article_description") @db.Text
  generalRateOfDuty      String? @map("general_rate_of_duty") @db.VarChar
  section301TariffsRate  String? @map("section_301_tariffs_rate") @db.VarChar
  additionalTariffsRate  String? @map("additional_tariffs_rate") @db.VarChar
  antidumpingDutyRate    String? @map("antidumping_duty_rate") @db.VarChar
  countervailingDutyRate String? @map("countervailing_duty_rate") @db.VarChar
  notes                  String? @db.Text

  @@map("crawl_hscode")
}
```

*Lưu ý:* Bản ghi cấp Chương (Chapter) sẽ được tạo/cập nhật với định danh `no` theo công thức: `900000 + Number(chapterCode)`.

### 2. Thuật toán Crawler

```
   [Database]
       │ Lấy danh sách Chapter Code (2 chữ số đầu tiên của hs_code)
       ▼
   [Loop qua từng Chapter]
       │
       ▼ Slugify Chapter Name (vd: "01-live-animals")
   [Request Flexport URL]
       │
       ▼ Tách HTML bằng regex/index các thẻ chứa lớp CSS "note_header"
   [Extract Notes Section Container]
       │
       ▼ Upsert dữ liệu (no = 900000 + chapterCode) vào bảng crawl_hscode
   [Database]
```

#### Chi tiết xử lý Slugify & Fallback Slugs:
Do tên chương trên trang Flexport có thể khác so với tên chương lưu trong cơ sở dữ liệu gốc, crawler định nghĩa danh sách fallback slugs tĩnh cho một số chương đặc biệt:
- **Chương 28**: `28-inorganic-chemicals-organic-or-inorgani-c-compounds-of-precious-metals-of-rareearth-metalsof-radioactive-elements-or-of-isotopes`
- **Chương 34**: `34-soap-organic-surfaceactive-agents-washing-preparations-lubricating-preparations-artificial-waxes-prepared-waxes-polishing-or-scouring-preparations-can`
- **Chương 54**: `54-manmade-filaments`
- **Chương 55**: `55-manmade-staple-fibers`
- **Chương 66**: `66-umbrellas-sun-umbrellas-walking-sticks-seatsticks-whips-ridingcrops-and-parts-thereof`
- **Chương 71**: `71-natural-or-cultured-pearls-precious-or-semiprecious-stonesprecious-metals-metals-clad-with-precious-metal-and-articles-thereof-imitation-jewelry-coin`
- **Chương 85**: `85-electrical-machinery-and-equipment-and-parts-thereof-sound-recorders-and-reproducers-television-image-and-sound-recorders-and-reproducers-and-parts-an`
- **Chương 86**: `86-railway-or-tramway-locomotives-rollingstock-and-parts-thereof-railway-or-tramway-track-fixtures-and-fittings-and-parts-thereof-mechanical-including-el`
- **Chương 94**: `94-furniture-bedding-mattresses-mattress-supports-cushions-and-similar-stuffed-furnishings-lamps-and-lighting-fittings-not-elsewhere-specified-or-include`

#### Chi tiết trích xuất Notes HTML:
Crawler định vị tiêu đề ghi chú chương qua các chuỗi:
- `<div class="note_header">Note</div>`
- `<div class="note_header">Notes</div>`
- ...
Và trích xuất toàn bộ khối `<section>` chứa tiêu đề này.

### 3. Tích hợp Seeder Tự động

Để tự động hóa việc đồng bộ dữ liệu khi khởi chạy hệ thống (hoặc triển khai lên server), ta tích hợp crawler thành một Seeder chính thức:
- Đặt tên seeder: `15-flexport-hscode-crawler.seeder.ts`
- Định danh trong Seeder Registry: `FlexportHsCodeCrawler`
- Logic chạy: Lấy trực tiếp từ logic crawler hiện tại, sử dụng Node.js Fetch built-in (được hỗ trợ bởi `tsx`).
