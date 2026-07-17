# Flexport HS Code Crawler — Implementation

## Status: not-started

## Completed

## In Progress

## Blocked

## Next Steps

### Phase 1: Create Seeder File
1. Tạo file seeder mới `packages/prisma/seeders/15-flexport-hscode-crawler.seeder.ts` kế thừa interface `Seeder`.
2. Sao chép logic crawl từ `packages/features/hscode/scripts/crawl-chapters.ts` vào seeder:
   - Truy vấn các chương từ cơ sở dữ liệu.
   - Crawl dữ liệu Chapter Notes từ trang web Flexport.
   - Upsert dữ liệu vào bảng `crawl_hscode` sử dụng `prisma` instance được truyền qua hàm `run(prisma)`.
   - Giữ nguyên các hàm bổ trợ như `slugify`, `findNotesHeaderIdx`, `extractNotesBox`, `extractChapterDesc`.

### Phase 2: Register Seeder
3. Import `FlexportHsCodeCrawlerSeeder` vào `packages/prisma/seeders/index.ts`.
4. Thêm `FlexportHsCodeCrawlerSeeder` vào cuối danh sách `SEEDERS` registry.

### Phase 3: Verification
5. Chạy test seeder cục bộ: `SEED_ONLY=FlexportHsCodeCrawler yarn prisma:seed`
6. Kiểm tra lại dữ liệu trong DB xem Chapter Notes đã được import đầy đủ chưa.
7. Type check toàn bộ project: `yarn type-check:ci --force`
8. Lint check: `yarn biome check --write .`
