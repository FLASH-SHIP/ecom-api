import { getOrderService } from "@ecom/features/di/containers/OrderService";
import { type Prisma, prisma, ShippingMethod, ShippingOrigin } from "@ecom/prisma";
import { parseDateTimezone } from "@flash-ship/ecom-lib";
import {
  GET_LABEL_OPTION,
  HS_CODE_REGEX,
  isAllowedSenderCountry,
  MAX_DECLARED_WEIGHT_GRAMS,
  MAX_DIMENSION_CM,
  PARCEL_VALIDATION_MESSAGES,
  PHONE_REGEX,
  PHONE_VALIDATION_MESSAGES,
  SENDER_COUNTRY_VALIDATION_MESSAGE,
} from "@flash-ship/ecom-types";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { authedProcedure } from "../../../../trpc";

const shippingMethodSchema = z.nativeEnum(ShippingMethod, {
  message: "Phương thức vận chuyển (Dịch vụ) là bắt buộc, chỉ chấp nhận EXPRESS hoặc EPACKET",
});
const shippingOriginSchema = z.nativeEnum(ShippingOrigin, {
  message: "Kho gửi không hợp lệ, chỉ chấp nhận HAN hoặc SGN",
});
const getLabelSchema = z
  .preprocess((val) => {
    if (val === true || val === 1 || val === "1") return GET_LABEL_OPTION.GET_LABEL_NOW;
    return GET_LABEL_OPTION.GET_LABEL_LATER;
  }, z.number().int())
  .optional();

const importOrderItemSchema = z.object({
  excelRowNumbers: z.array(z.number()),
  shippingMethod: shippingMethodSchema,
  shippingOrigin: shippingOriginSchema,
  sellerOrderId: z
    .string()
    .min(1, { message: "Mã đơn hàng người bán (sellerOrderId) không được để trống" }),

  senderName: z.string().min(1, { message: "Tên người gửi (senderName) không được để trống" }),
  senderAddress: z
    .string()
    .min(1, { message: "Địa chỉ người gửi (senderAddress) không được để trống" }),
  senderPhone: z
    .string()
    .min(1, { message: "Số điện thoại người gửi (senderPhone) không được để trống" })
    .regex(PHONE_REGEX, {
      message: PHONE_VALIDATION_MESSAGES.SENDER,
    }),
  senderEmail: z.string().optional().nullable(),
  senderCountry: z
    .string()
    .min(1, { message: "Quốc gia người gửi (senderCountry) không được để trống" })
    .refine(isAllowedSenderCountry, {
      message: SENDER_COUNTRY_VALIDATION_MESSAGE,
    }),
  senderState: z.string().optional().nullable(),
  senderCity: z.string().optional().nullable(),
  senderWard: z.string().optional().nullable(),
  senderZipCode: z.string().optional().nullable(),

  receiverName: z.string().optional().nullable(),
  receiverPhone: z
    .string()
    .regex(PHONE_REGEX, {
      message: PHONE_VALIDATION_MESSAGES.RECEIVER,
    })
    .or(z.literal(""))
    .optional()
    .nullable(),
  receiverEmail: z
    .string()
    .email({ message: PARCEL_VALIDATION_MESSAGES.EMAIL_RECEIVER_INVALID })
    .or(z.literal(""))
    .optional()
    .nullable(),
  receiverCity: z.string().optional().nullable(),
  receiverState: z.string().optional().nullable(),
  receiverAddress1: z.string().optional().nullable(),
  receiverAddress2: z.string().optional().nullable(),
  receiverCountry: z.string().optional().nullable(),
  receiverZipCode: z.string().or(z.literal("")).optional().nullable(),

  detailDescription: z
    .string()
    .max(200, {
      message: "Mô tả chi tiết hàng hóa (detailDescription) không được vượt quá 200 ký tự",
    })
    .optional()
    .nullable(),
  declaredWeight: z
    .number()
    .int({ message: "Trọng lượng khai báo (declaredWeight) phải là số nguyên dương" })
    .positive({ message: "Trọng lượng khai báo (declaredWeight) phải là số nguyên dương" })
    .max(MAX_DECLARED_WEIGHT_GRAMS, { message: PARCEL_VALIDATION_MESSAGES.WEIGHT_MAX })
    .optional()
    .nullable(),
  dimensionLength: z
    .number()
    .int({ message: "Chiều dài (dimensionLength) phải là số nguyên dương" })
    .positive({ message: "Chiều dài (dimensionLength) phải là số nguyên dương" })
    .max(MAX_DIMENSION_CM, { message: PARCEL_VALIDATION_MESSAGES.LENGTH_MAX })
    .optional()
    .nullable(),
  dimensionWidth: z
    .number()
    .int({ message: "Chiều rộng (dimensionWidth) phải là số nguyên dương" })
    .positive({ message: "Chiều rộng (dimensionWidth) phải là số nguyên dương" })
    .max(MAX_DIMENSION_CM, { message: PARCEL_VALIDATION_MESSAGES.WIDTH_MAX })
    .optional()
    .nullable(),
  dimensionHeight: z
    .number()
    .int({ message: "Chiều cao (dimensionHeight) phải là số nguyên dương" })
    .positive({ message: "Chiều cao (dimensionHeight) phải là số nguyên dương" })
    .max(MAX_DIMENSION_CM, { message: PARCEL_VALIDATION_MESSAGES.HEIGHT_MAX })
    .optional()
    .nullable(),
  declaredValue: z.number().min(0).optional().nullable(),
  packagingCode: z.string().optional().nullable(),
  isGetLabel: getLabelSchema,
  products: z
    .array(
      z.object({
        excelLineNumber: z.number().optional(),
        description: z
          .string()
          .min(1, { message: "Tên sản phẩm (description) không được để trống" })
          .max(200, { message: "Tên sản phẩm (description) không được vượt quá 200 ký tự" }),
        quantity: z
          .number()
          .int({ message: "Số lượng sản phẩm (quantity) phải là số nguyên dương" })
          .positive({ message: "Số lượng sản phẩm (quantity) phải là số nguyên dương" }),
        value: z.number().positive(),
        hsCode: z
          .string()
          .transform((val) => val.replace(/\./g, "").trim())
          .refine((val) => val.length > 0, {
            message: PARCEL_VALIDATION_MESSAGES.HS_CODE_REQUIRED,
          })
          .refine((val) => HS_CODE_REGEX.test(val), {
            message: PARCEL_VALIDATION_MESSAGES.HS_CODE_FORMAT_INVALID,
          }),
        originCountry: z
          .string()
          .min(1, { message: "Xuất xứ sản phẩm (originCountry) không được để trống" }),
        weight: z.number().int().positive().optional().nullable(),
        sku: z.string().optional().nullable(),
      }),
    )
    .optional(),
});

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: High complexity from Zod path mapping and fallback error reason matching
export function formatBatchError(err: unknown, order: Record<string, unknown>) {
  const typedOrder = order as {
    sellerOrderId?: string;
    excelRowNumbers?: number[];
    shippingMethod?: string;
    shippingOrigin?: string;
    senderName?: string;
    senderPhone?: string;
    senderAddress?: string;
    senderCity?: string;
    senderWard?: string;
    senderZipCode?: string;
    senderCountry?: string;
    receiverName?: string;
    receiverPhone?: string;
    receiverEmail?: string;
    receiverAddress1?: string;
    receiverCity?: string;
    receiverState?: string;
    receiverCountry?: string;
    receiverZipCode?: string;
    declaredWeight?: number;
    dimensionLength?: number;
    dimensionWidth?: number;
    dimensionHeight?: number;
    products?: Array<{
      excelLineNumber?: number;
      hsCode?: string;
      originCountry?: string;
      description?: string;
      quantity?: number;
      value?: number;
    }>;
  };

  let errorReason = err instanceof Error ? err.message : String(err);
  let columnName = "Tất cả";
  let enteredValue = String(typedOrder.sellerOrderId ?? "");
  let line = typedOrder.excelRowNumbers?.[0] || 0;

  if (err instanceof z.ZodError && err.issues.length > 0) {
    const firstIssue = err.issues[0];
    if (firstIssue) {
      errorReason = firstIssue.message;
      const pathKey = firstIssue.path[0];
      const productIdx = typeof firstIssue.path[1] === "number" ? firstIssue.path[1] : undefined;
      const productField = productIdx !== undefined ? firstIssue.path[2] : undefined;

      if (pathKey === "shippingMethod") {
        columnName = "Dịch vụ";
        enteredValue = String(typedOrder.shippingMethod ?? "");
      } else if (pathKey === "shippingOrigin") {
        columnName = "Kho gửi";
        enteredValue = String(typedOrder.shippingOrigin ?? "");
      } else if (pathKey === "sellerOrderId") {
        columnName = "Mã đơn Seller";
        enteredValue = String(typedOrder.sellerOrderId ?? "");
      } else if (pathKey === "senderName") {
        columnName = "Tên người gửi";
        enteredValue = String(typedOrder.senderName ?? "");
      } else if (pathKey === "senderPhone") {
        columnName = "SĐT gửi";
        enteredValue = String(typedOrder.senderPhone ?? "");
      } else if (pathKey === "senderAddress") {
        columnName = "Địa chỉ gửi";
        enteredValue = String(typedOrder.senderAddress ?? "");
      } else if (pathKey === "senderCity") {
        columnName = "Thành phố gửi";
        enteredValue = String(typedOrder.senderCity ?? "");
      } else if (pathKey === "senderWard") {
        columnName = "Phường/Xã gửi";
        enteredValue = String(typedOrder.senderWard ?? "");
      } else if (pathKey === "senderZipCode") {
        columnName = "Zip người gửi";
        enteredValue = String(typedOrder.senderZipCode ?? "");
      } else if (pathKey === "senderCountry") {
        columnName = "Quốc gia gửi";
        enteredValue = String(typedOrder.senderCountry ?? "");
      } else if (pathKey === "receiverName") {
        columnName = "Họ tên người nhận";
        enteredValue = String(typedOrder.receiverName ?? "");
      } else if (pathKey === "receiverPhone") {
        columnName = "SĐT nhận";
        enteredValue = String(typedOrder.receiverPhone ?? "");
      } else if (pathKey === "receiverEmail") {
        columnName = "Email nhận";
        enteredValue = String(typedOrder.receiverEmail ?? "");
      } else if (pathKey === "receiverAddress1") {
        columnName = "Địa chỉ nhận 1";
        enteredValue = String(typedOrder.receiverAddress1 ?? "");
      } else if (pathKey === "receiverCity") {
        columnName = "Thành phố nhận";
        enteredValue = String(typedOrder.receiverCity ?? "");
      } else if (pathKey === "receiverState") {
        columnName = "Bang/Tỉnh nhận";
        enteredValue = String(typedOrder.receiverState ?? "");
      } else if (pathKey === "receiverCountry") {
        columnName = "Quốc gia nhận";
        enteredValue = String(typedOrder.receiverCountry ?? "");
      } else if (pathKey === "receiverZipCode") {
        columnName = "Zip người nhận";
        enteredValue = String(typedOrder.receiverZipCode ?? "");
      } else if (pathKey === "declaredWeight") {
        columnName = "Cân nặng kiện hàng";
        enteredValue = String(typedOrder.declaredWeight ?? "");
      } else if (pathKey === "dimensionLength") {
        columnName = "Chiều dài kiện hàng";
        enteredValue = String(typedOrder.dimensionLength ?? "");
      } else if (pathKey === "dimensionWidth") {
        columnName = "Chiều rộng kiện hàng";
        enteredValue = String(typedOrder.dimensionWidth ?? "");
      } else if (pathKey === "dimensionHeight") {
        columnName = "Chiều cao kiện hàng";
        enteredValue = String(typedOrder.dimensionHeight ?? "");
      } else if (pathKey === "products" && productIdx !== undefined) {
        const prod = typedOrder.products?.[productIdx];
        if (prod?.excelLineNumber) {
          line = prod.excelLineNumber;
        }
        if (productField === "hsCode") {
          columnName = "Mã HS Code SP";
          enteredValue = String(prod?.hsCode ?? "");
        } else if (productField === "originCountry") {
          columnName = "Xuất xứ SP";
          enteredValue = String(prod?.originCountry ?? "");
        } else if (productField === "description") {
          columnName = "Sản phẩm chi tiết";
          enteredValue = String(prod?.description ?? "");
        } else if (productField === "quantity") {
          columnName = "Số lượng";
          enteredValue = String(prod?.quantity ?? "");
        } else if (productField === "value") {
          columnName = "Đơn giá";
          enteredValue = String(prod?.value ?? "");
        }
      }
    }
  } else {
    if (errorReason.includes("shippingMethod") || errorReason.includes("Dịch vụ")) {
      columnName = "Dịch vụ";
      enteredValue = String(typedOrder.shippingMethod ?? "");
    } else if (errorReason.includes("shippingOrigin") || errorReason.includes("Kho gửi")) {
      columnName = "Kho gửi";
      enteredValue = String(typedOrder.shippingOrigin ?? "");
    } else if (errorReason.includes("sellerOrderId") || errorReason.includes("đã tồn tại")) {
      columnName = "Mã đơn Seller";
      enteredValue = String(typedOrder.sellerOrderId ?? "");
    } else if (errorReason.includes("senderName") || errorReason.includes("Tên người gửi")) {
      columnName = "Tên người gửi";
      enteredValue = String(typedOrder.senderName ?? "");
    } else if (errorReason.includes("senderPhone") || errorReason.includes("SĐT gửi")) {
      columnName = "SĐT gửi";
      enteredValue = String(typedOrder.senderPhone ?? "");
    } else if (errorReason.includes("senderAddress") || errorReason.includes("Địa chỉ gửi")) {
      columnName = "Địa chỉ gửi";
      enteredValue = String(typedOrder.senderAddress ?? "");
    } else if (errorReason.includes("senderCity") || errorReason.includes("Thành phố gửi")) {
      columnName = "Thành phố gửi";
      enteredValue = String(typedOrder.senderCity ?? "");
    } else if (errorReason.includes("senderWard") || errorReason.includes("Phường/Xã gửi") || errorReason.includes("senderWard")) {
      columnName = "Phường/Xã gửi";
      enteredValue = String(typedOrder.senderWard ?? "");
    } else if (errorReason.includes("senderZipCode") || errorReason.includes("Zip người gửi")) {
      columnName = "Zip người gửi";
      enteredValue = String(typedOrder.senderZipCode ?? "");
    } else if (errorReason.includes("senderCountry") || errorReason.includes("Quốc gia gửi")) {
      columnName = "Quốc gia gửi";
      enteredValue = String(typedOrder.senderCountry ?? "");
    } else if (errorReason.includes("receiverPhone") || errorReason.includes("SĐT nhận") || errorReason.includes("Số điện thoại người nhận")) {
      columnName = "SĐT nhận";
      enteredValue = String(typedOrder.receiverPhone ?? "");
    } else if (errorReason.includes("receiverName") || errorReason.includes("Họ tên người nhận")) {
      columnName = "Họ tên người nhận";
      enteredValue = String(typedOrder.receiverName ?? "");
    } else if (errorReason.includes("receiverEmail") || errorReason.includes("Email nhận")) {
      columnName = "Email nhận";
      enteredValue = String(typedOrder.receiverEmail ?? "");
    } else if (errorReason.includes("receiverAddress1") || errorReason.includes("Địa chỉ nhận")) {
      columnName = "Địa chỉ nhận 1";
      enteredValue = String(typedOrder.receiverAddress1 ?? "");
    } else if (errorReason.includes("receiverCity") || errorReason.includes("Thành phố nhận")) {
      columnName = "Thành phố nhận";
      enteredValue = String(typedOrder.receiverCity ?? "");
    } else if (errorReason.includes("receiverState") || errorReason.includes("Bang/Tỉnh nhận")) {
      columnName = "Bang/Tỉnh nhận";
      enteredValue = String(typedOrder.receiverState ?? "");
    } else if (errorReason.includes("receiverCountry") || errorReason.includes("Quốc gia nhận")) {
      columnName = "Quốc gia nhận";
      enteredValue = String(typedOrder.receiverCountry ?? "");
    } else if (errorReason.includes("receiverZipCode") || errorReason.includes("Mã bưu chính")) {
      columnName = "Zip người nhận";
      enteredValue = String(typedOrder.receiverZipCode ?? "");
    } else if (errorReason.includes("dimensionLength") || errorReason.includes("Chiều dài")) {
      columnName = "Chiều dài kiện hàng";
      enteredValue = String(typedOrder.dimensionLength ?? "");
    } else if (errorReason.includes("dimensionWidth") || errorReason.includes("Chiều rộng")) {
      columnName = "Chiều rộng kiện hàng";
      enteredValue = String(typedOrder.dimensionWidth ?? "");
    } else if (errorReason.includes("dimensionHeight") || errorReason.includes("Chiều cao")) {
      columnName = "Chiều cao kiện hàng";
      enteredValue = String(typedOrder.dimensionHeight ?? "");
    } else if (errorReason.includes("declaredWeight") || errorReason.includes("Trọng lượng") || errorReason.includes("Cân nặng")) {
      columnName = "Cân nặng kiện hàng";
      enteredValue = String(typedOrder.declaredWeight ?? "");
    } else if (errorReason.includes("hsCode") || errorReason.includes("HS Code")) {
      columnName = "Mã HS Code SP";
      enteredValue = String(typedOrder.products?.[0]?.hsCode ?? "");
    } else if (errorReason.includes("originCountry") || errorReason.includes("Xuất xứ")) {
      columnName = "Xuất xứ SP";
      enteredValue = String(typedOrder.products?.[0]?.originCountry ?? "");
    } else if (errorReason.includes("Bảng giá") || errorReason.includes("RateCard")) {
      columnName = "Dịch vụ";
      enteredValue = `${typedOrder.shippingMethod} - ${typedOrder.receiverCountry}`;
    }
  }

  return { line, columnName, enteredValue, errorReason };
}

// 1. Khởi tạo phiên Import
export const createImportSession = authedProcedure
  .input(
    z.object({
      fileName: z.string().min(1),
      fileSize: z.number().int().positive().optional().nullable(),
      totalRows: z.number().int().nonnegative(),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    return await prisma.orderImport.create({
      data: {
        customerId: ctx.user.id,
        fileName: input.fileName,
        fileSize: input.fileSize,
        totalRows: input.totalRows,
        successRows: 0,
        failedRows: 0,
        status: "processing",
        errors: [],
      },
      select: {
        id: true,
      },
    });
  });

// 2. Nhập đơn hàng theo từng lô (Batch Processing)
export const importBatch = authedProcedure
  .input(
    z.object({
      importId: z.string().min(1),
      batchIndex: z.number().int().nonnegative(),
      orders: z.array(importOrderItemSchema),
    }),
  )
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: High cognitive complexity from batch import error handling and label purchase
  .mutation(async ({ input, ctx }) => {
    const service = getOrderService();
    const batchErrors: Array<{
      line: number;
      columnName: string;
      enteredValue: string;
      errorReason: string;
    }> = [];
    let successCount = 0;

    for (const order of input.orders) {
      try {
        const createdOrder = await service.createOrder({
          ...order,
          senderName: order.senderName ?? "",
          senderPhone: order.senderPhone ?? "",
          senderAddress: order.senderAddress ?? "",
          senderCity: order.senderCity ?? "",
          senderWard: order.senderWard ?? "",
          senderZipCode: order.senderZipCode ?? "",
          senderCountry: order.senderCountry ?? "",
          receiverName: order.receiverName ?? "",
          receiverAddress1: order.receiverAddress1 ?? "",
          receiverCity: order.receiverCity ?? "",
          receiverState: order.receiverState ?? "",
          receiverCountry: order.receiverCountry ?? "",
          declaredWeight: order.declaredWeight ?? 0,
          dimensionLength: order.dimensionLength ?? 0,
          dimensionWidth: order.dimensionWidth ?? 0,
          dimensionHeight: order.dimensionHeight ?? 0,
          importId: input.importId,
          customerId: ctx.user.id,
        });
        successCount++;

        if (order.isGetLabel === GET_LABEL_OPTION.GET_LABEL_NOW) {
          try {
            const { queueBulkLabelPurchase } = await import(
              "@ecom/features/queue/workers/bulkLabelWorker"
            );
            await queueBulkLabelPurchase({
              orderId: createdOrder.id,
              customerId: ctx.user.id,
              batchId: input.importId,
            });
          } catch (labelErr) {
            console.warn(
              `[ImportBatch] Queue label purchase dispatch failed for imported order #${createdOrder.orderCode}:`,
              labelErr,
            );
          }
        }
      } catch (err) {
        batchErrors.push(formatBatchError(err, order));
      }
    }

    return {
      successCount,
      failedCount: input.orders.length - successCount,
      errors: batchErrors,
    };
  });

// 3. Hoàn tất phiên Import và lưu toàn bộ lỗi xuống DB đúng 1 lần duy nhất
export const completeImportSession = authedProcedure
  .input(
    z.object({
      importId: z.string().min(1),
      successRows: z.number().int().nonnegative(),
      failedRows: z.number().int().nonnegative(),
      errors: z.array(
        z.object({
          line: z.number(),
          columnName: z.string(),
          enteredValue: z.string(),
          errorReason: z.string(),
        }),
      ),
      status: z.enum(["completed", "failed"]).optional(),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    const session = await prisma.orderImport.findUnique({
      where: { id: input.importId },
      select: { customerId: true },
    });

    if (!session || session.customerId !== ctx.user.id) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Phiên import không tồn tại hoặc bạn không có quyền truy cập.",
      });
    }

    const finalStatus = input.status || (input.successRows > 0 ? "completed" : "failed");

    return await prisma.orderImport.update({
      where: { id: input.importId },
      data: {
        successRows: input.successRows,
        failedRows: input.failedRows,
        status: finalStatus,
        errors: input.errors as Prisma.InputJsonValue,
      },
      select: {
        id: true,
        status: true,
      },
    });
  });

// 4. Lấy danh sách lịch sử import (Bỏ qua cột errors để tránh nghẽn băng thông mạng)
export const listImportSessions = authedProcedure
  .input(
    z.object({
      page: z.number().int().positive().default(1),
      perPage: z.number().int().positive().max(100).default(20),
      search: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      timezoneOffset: z.string().optional(),
    }),
  )
  .query(async ({ input, ctx }) => {
    const skip = (input.page - 1) * input.perPage;

    const where: Prisma.OrderImportWhereInput = {
      customerId: ctx.user.id,
    };

    const andConditions: Prisma.OrderImportWhereInput[] = [];

    if (input.search) {
      const searchLower = input.search.trim();
      andConditions.push({
        OR: [
          { fileName: { contains: searchLower, mode: "insensitive" } },
          {
            orders: {
              some: {
                OR: [
                  { receiverName: { contains: searchLower, mode: "insensitive" } },
                  { receiverEmail: { contains: searchLower, mode: "insensitive" } },
                  { receiverPhone: { contains: searchLower, mode: "insensitive" } },
                  { sellerOrderId: { contains: searchLower, mode: "insensitive" } },
                ],
              },
            },
          },
        ],
      });
    }

    if (input.startDate) {
      const start = parseDateTimezone(input.startDate, false, input.timezoneOffset);
      andConditions.push({
        createdAt: { gte: start },
      });
    }

    if (input.endDate) {
      const end = parseDateTimezone(input.endDate, true, input.timezoneOffset);
      andConditions.push({
        createdAt: { lte: end },
      });
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    const [total, items] = await Promise.all([
      prisma.orderImport.count({
        where,
      }),
      prisma.orderImport.findMany({
        where,
        select: {
          id: true,
          fileName: true,
          fileSize: true,
          totalRows: true,
          successRows: true,
          failedRows: true,
          status: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: input.perPage,
      }),
    ]);

    return {
      total,
      items,
      page: input.page,
      perPage: input.perPage,
    };
  });

// 5. Truy vấn chi tiết một phiên import bao gồm toàn bộ lỗi
export const getImportSessionDetail = authedProcedure
  .input(z.object({ id: z.string().min(1) }))
  .query(async ({ input, ctx }) => {
    const session = await prisma.orderImport.findUnique({
      where: { id: input.id },
      select: {
        id: true,
        fileName: true,
        fileSize: true,
        totalRows: true,
        successRows: true,
        failedRows: true,
        status: true,
        errors: true,
        createdAt: true,
        customerId: true,
      },
    });

    if (!session || session.customerId !== ctx.user.id) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Phiên import không tồn tại hoặc bạn không có quyền truy cập.",
      });
    }

    return session;
  });
