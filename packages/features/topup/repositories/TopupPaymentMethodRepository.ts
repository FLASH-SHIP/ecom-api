import { TopupContentStatus, type PrismaClient } from "@ecom/prisma";

/**
 * Repository quản lý dữ liệu Phương thức thanh toán (Topup Payment Methods).
 * 
 * LƯU Ý BẢO TRÌ (MAINTENANCE NOTES):
 * 1. Bảng DB liên quan: `topup_payment_methods` và `topup_payment_method_partner_relations`.
 * 2. Cột `is_default` (Boolean): Đánh dấu phương thức dùng chung cho TẤT CẢ khách hàng.
 * 3. PostgreSQL Indexes:
 *    - `@@index([status, deletedAt, isDefault])` trên bảng `topup_payment_methods`.
 *    - `@@index([customerId, status, deletedAt])` trên bảng `topup_payment_method_partner_relations`.
 */
export class TopupPaymentMethodRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Truy vấn danh sách phương thức thanh toán khả dụng cho một Customer cụ thể.
   * 
   * THUẬT TOÁN HỢP NHẤT (UNION ALGORITHM):
   * Kết quả trả về là hợp nhất của 2 tập hợp (Prisma OR query):
   * 1. Tập phương thức Mặc định: `isDefault = true` (áp dụng chung cho toàn bộ hệ thống).
   * 2. Tập phương thức Riêng biệt: Được gán cụ thể cho `customerId` trong bảng `topup_payment_method_partner_relations`.
   * 
   * @param customerId UUID định danh khách hàng
   * @returns Danh sách TopupPaymentMethod đã sắp xếp theo position asc, createdAt desc
   */
  async getPaymentMethodsForCustomer(customerId: string) {
    return this.prisma.topupPaymentMethod.findMany({
      where: {
        status: TopupContentStatus.PUBLISHED,
        deletedAt: null,
        OR: [
          { isDefault: true },
          {
            relations: {
              some: {
                customerId,
                status: TopupContentStatus.PUBLISHED,
                deletedAt: null,
              },
            },
          },
        ],
      },
      orderBy: [{ position: "asc" }, { createdAt: "desc" }],
    });
  }

  /**
   * Tìm kiếm phương thức thanh toán theo ID (chỉ áp dụng cho bản ghi PUBLISHED và chưa xóa mềm).
   * 
   * @param id Mã ID số nguyên của phương thức thanh toán
   */
  async findById(id: number) {
    return this.prisma.topupPaymentMethod.findFirst({
      where: {
        id,
        status: TopupContentStatus.PUBLISHED,
        deletedAt: null,
      },
    });
  }
}
