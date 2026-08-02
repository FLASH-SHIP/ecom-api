import { getTopupTransactionService } from "@ecom/features/di/containers/TopupService";
import { TopupStatus } from "@flash-ship/ecom-types";
import { format } from "date-fns";
import ExcelJS from "exceljs";
import { z } from "zod";
import { authedProcedure } from "../../../../trpc";

export const getWalletSummary = authedProcedure.query(async ({ ctx }) => {
  return getTopupTransactionService().getWalletSummary(ctx.user.id);
});

export const getPaymentMethods = authedProcedure.query(async ({ ctx }) => {
  return getTopupTransactionService().getPaymentMethods(ctx.user.id);
});

export const getLatestExchangeRate = authedProcedure
  .input(z.object({ date: z.string().optional() }).optional())
  .query(async ({ input }) => {
    const dateObj = input?.date ? new Date(input.date) : undefined;
    return getTopupTransactionService().getLatestExchangeRate(dateObj);
  });

export const getTopupHistory = authedProcedure
  .input(
    z
      .object({
        page: z.number().int().positive().optional(),
        pageSize: z.number().int().positive().optional(),
        search: z.string().optional(),
        paymentMethodId: z.number().int().positive().optional(),
        status: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        customerId: z.string().optional(),
        sortBy: z.string().optional(),
        sortOrder: z.enum(["asc", "desc"]).optional(),
      })
      .optional(),
  )
  .query(async ({ ctx, input }) => {
    const isCustomerUser = !ctx.user.permissions || ctx.user.permissions.length === 0;
    const targetCustomerId = isCustomerUser ? ctx.user.id : input?.customerId;

    return getTopupTransactionService().getTopupHistory({
      customerId: targetCustomerId,
      page: input?.page,
      pageSize: input?.pageSize,
      search: input?.search,
      paymentMethodId: input?.paymentMethodId,
      status: input?.status,
      dateFrom: input?.dateFrom ? new Date(input.dateFrom) : undefined,
      dateTo: input?.dateTo ? new Date(input.dateTo) : undefined,
      sortBy: input?.sortBy,
      sortOrder: input?.sortOrder,
    });
  });

/**
 * TRPC Procedure Lấy danh sách lịch sử biến động số dư ví (`getTransactionHistory`)
 * - Bắt buộc đăng nhập (`authedProcedure`).
 * - Tự động cách ly dữ liệu: Luôn gán `customerId = ctx.user.id`.
 * - Bảo mật Chống DoS: Giới hạn `pageSize` tối đa 100 bằng Zod (`z.number().min(1).max(100)`).
 * - Khóa dải ngày: Chuyển đổi `dateFrom` và `dateTo` thành Date Object an toàn.
 */
export const getTransactionHistory = authedProcedure
  .input(
    z
      .object({
        page: z.number().int().positive().optional().default(1),
        pageSize: z.number().int().min(1).max(100).optional().default(10),
        search: z.string().optional(),
        topupType: z.string().optional(),
        status: z.number().int().optional().default(TopupStatus.CONFIRMED),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        sortBy: z.string().optional().default("updatedAt"),
        sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
      })
      .optional(),
  )
  .query(async ({ ctx, input }) => {
    return getTopupTransactionService().getTransactionHistoryList({
      customerId: ctx.user.id,
      page: input?.page,
      pageSize: input?.pageSize,
      search: input?.search,
      topupType: input?.topupType,
      status: input?.status,
      dateFrom: input?.dateFrom ? new Date(input.dateFrom) : undefined,
      dateTo: input?.dateTo ? new Date(input.dateTo) : undefined,
      sortBy: input?.sortBy,
      sortOrder: input?.sortOrder,
    });
  });

export const createTopupRequest = authedProcedure
  .input(
    z.object({
      paymentMethodId: z.number().int().positive(),
      wireAmount: z.number().positive(),
      currency: z.string().optional(),
      rate: z.number().optional(),
      description: z.string().optional(),
      wireDate: z.string().optional(),
      wireImages: z
        .array(z.string())
        .min(1, "Vui lòng tải lên ít nhất 1 ảnh chứng từ xác nhận chuyển tiền.")
        .max(10, "Tối đa chỉ được tải lên 10 ảnh chứng từ."),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    return getTopupTransactionService().createTopupRequest({
      customerId: ctx.user.id,
      paymentMethodId: input.paymentMethodId,
      wireAmount: input.wireAmount,
      currency: input.currency,
      rate: input.rate,
      description: input.description,
      wireDate: input.wireDate ? new Date(input.wireDate) : undefined,
      wireImages: input.wireImages,
    });
  });

export const updateTopupRequest = authedProcedure
  .input(
    z.object({
      id: z.number().int().positive(),
      data: z.object({
        paymentMethodId: z.number().int().positive().optional(),
        wireAmount: z.number().positive().optional(),
        description: z.string().optional(),
        wireDate: z.string().optional(),
        wireImages: z
          .array(z.string())
          .min(1, "Vui lòng tải lên ít nhất 1 ảnh chứng từ xác nhận chuyển tiền mới.")
          .max(10, "Tối đa chỉ được tải lên 10 ảnh chứng từ.")
          .optional(),
      }),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    return getTopupTransactionService().updateTopupRequest(input.id, ctx.user.id, {
      ...input.data,
      wireDate: input.data.wireDate ? new Date(input.data.wireDate) : undefined,
    });
  });

export const cancelTopupRequest = authedProcedure
  .input(z.object({ id: z.number().int().positive(), reason: z.string().optional() }))
  .mutation(async ({ ctx, input }) => {
    const isCustomerUser = !ctx.user.permissions || ctx.user.permissions.length === 0;
    const targetCustomerId = isCustomerUser ? ctx.user.id : undefined;
    return getTopupTransactionService().cancelTopupRequest(
      input.id,
      targetCustomerId,
      ctx.user.id,
      input.reason,
    );
  });

export const adjustTopupRequest = authedProcedure
  .input(
    z.object({
      id: z.number().int().positive(),
      wireAmountApproved: z.number().positive(),
      wireDate: z.string().optional(),
      wireImages: z.array(z.string()).optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    return getTopupTransactionService().adjustTopupRequest(input.id, ctx.user.id, {
      wireAmountApproved: input.wireAmountApproved,
      wireDate: input.wireDate ? new Date(input.wireDate) : undefined,
      wireImages: input.wireImages,
    });
  });

export const approveTopupRequest = authedProcedure
  .input(z.object({ id: z.number().int().positive() }))
  .mutation(async ({ ctx, input }) => {
    return getTopupTransactionService().approveTopupRequest(input.id, ctx.user.id);
  });

export const exportExcel = authedProcedure
  .input(
    z
      .object({
        search: z.string().optional(),
        paymentMethodId: z.number().int().positive().optional(),
        status: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        customerId: z.string().optional(),
        sortBy: z.string().optional(),
        sortOrder: z.enum(["asc", "desc"]).optional(),
        locale: z.string().optional(),
      })
      .optional(),
  )
  .mutation(async ({ ctx, input }) => {
    const isCustomerUser = !ctx.user.permissions || ctx.user.permissions.length === 0;
    const targetCustomerId = isCustomerUser ? ctx.user.id : input?.customerId;

    const historyResult = await getTopupTransactionService().getTopupHistory({
      customerId: targetCustomerId,
      page: 1,
      pageSize: 5000,
      search: input?.search,
      paymentMethodId: input?.paymentMethodId,
      status: input?.status,
      dateFrom: input?.dateFrom ? new Date(input.dateFrom) : undefined,
      dateTo: input?.dateTo ? new Date(input.dateTo) : undefined,
      sortBy: input?.sortBy,
      sortOrder: input?.sortOrder,
    });

    const items = historyResult.data || [];
    const isVi = input?.locale === "vi";

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Topup Transactions");

    worksheet.columns = [
      { header: isVi ? "STT" : "No", key: "stt", width: 8 },
      { header: isVi ? "Mã giao dịch" : "Transaction Code", key: "transactionCode", width: 22 },
      { header: isVi ? "Mã khách hàng" : "Customer Code", key: "customerCode", width: 18 },
      { header: isVi ? "Tên khách hàng" : "Customer Name", key: "customerName", width: 26 },
      { header: isVi ? "Phương thức thanh toán" : "Payment Method", key: "paymentMethod", width: 24 },
      { header: isVi ? "Số tiền gửi ($)" : "Wire Amount ($)", key: "wireAmount", width: 16 },
      { header: isVi ? "Số tiền duyệt ($)" : "Approved Amount ($)", key: "wireAmountApprove", width: 18 },
      { header: isVi ? "Ngày gửi xác nhận" : "Submission Date", key: "submissionDate", width: 22 },
      { header: isVi ? "Ngày chuyển khoản" : "Wire Date", key: "wireDate", width: 18 },
      { header: isVi ? "Trạng thái" : "Status", key: "status", width: 16 },
      { header: isVi ? "Chứng từ (Receipt Proof)" : "Receipt Proof", key: "proofUrls", width: 55 },
      { header: isVi ? "Ghi chú" : "Description", key: "description", width: 30 },
    ];

    const thinBorder: Partial<ExcelJS.Borders> = {
      top: { style: "thin", color: { argb: "FFD3D3D3" } },
      left: { style: "thin", color: { argb: "FFD3D3D3" } },
      bottom: { style: "thin", color: { argb: "FFD3D3D3" } },
      right: { style: "thin", color: { argb: "FFD3D3D3" } },
    };

    const headerRow = worksheet.getRow(1);
    headerRow.height = 24;

    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "CFFEF9" },
      };
      cell.alignment = {
        vertical: "middle",
        horizontal: "left",
      };
      cell.font = {
        bold: true,
        color: { argb: "FF232323" },
        size: 11,
        name: "Calibri",
      };
      cell.border = thinBorder;
    });

    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

    items.forEach((item: any, index: number) => {
      const st = item.status;
      let statusText = isVi ? "Chờ xác nhận" : "Waiting";
      if (st === TopupStatus.CONFIRMED || st === 2) {
        statusText = isVi ? "Đã xác nhận" : "Confirmed";
      } else if (st === TopupStatus.REJECT || st === 3) {
        statusText = isVi ? "Từ chối" : "Rejected";
      }

      // Approved Amount calculation logic
      const rawWire = Number(item.wireAmount ?? item.wire_amount ?? 0);
      const rawApprove = Number(item.wireAmountApprove ?? item.wire_amount_approve ?? item.wireAmountApproved ?? 0);

      let calculatedApproved = 0;
      if (st === TopupStatus.CONFIRMED || st === 2) {
        calculatedApproved = rawApprove > 0 ? rawApprove : rawWire;
      } else if (st === TopupStatus.WAITING || st === 1) {
        calculatedApproved = rawApprove > 0 ? rawApprove : 0;
      }

      // Multi-line receipt proof URLs separated by \n
      const imgs = item.wireImages || item.wire_images || [];
      const proofUrlsStr = imgs
        .map((img: any) => {
          const url = typeof img === "string" ? img : img.imageUrl || img.url || "";
          if (!url) return "";
          if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
            return url;
          }
          return `${apiBase}${url.startsWith("/") ? "" : "/"}${url}`;
        })
        .filter(Boolean)
        .join("\n");

      const createdDateStr = item.createdAt || item.submissionDate || item.created_at || "";
      const formattedSubmission = createdDateStr
        ? format(new Date(createdDateStr), "dd/MM/yyyy HH:mm:ss")
        : "";

      const wireDateStr = item.wireDate || item.wire_date || "";
      const formattedWire = wireDateStr
        ? format(new Date(wireDateStr), "dd/MM/yyyy")
        : "";

      const pmName = typeof item.paymentMethod === "string"
        ? item.paymentMethod
        : item.paymentMethodName || item.paymentMethod?.name || "";

      const row = worksheet.addRow({
        stt: index + 1,
        transactionCode: item.transactionCode || item.transaction_code || "",
        customerCode: item.customer?.customerCode || item.customerCode || "",
        customerName: item.customer?.name || item.customerName || "",
        paymentMethod: pmName,
        wireAmount: Number(rawWire.toFixed(2)),
        wireAmountApprove: Number(calculatedApproved.toFixed(2)),
        submissionDate: formattedSubmission,
        wireDate: formattedWire,
        status: statusText,
        proofUrls: proofUrlsStr,
        description: item.description || "",
      });

      row.getCell("stt").alignment = { vertical: "middle", horizontal: "center" };
      row.getCell("wireAmount").numFmt = "#,##0.00";
      row.getCell("wireAmountApprove").numFmt = "#,##0.00";

      row.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
      row.font = { size: 11, name: "Calibri" };
      row.eachCell((cell) => {
        cell.border = thinBorder;
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const fileName = `Topup_Transactions_${format(new Date(), "yyyyMMdd_HHmmss")}.xlsx`;

    return {
      filename: fileName,
      fileData: base64,
    };
  });

/**
 * TRPC Procedure: Trừ số dư ví khách hàng khi thanh toán đơn hàng thành công (`payOrderWithWallet`)
 * - Yêu cầu người dùng đã đăng nhập (`authedProcedure`).
 * - Input validation qua Zod: orderId (UUID), orderCode (string), amount (positive float transform 2 chữ số thập phân).
 * - Cưỡng chế gán targetCustomerId từ ctx.user.id nếu không truyền customerId (đảm bảo tính bảo mật Data Isolation).
 */
export const payOrderWithWallet = authedProcedure
  .input(
    z.object({
      orderId: z.string().uuid("Mã đơn hàng orderId phải là chuỗi UUID hợp lệ."),
      orderCode: z.string().min(1, "Mã hiển thị đơn hàng orderCode không được để trống."),
      amount: z
        .number()
        .positive("Số tiền thanh toán phải lớn hơn 0.")
        .finite("Số tiền không hợp lệ.")
        .transform((val) => Number(val.toFixed(2))),
      customerId: z.string().uuid("Mã khách hàng customerId phải là chuỗi UUID hợp lệ.").optional(),
      description: z.string().optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const targetCustomerId = input.customerId || ctx.user.id;
    return getTopupTransactionService().payOrderWithWallet({
      orderId: input.orderId,
      orderCode: input.orderCode,
      amount: input.amount,
      customerId: targetCustomerId,
      actorId: ctx.user.id,
      description: input.description,
    });
  });
