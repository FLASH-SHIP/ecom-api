import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { generateCustomerCode } from "@flash-ship/ecom-lib";

async function main() {
  const { prisma } = await import("../src/index");
  console.log("=== RÀ SOÁT VÀ SỐ HÓA MÃ KHÁCH HÀNG (BACKFILL CUSTOMER CODE) ===");

  // 1. Rà soát tổng quan database
  const totalCustomers = await prisma.customer.count();
  const nullCodeCustomers = await prisma.customer.count({
    where: { customerCode: null },
  });
  const existingCodeCustomers = totalCustomers - nullCodeCustomers;

  console.log(`- Tổng số khách hàng trong DB: ${totalCustomers}`);
  console.log(`- Số khách hàng ĐÃ CÓ mã: ${existingCodeCustomers}`);
  console.log(`- Số khách hàng CHƯA CÓ mã (Cần bổ sung): ${nullCodeCustomers}`);

  if (nullCodeCustomers === 0) {
    console.log(
      "\n✅ Tất cả khách hàng đều đã có mã customer_code đầy đủ! Không cần cập nhật thêm.",
    );
    return;
  }

  // 2. Lấy tất cả mã khách hàng đã tồn tại để tránh trùng lặp trong bộ nhớ
  const existingRecords = await prisma.customer.findMany({
    where: { customerCode: { not: null } },
    select: { customerCode: true },
  });
  const usedCodes = new Set<string>(
    existingRecords.map((c) => c.customerCode).filter(Boolean) as string[],
  );

  // 3. Lấy danh sách khách hàng chưa có mã
  const pendingCustomers = await prisma.customer.findMany({
    where: { customerCode: null },
    select: { id: true, email: true, username: true, name: true },
    orderBy: { createdAt: "asc" },
  });

  console.log(`\n▶ Tiến hành sinh và gán mã cho ${pendingCustomers.length} khách hàng...`);

  let updatedCount = 0;
  for (const customer of pendingCustomers) {
    let newCode = "";
    let attempts = 0;

    // Sinh mã duy nhất không đụng độ
    do {
      newCode = generateCustomerCode("KH", 6);
      attempts++;
      if (attempts > 100) {
        throw new Error(
          `Không thể sinh mã duy nhất sau 100 lần thử cho khách hàng ID: ${customer.id}`,
        );
      }
    } while (usedCodes.has(newCode));

    // Đánh dấu mã đã sử dụng
    usedCodes.add(newCode);

    // Cập nhật vào DB
    await prisma.customer.update({
      where: { id: customer.id },
      data: { customerCode: newCode },
    });

    updatedCount++;
    console.log(
      `  [${updatedCount}/${pendingCustomers.length}] ID: ${customer.id} | User: ${customer.username || customer.email} -> Mã mới: ${newCode}`,
    );
  }

  // 4. Kiểm tra lại sau khi cập nhật
  const remainingNull = await prisma.customer.count({
    where: { customerCode: null },
  });

  console.log("\n=== KẾT QUẢ RÀ SOÁT & CẬP NHẬT ===");
  console.log(`- Số mã đã cập nhật thành công: ${updatedCount}`);
  console.log(`- Số khách hàng chưa có mã còn lại: ${remainingNull}`);

  if (remainingNull === 0) {
    console.log(
      "🎉 Hoàn tất 100%! Tất cả khách hàng trong database đã được gắn mã customer_code hợp lệ.",
    );
  } else {
    console.warn("⚠️ Vẫn còn một số khách hàng chưa được gán mã.");
  }
}

main()
  .catch((err) => {
    console.error("❌ Lỗi trong quá trình backfill:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
