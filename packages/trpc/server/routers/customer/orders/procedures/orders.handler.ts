import { getOrderRepository, getOrderService } from "@ecom/features/di/containers/OrderService";
import { getPackingService } from "@ecom/features/di/containers/PackingService";
import type {
  Customer,
  Order,
  OrderActivityLog,
  OrderProduct,
  OrderTrackingCheckpoint,
} from "@ecom/prisma";
import {
  ContentStatus,
  OrderStatus,
  type Prisma,
  ShippingMethod,
  ShippingOrigin,
} from "@ecom/prisma";
import {
  validatePostalCode,
  validateReceiverEmail,
  validateReceiverName,
  validateReceiverPhone,
  validateReceiverState,
} from "@flash-ship/ecom-lib";
import { RedisCache } from "@flash-ship/ecom-lib/redis";
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
const orderStatusSchema = z.nativeEnum(OrderStatus);

export interface CachedOrder
  extends Omit<
    Order,
    | "declaredWeight"
    | "baseShippingFee"
    | "surchargeFee"
    | "totalFee"
    | "actualWeight"
    | "volumeWeight"
    | "chargeableWeight"
  > {
  declaredWeight: Prisma.Decimal | number | string;
  baseShippingFee: Prisma.Decimal | number | string;
  surchargeFee: Prisma.Decimal | number | string;
  totalFee: Prisma.Decimal | number | string;
  actualWeight: Prisma.Decimal | number | string | null;
  volumeWeight: Prisma.Decimal | number | string | null;
  chargeableWeight: Prisma.Decimal | number | string | null;
  activityLogs: Omit<OrderActivityLog, "orderId">[];
  trackingCheckpoints: Omit<OrderTrackingCheckpoint, "orderId">[];
  customer: Pick<Customer, "name" | "email" | "username" | "phone">;
  products?: Omit<OrderProduct, "orderId">[];
}

const orderCache = new RedisCache<CachedOrder>("order-details", 300); // 5-minute cache TTL

function restoreLogDates(logs?: Omit<OrderActivityLog, "orderId">[]) {
  if (!logs) return;
  for (const log of logs) {
    if (log.createdAt) log.createdAt = new Date(log.createdAt);
  }
}

function restoreCheckpointDates(cps?: Omit<OrderTrackingCheckpoint, "orderId">[]) {
  if (!cps) return;
  for (const cp of cps) {
    if (cp.checkpointDate) cp.checkpointDate = new Date(cp.checkpointDate);
    if (cp.createdAt) cp.createdAt = new Date(cp.createdAt);
  }
}

function restoreProductDates(products?: Omit<OrderProduct, "orderId">[]) {
  if (!products) return;
  for (const p of products) {
    if (p.createdAt) p.createdAt = new Date(p.createdAt);
    if (p.updatedAt) p.updatedAt = new Date(p.updatedAt);
  }
}

function restoreOrderDates(order?: CachedOrder): CachedOrder | undefined {
  if (!order) return order;
  if (order.createdAt) order.createdAt = new Date(order.createdAt);
  if (order.updatedAt) order.updatedAt = new Date(order.updatedAt);
  restoreLogDates(order.activityLogs);
  restoreCheckpointDates(order.trackingCheckpoints);
  restoreProductDates(order.products);
  return order;
}

// 1. Calculate freight
export const calculateFreight = authedProcedure
  .input(
    z.object({
      shippingMethod: shippingMethodSchema,
      country: z.string().min(2).max(10),
      declaredWeight: z.number().positive(),
      dimensionLength: z.number().positive().optional().nullable(),
      dimensionWidth: z.number().positive().optional().nullable(),
      dimensionHeight: z.number().positive().optional().nullable(),
      origin: z.string().optional().nullable(),
    }),
  )
  .query(async ({ input, ctx }) => {
    const service = getOrderService();
    return await service.calculateOrderFreight({
      ...input,
      customerId: ctx.user.id,
    });
  });

// 2. Create order
export const create = authedProcedure
  .input(
    z
      .object({
        shippingMethod: shippingMethodSchema,
        shippingOrigin: shippingOriginSchema,
        sellerOrderId: z.string().min(1, { message: "Mã đơn hàng người bán (sellerOrderId) không được để trống" }),
        importId: z.string().optional().nullable(),

        senderName: z.string().min(1, { message: "Tên người gửi (senderName) không được để trống" }),
        senderAddress: z.string().min(1, { message: "Địa chỉ người gửi (senderAddress) không được để trống" }),
        senderPhone: z
          .string()
          .min(1, { message: "Số điện thoại người gửi (senderPhone) không được để trống" })
          .regex(PHONE_REGEX, {
            message: PHONE_VALIDATION_MESSAGES.SENDER,
          }),
        senderEmail: z.string().email({ message: PARCEL_VALIDATION_MESSAGES.EMAIL_SENDER_INVALID }).or(z.literal("")).optional().nullable(),
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

        receiverName: z.string().min(1).max(100),
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
        receiverAddress1: z.string().min(1).max(150),
        receiverAddress2: z.string().optional().nullable(),
        receiverCountry: z.string().min(2).max(10),
        receiverZipCode: z.string().min(1),

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
        packingTypeId: z.number().int().positive().optional().nullable(),
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
      })
      .superRefine((data, ctx) => {
        const nameVal = validateReceiverName(data.receiverName);
        if (!nameVal.valid) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["receiverName"],
            message: nameVal.message,
          });
        }
        const phoneVal = validateReceiverPhone(data.receiverPhone);
        if (!phoneVal.valid) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["receiverPhone"],
            message: phoneVal.message,
          });
        }
        const emailVal = validateReceiverEmail(data.receiverEmail);
        if (!emailVal.valid) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["receiverEmail"],
            message: emailVal.message,
          });
        }
        if (data.receiverAddress1.length > 150) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["receiverAddress1"],
            message: "Địa chỉ 1 không được vượt quá 150 ký tự",
          });
        }
        if (data.receiverAddress2 && data.receiverAddress2.length > 150) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["receiverAddress2"],
            message: "Địa chỉ 2 không được vượt quá 150 ký tự",
          });
        }
        const stateVal = validateReceiverState(data.receiverCountry, data.receiverState);
        if (!stateVal.valid) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["receiverState"],
            message: stateVal.message,
          });
        }
        if (!validatePostalCode(data.receiverCountry, data.receiverZipCode)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["receiverZipCode"],
            message: `Mã Postcode/Zipcode không đúng định dạng cho quốc gia ${data.receiverCountry}`,
          });
        }
      }),
  )
  .mutation(async ({ input, ctx }) => {
    const service = getOrderService();

    // Snapshot packing type name if packingTypeId is provided
    let packagingCode: string | null = null;
    if (input.packingTypeId) {
      const packingService = getPackingService();
      const pt = await packingService.getPackingType(input.packingTypeId);
      packagingCode = pt.name;
    }

    return await service.createOrder({
      ...input,
      customerId: ctx.user.id,
      packagingCode,
    });
  });

// 3. List paginated customer orders
export const list = authedProcedure
  .input(
    z
      .object({
        search: z.string().optional(),
        status: z.union([orderStatusSchema, z.array(orderStatusSchema)]).optional(),
        fromDate: z.string().optional(),
        toDate: z.string().optional(),
        shippingMethod: z.enum(["EPACKET", "EXPRESS"]).optional(),
        page: z.number().int().positive().default(1),
        perPage: z.number().int().positive().max(100).default(20),
        sortBy: z.enum(["id", "createdAt", "orderCode", "status"]).default("createdAt"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
      })
      .optional(),
  )
  .query(async ({ input, ctx }) => {
    const repo = getOrderRepository();
    return await repo.findMany({
      ...(input ?? {}),
      customerId: ctx.user.id,
    });
  });

// 4. Get secure single customer order details
export const get = authedProcedure
  .input(z.object({ id: z.string().min(1) }))
  .query(async ({ input, ctx }) => {
    // Try cache first
    const cached = await orderCache.get(input.id);
    if (cached && cached.customerId === ctx.user.id) {
      return restoreOrderDates(cached);
    }

    const repo = getOrderRepository();
    const order = await repo.findById(input.id);
    if (!order || order.customerId !== ctx.user.id) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Đơn hàng không tồn tại",
      });
    }

    const [activityLogs, trackingCheckpoints] = await Promise.all([
      repo.findActivityLogs(order.id),
      repo.findTrackingCheckpoints(order.id),
    ]);

    const result = {
      ...order,
      activityLogs,
      trackingCheckpoints,
    };

    // Cache the result
    await orderCache.set(input.id, result);

    return result;
  });

import { format } from "date-fns";
import ExcelJS from "exceljs";

function getOrderStatusTxt(status: OrderStatus): string {
  switch (status) {
    case OrderStatus.LABEL_CREATED:
      return "Label Created";
    case OrderStatus.PENDING_LABEL:
      return "Pending Label";
    case OrderStatus.PACKAGE_RECEIVED:
      return "Package Received";
    case OrderStatus.ON_THE_WAY:
      return "On the Way";
    case OrderStatus.PICK_UP:
      return "Pick Up";
    case OrderStatus.DELIVERY:
      return "Delivery";
    default:
      return String(status);
  }
}

function getShippingMethodTxt(method?: string | null): string {
  if (!method) return "";
  if (method === "EPACKET") return "ePacket";
  if (method === "EXPRESS") return "Express";
  return method;
}

export const listPackingTypes = authedProcedure
  .input(
    z
      .object({
        search: z.string().optional(),
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(50),
      })
      .optional(),
  )
  .query(async ({ input }) => {
    return getPackingService().listPackingTypes({
      ...input,
      status: ContentStatus.PUBLISHED,
    });
  });

export const exportExcel = authedProcedure
  .input(
    z
      .object({
        search: z.string().optional(),
        status: z.union([orderStatusSchema, z.array(orderStatusSchema)]).optional(),
        fromDate: z.string().optional(),
        toDate: z.string().optional(),
        shippingMethod: z.enum(["EPACKET", "EXPRESS"]).optional(),
        page: z.number().int().positive().default(1),
        perPage: z.number().int().positive().max(100).default(20),
        sortBy: z.enum(["id", "createdAt", "orderCode", "status"]).default("createdAt"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
      })
      .optional(),
  )
  .mutation(async ({ input, ctx }) => {
    const repo = getOrderRepository();
    // Security check: Query records belonging ONLY to the authenticated customer
    const result = await repo.findMany({
      ...(input ?? {}),
      customerId: ctx.user.id,
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Orders");

    worksheet.columns = [
      { header: "Time", key: "time", width: 18 },
      { header: "Reception", key: "reception", width: 55 },
      { header: "Status", key: "status", width: 18 },
      { header: "Order ID", key: "orderId", width: 22 },
      { header: "Fee", key: "fee", width: 14 },
      { header: "Shipping Methods", key: "shippingMethod", width: 22 },
      { header: "Tracking number", key: "trackingNumber", width: 24 },
    ];

    const thinBorder: Partial<ExcelJS.Borders> = {
      top: { style: "thin", color: { argb: "FFD3D3D3" } },
      left: { style: "thin", color: { argb: "FFD3D3D3" } },
      bottom: { style: "thin", color: { argb: "FFD3D3D3" } },
      right: { style: "thin", color: { argb: "FFD3D3D3" } },
    };

    const headerRow = worksheet.getRow(1);
    headerRow.height = 22;

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
        size: 12,
        name: "Calibri",
      };
      cell.border = thinBorder;
    });

    result.data.forEach((order) => {
      const timeFormatted = order.createdAt
        ? format(new Date(order.createdAt), "dd/MM/yyyy HH:mm")
        : "";

      const line1 = order.receiverName || "";
      const line2 = order.receiverPhone || "";
      const line3 = [
        order.receiverAddress1,
        order.receiverCity,
        order.receiverState,
        order.receiverZipCode,
        order.receiverCountry,
      ]
        .filter(Boolean)
        .join(", ");

      const receptionStr = [line1, line2, line3].filter(Boolean).join("\n");

      const totalFeeNum = Number(order.baseShippingFee || 0) + Number(order.surchargeFee || 0);
      const feeStr = `$${totalFeeNum.toFixed(2)}`;

      const row = worksheet.addRow({
        time: timeFormatted,
        reception: receptionStr,
        status: getOrderStatusTxt(order.status),
        orderId: order.orderCode || "",
        fee: feeStr,
        shippingMethod: getShippingMethodTxt(order.shippingMethod),
        trackingNumber: order.ecomTrackingNumber || "",
      });

      row.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
      row.font = { size: 12, name: "Calibri" };
      row.eachCell((cell) => {
        cell.border = thinBorder;
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const fileName = `Orders_Export_${format(new Date(), "yyyyMMdd_HHmmss")}.xlsx`;

    return {
      filename: fileName,
      fileData: base64,
    };
  });
