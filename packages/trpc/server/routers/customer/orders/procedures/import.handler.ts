import { getOrderService } from "@ecom/features/di/containers/OrderService";
import { type Prisma, prisma, ShippingMethod, ShippingOrigin } from "@ecom/prisma";
import { parseDateTimezone } from "@flash-ship/ecom-lib";
import {
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

const shippingMethodSchema = z.nativeEnum(ShippingMethod);
const shippingOriginSchema = z.nativeEnum(ShippingOrigin);

const importOrderItemSchema = z.object({
  excelRowNumbers: z.array(z.number()),
  shippingMethod: shippingMethodSchema,
  shippingOrigin: shippingOriginSchema,
  sellerOrderId: z.string().min(1, { message: "Mã đơn hàng người bán (sellerOrderId) không được để trống" }),

  senderName: z.string().min(1, { message: "Tên người gửi (senderName) không được để trống" }),
  senderAddress: z.string().min(1, { message: "Địa chỉ người gửi (senderAddress) không được để trống" }),
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
  senderCity: z.string().min(1, { message: "Thành phố người gửi (senderCity) không được để trống" }),
  senderWard: z.string().min(1, { message: "Phường/Xã người gửi (senderWard) không được để trống" }),
  senderZipCode: z.string().min(1, { message: "Mã bưu chính người gửi (senderZipCode) không được để trống" }),

  receiverName: z.string().min(1),
  receiverPhone: z
    .string()
    .regex(PHONE_REGEX, {
      message: PHONE_VALIDATION_MESSAGES.RECEIVER,
    })
    .or(z.literal(""))
    .optional()
    .nullable(),
  receiverEmail: z.string().email({ message: PARCEL_VALIDATION_MESSAGES.EMAIL_RECEIVER_INVALID }).or(z.literal("")).optional().nullable(),
  receiverCity: z.string().min(1),
  receiverState: z.string().min(1),
  receiverAddress1: z.string().min(1),
  receiverAddress2: z.string().optional().nullable(),
  receiverCountry: z.string().min(2).max(10),
  receiverZipCode: z.string().or(z.literal("")).optional().nullable(),

  detailDescription: z
    .string()
    .max(200, { message: "Mô tả chi tiết hàng hóa (detailDescription) không được vượt quá 200 ký tự" })
    .optional()
    .nullable(),
  declaredWeight: z
    .number()
    .int({ message: "Trọng lượng khai báo (declaredWeight) phải là số nguyên dương" })
    .positive({ message: "Trọng lượng khai báo (declaredWeight) phải là số nguyên dương" })
    .max(MAX_DECLARED_WEIGHT_GRAMS, { message: PARCEL_VALIDATION_MESSAGES.WEIGHT_MAX }),
  dimensionLength: z
    .number()
    .int({ message: "Chiều dài (dimensionLength) phải là số nguyên dương" })
    .positive({ message: "Chiều dài (dimensionLength) phải là số nguyên dương" })
    .max(MAX_DIMENSION_CM, { message: PARCEL_VALIDATION_MESSAGES.LENGTH_MAX }),
  dimensionWidth: z
    .number()
    .int({ message: "Chiều rộng (dimensionWidth) phải là số nguyên dương" })
    .positive({ message: "Chiều rộng (dimensionWidth) phải là số nguyên dương" })
    .max(MAX_DIMENSION_CM, { message: PARCEL_VALIDATION_MESSAGES.WIDTH_MAX }),
  dimensionHeight: z
    .number()
    .int({ message: "Chiều cao (dimensionHeight) phải là số nguyên dương" })
    .positive({ message: "Chiều cao (dimensionHeight) phải là số nguyên dương" })
    .max(MAX_DIMENSION_CM, { message: PARCEL_VALIDATION_MESSAGES.HEIGHT_MAX }),
  declaredValue: z.number().min(0).optional().nullable(),
  packagingCode: z.string().optional().nullable(),
  isGetLabel: z.number().int().optional(),
  products: z
    .array(
      z.object({
        description: z
          .string()
          .min(1, { message: "Tên sản phẩm (description) không được để trống" })
          .max(200, { message: "Tên sản phẩm (description) không được vượt quá 200 ký tự" }),
        quantity: z
          .number()
          .int({ message: "Số lượng sản phẩm (quantity) phải là số nguyên dương" })
          .positive({ message: "Số lượng sản phẩm (quantity) phải là số nguyên dương" }),
        value: z.number().positive(),
        hsCode: z.string().optional().nullable(),
        originCountry: z.string().min(1, { message: "Xuất xứ sản phẩm (originCountry) không được để trống" }),
        weight: z.number().int().positive().optional().nullable(),
        sku: z.string().optional().nullable(),
      }),
    )
    .optional(),
});

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
        await service.createOrder({
          ...order,
          importId: input.importId,
          customerId: ctx.user.id,
        });
        successCount++;
      } catch (err) {
        const errorReason = err instanceof Error ? err.message : String(err);
        const firstLine = order.excelRowNumbers[0] || 0;

        let columnName = "General";
        const enteredValue = order.sellerOrderId || "";
        if (errorReason.includes("đã tồn tại")) {
          columnName = "Seller Order ID";
        }

        batchErrors.push({
          line: firstLine,
          columnName,
          enteredValue,
          errorReason,
        });
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
