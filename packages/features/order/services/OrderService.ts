import { eventBus } from "@ecom/features/events/EventBus";
import type { RateCardService } from "@ecom/features/rate-card/services/RateCardService";
import {
  type ActorType,
  LabelStatus,
  OrderStatus,
  prisma,
  runInTransaction,
  type ShippingMethod,
  type ShippingOrigin,
} from "@ecom/prisma";
import { formatPostalCode, isAsciiLatinOnly, isNoZipcodeCountry, validatePostalCode } from "@flash-ship/ecom-lib";
import { ErrorCode } from "@flash-ship/ecom-lib/errorCodes";
import { ErrorWithCode } from "@flash-ship/ecom-lib/errors";
import {
  isAllowedSenderCountry,
  MAX_DECLARED_WEIGHT_GRAMS,
  MAX_DIMENSION_CM,
  PARCEL_VALIDATION_MESSAGES,
  PHONE_REGEX,
  PHONE_VALIDATION_MESSAGES,
  SENDER_COUNTRY_VALIDATION_MESSAGE,
} from "@flash-ship/ecom-types";
import {
  mapToCustomerOrderDetailResponse,
  mapToCustomerOrderSummaryResponse,
} from "../mappers/CustomerOrderMapper";
import type { CreateOrderInput, OrderRepository } from "../repositories/OrderRepository";

export interface IOrderServiceDeps {
  orderRepo: OrderRepository;
  rateCardService: RateCardService;
  orderCodePrefix?: string;
}

export interface CalculateOrderFreightParams {
  customerId: string;
  shippingMethod: ShippingMethod;
  country: string;
  declaredWeight: number; // in grams
  dimensionLength?: number | null;
  dimensionWidth?: number | null;
  dimensionHeight?: number | null;
  origin?: string | null;
}

export interface CreateOrderParams {
  customerId: string;
  shippingMethod: ShippingMethod;
  shippingOrigin: ShippingOrigin;
  sellerOrderId?: string | null;
  importId?: string | null;

  // Sender info
  senderName: string;
  senderPhone: string;
  senderAddress: string;
  senderEmail?: string | null;
  senderCountry: string;
  senderState?: string | null;
  senderCity: string;
  senderWard: string;
  senderZipCode: string;

  // Receiver info
  receiverName: string;
  receiverPhone?: string | null;
  receiverEmail?: string | null;
  receiverCity: string;
  receiverState: string;
  receiverAddress1: string;
  receiverAddress2?: string | null;
  receiverCountry: string;
  receiverZipCode?: string | null;

  // Cargo info
  detailDescription?: string | null;
  declaredWeight: number; // in grams
  dimensionLength: number;
  dimensionWidth: number;
  dimensionHeight: number;
  declaredValue?: number | null;
  packingTypeId?: number | null;
  packagingCode?: string | null;
  isGetLabel?: number;
  products?: {
    description: string;
    quantity: number;
    value: number;
    hsCode?: string | null;
    originCountry?: string | null;
    weight?: number | null;
    sku?: string | null;
  }[];
}

export class OrderService {
  private deps: IOrderServiceDeps;

  constructor(deps: IOrderServiceDeps) {
    this.deps = deps;
  }

  private async resolveActorInfo(actorType: ActorType, idOrEmail: string) {
    if (actorType === "CUSTOMER") {
      const customer = await prisma.customer.findUnique({
        where: { id: idOrEmail },
        select: { name: true, username: true, email: true },
      });
      if (customer) {
        return {
          actorId: idOrEmail,
          actorName: customer.name || customer.username,
          actorUsername: customer.username,
          actorEmail: customer.email,
        };
      }
      return {
        actorId: idOrEmail,
        actorName: `Customer #${idOrEmail}`,
        actorUsername: `customer_${idOrEmail}`,
        actorEmail: null,
      };
    }

    if (actorType === "OPERATOR") {
      const isEmail = idOrEmail.includes("@");
      const user = await prisma.user.findFirst({
        where: isEmail ? { email: idOrEmail } : { id: idOrEmail },
        select: { id: true, name: true, username: true, email: true },
      });
      if (user) {
        return {
          actorId: user.id.toString(),
          actorName: user.name || user.username || "Operator",
          actorUsername: user.username || idOrEmail,
          actorEmail: user.email,
        };
      }
      return {
        actorId: idOrEmail,
        actorName: idOrEmail,
        actorUsername: idOrEmail,
        actorEmail: isEmail ? idOrEmail : null,
      };
    }

    return {
      actorId: "system",
      actorName: "Hệ thống",
      actorUsername: "system",
      actorEmail: null,
    };
  }

  /**
   * Helper to format double-digit numbers for dates.
   */
  private padZero(num: number): string {
    return num < 10 ? `0${num}` : `${num}`;
  }

  /**
   * Generates a unique public order tracking code.
   * Format: Prefix (e.g. EC) + YYMMDD + 8-char Base36 random string
   */
  generateOrderCode(): string {
    const prefix = this.deps.orderCodePrefix || "EC";
    const date = new Date();
    const yy = date.getFullYear().toString().slice(-2);
    const mm = this.padZero(date.getMonth() + 1);
    const dd = this.padZero(date.getDate());

    // Generate random 8-character uppercase Base-36 string
    const randomPart = Math.random().toString(36).substring(2, 10).toUpperCase().padEnd(8, "0");

    return `${prefix}${yy}${mm}${dd}${randomPart}`;
  }

  /**
   * Calculates volume weight and chargeable weight.
   * Standard Air Freight Divisor: 5000 (meaning volumeWeightGrams = L * W * H / 5)
   */
  calculateWeights(
    declaredWeightGrams: number,
    lengthCm?: number | null,
    widthCm?: number | null,
    heightCm?: number | null,
  ) {
    const l = lengthCm ?? 0;
    const w = widthCm ?? 0;
    const h = heightCm ?? 0;

    const volumeWeightGrams = Math.round((l * w * h) / 5);
    const chargeableWeightGrams = Math.max(declaredWeightGrams, volumeWeightGrams);

    return {
      volumeWeightGrams,
      chargeableWeightGrams,
    };
  }

  /**
   * Calculates estimated shipping freight cost.
   */
  async calculateOrderFreight(params: CalculateOrderFreightParams) {
    const {
      declaredWeight,
      dimensionLength,
      dimensionWidth,
      dimensionHeight,
      shippingMethod,
      origin,
    } = params;

    const validMethods: ShippingMethod[] = ["EXPRESS", "EPACKET"];
    if (!shippingMethod || !validMethods.includes(shippingMethod as ShippingMethod)) {
      throw new ErrorWithCode(
        ErrorCode.ValidationError,
        'Phương thức vận chuyển (shippingMethod) không hợp lệ, chỉ chấp nhận "EXPRESS" hoặc "EPACKET"',
        400,
      );
    }

    const validOrigins: ShippingOrigin[] = ["HAN", "SGN"];
    if (origin && !validOrigins.includes(origin as ShippingOrigin)) {
      throw new ErrorWithCode(
        ErrorCode.ValidationError,
        'Mã kho xuất hàng (shippingOrigin) không hợp lệ, chỉ chấp nhận "HAN" hoặc "SGN"',
        400,
      );
    }

    // Validate inputs
    if (declaredWeight <= 0) {
      throw new ErrorWithCode(ErrorCode.ValidationError, "Cân nặng khai báo phải lớn hơn 0", 400);
    }

    const { volumeWeightGrams, chargeableWeightGrams } = this.calculateWeights(
      declaredWeight,
      dimensionLength,
      dimensionWidth,
      dimensionHeight,
    );

    // Convert chargeable weight to KG for RateCardService
    const chargeableWeightKg = chargeableWeightGrams / 1000;

    const rateResult = await this.deps.rateCardService.calculateFreight({
      customerId: params.customerId,
      shippingMethod: params.shippingMethod,
      country: params.country,
      weight: chargeableWeightKg,
      origin: params.origin,
    });

    return {
      baseShippingRate: rateResult.freightCost,
      surchargeFee: 0, // default surcharge
      totalAmount: rateResult.freightCost,
      chargeableWeight: chargeableWeightGrams,
      volumeWeight: volumeWeightGrams,
      appliedRateCardId: rateResult.appliedRateCardId,
      appliedRateCardItemId: rateResult.appliedRateCardSnapshot?.itemId ?? null,
    };
  }

  /**
   * Creates a single order inside a transaction.
   */
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: necessary setup logic for order creation
  async createOrder(params: CreateOrderParams) {
    const {
      customerId,
      shippingMethod,
      shippingOrigin,
      sellerOrderId,
      declaredWeight,
      dimensionLength,
      dimensionWidth,
      dimensionHeight,
      receiverCountry,
    } = params;

    if (!params.shippingOrigin) {
      throw new ErrorWithCode(
        ErrorCode.ValidationError,
        'Mã kho xuất hàng (shippingOrigin) không được để trống, chỉ chấp nhận "HAN" hoặc "SGN"',
        400,
      );
    }

    if (!params.sellerOrderId?.trim()) {
      throw new ErrorWithCode(
        ErrorCode.ValidationError,
        "Mã đơn hàng người bán (sellerOrderId) không được để trống",
        400,
      );
    }

    if (
      params.dimensionLength == null ||
      typeof params.dimensionLength !== "number" ||
      Number.isNaN(params.dimensionLength) ||
      params.dimensionLength <= 0
    ) {
      throw new ErrorWithCode(
        ErrorCode.ValidationError,
        "Chiều dài (dimensionLength) phải là số dương",
        400,
      );
    }
    if (params.dimensionLength > MAX_DIMENSION_CM) {
      throw new ErrorWithCode(
        ErrorCode.ValidationError,
        PARCEL_VALIDATION_MESSAGES.LENGTH_MAX,
        400,
      );
    }

    if (
      params.dimensionWidth == null ||
      typeof params.dimensionWidth !== "number" ||
      Number.isNaN(params.dimensionWidth) ||
      params.dimensionWidth <= 0
    ) {
      throw new ErrorWithCode(
        ErrorCode.ValidationError,
        "Chiều rộng (dimensionWidth) phải là số dương",
        400,
      );
    }
    if (params.dimensionWidth > MAX_DIMENSION_CM) {
      throw new ErrorWithCode(ErrorCode.ValidationError, PARCEL_VALIDATION_MESSAGES.WIDTH_MAX, 400);
    }

    if (
      params.dimensionHeight == null ||
      typeof params.dimensionHeight !== "number" ||
      Number.isNaN(params.dimensionHeight) ||
      params.dimensionHeight <= 0
    ) {
      throw new ErrorWithCode(
        ErrorCode.ValidationError,
        "Chiều cao (dimensionHeight) phải là số dương",
        400,
      );
    }
    if (params.dimensionHeight > MAX_DIMENSION_CM) {
      throw new ErrorWithCode(
        ErrorCode.ValidationError,
        PARCEL_VALIDATION_MESSAGES.HEIGHT_MAX,
        400,
      );
    }

    if (!params.senderName?.trim()) {
      throw new ErrorWithCode(
        ErrorCode.ValidationError,
        "Tên người gửi (senderName) không được để trống",
        400,
      );
    }

    if (!params.senderPhone?.trim()) {
      throw new ErrorWithCode(
        ErrorCode.ValidationError,
        "Số điện thoại người gửi (senderPhone) không được để trống",
        400,
      );
    }

    if (!PHONE_REGEX.test(params.senderPhone.trim())) {
      throw new ErrorWithCode(ErrorCode.ValidationError, PHONE_VALIDATION_MESSAGES.SENDER, 400);
    }

    if (params.receiverPhone?.trim() && !PHONE_REGEX.test(params.receiverPhone.trim())) {
      throw new ErrorWithCode(ErrorCode.ValidationError, PHONE_VALIDATION_MESSAGES.RECEIVER, 400);
    }

    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (params.senderEmail?.trim() && !EMAIL_REGEX.test(params.senderEmail.trim())) {
      throw new ErrorWithCode(
        ErrorCode.ValidationError,
        PARCEL_VALIDATION_MESSAGES.EMAIL_SENDER_INVALID,
        400,
      );
    }

    if (params.receiverEmail?.trim() && !EMAIL_REGEX.test(params.receiverEmail.trim())) {
      throw new ErrorWithCode(
        ErrorCode.ValidationError,
        PARCEL_VALIDATION_MESSAGES.EMAIL_RECEIVER_INVALID,
        400,
      );
    }

    if (!params.senderAddress?.trim()) {
      throw new ErrorWithCode(
        ErrorCode.ValidationError,
        "Địa chỉ người gửi (senderAddress) không được để trống",
        400,
      );
    }

    if (!params.senderCity?.trim()) {
      throw new ErrorWithCode(
        ErrorCode.ValidationError,
        "Thành phố người gửi (senderCity) không được để trống",
        400,
      );
    }

    if (!params.senderWard?.trim()) {
      throw new ErrorWithCode(
        ErrorCode.ValidationError,
        "Phường/Xã người gửi (senderWard) không được để trống",
        400,
      );
    }

    if (!params.senderCountry?.trim()) {
      throw new ErrorWithCode(
        ErrorCode.ValidationError,
        "Quốc gia người gửi (senderCountry) không được để trống",
        400,
      );
    }

    if (!isAllowedSenderCountry(params.senderCountry)) {
      throw new ErrorWithCode(ErrorCode.ValidationError, SENDER_COUNTRY_VALIDATION_MESSAGE, 400);
    }

    if (!params.senderZipCode?.trim()) {
      throw new ErrorWithCode(
        ErrorCode.ValidationError,
        "Mã bưu chính người gửi (senderZipCode) không được để trống",
        400,
      );
    }

    if (!params.receiverName?.trim()) {
      throw new ErrorWithCode(
        ErrorCode.ValidationError,
        "Tên người nhận (receiverName) không được để trống",
        400,
      );
    }

    if (!params.receiverAddress1?.trim()) {
      throw new ErrorWithCode(
        ErrorCode.ValidationError,
        "Địa chỉ người nhận 1 (receiverAddress1) không được để trống",
        400,
      );
    }

    if (!params.receiverCity?.trim()) {
      throw new ErrorWithCode(
        ErrorCode.ValidationError,
        "Thành phố người nhận (receiverCity) không được để trống",
        400,
      );
    }

    if (!params.receiverState?.trim()) {
      throw new ErrorWithCode(
        ErrorCode.ValidationError,
        "Bang/Tỉnh người nhận (receiverState) không được để trống",
        400,
      );
    }

    if (!params.receiverCountry?.trim()) {
      throw new ErrorWithCode(
        ErrorCode.ValidationError,
        "Quốc gia người nhận (receiverCountry) không được để trống",
        400,
      );
    }

    if (!isNoZipcodeCountry(params.receiverCountry)) {
      if (!params.receiverZipCode?.trim()) {
        throw new ErrorWithCode(
          ErrorCode.ValidationError,
          "Mã bưu chính người nhận (receiverZipCode) không được để trống",
          400,
        );
      }

      if (!validatePostalCode(params.receiverCountry, params.receiverZipCode)) {
        throw new ErrorWithCode(
          ErrorCode.ValidationError,
          `Mã bưu chính người nhận (receiverZipCode) không đúng định dạng cho quốc gia ${params.receiverCountry}`,
          400,
        );
      }
    }

    let finalDetailDescription = params.detailDescription?.trim();
    if (finalDetailDescription && finalDetailDescription.length > 200) {
      throw new ErrorWithCode(
        ErrorCode.ValidationError,
        "Mô tả chi tiết hàng hóa (detailDescription) không được vượt quá 200 ký tự",
        400,
      );
    }

    if (!finalDetailDescription && params.products && params.products.length > 0) {
      const uniqueDescriptions = Array.from(
        new Set(
          params.products
            .map((p) => p.description?.trim())
            .filter((desc): desc is string => Boolean(desc)),
        ),
      );
      finalDetailDescription = uniqueDescriptions.join(", ").slice(0, 200);
    }

    if (!finalDetailDescription) {
      throw new ErrorWithCode(
        ErrorCode.ValidationError,
        "Mô tả chi tiết hàng hóa (detailDescription) không được để trống hoặc phải có danh sách sản phẩm (products)",
        400,
      );
    }

    if (
      params.declaredWeight == null ||
      !Number.isInteger(params.declaredWeight) ||
      params.declaredWeight < 1
    ) {
      throw new ErrorWithCode(
        ErrorCode.ValidationError,
        "Trọng lượng khai báo (declaredWeight) phải là số nguyên dương",
        400,
      );
    }
    if (params.declaredWeight > MAX_DECLARED_WEIGHT_GRAMS) {
      throw new ErrorWithCode(
        ErrorCode.ValidationError,
        PARCEL_VALIDATION_MESSAGES.WEIGHT_MAX,
        400,
      );
    }

    let finalDeclaredValue = params.declaredValue;
    if (
      (finalDeclaredValue == null || Number.isNaN(finalDeclaredValue)) &&
      params.products &&
      params.products.length > 0
    ) {
      const rawTotal = params.products.reduce(
        (sum, p) => sum + (p.quantity || 1) * (p.value || 0),
        0,
      );
      finalDeclaredValue = Math.round(rawTotal * 100) / 100;
    }

    if (finalDeclaredValue == null || finalDeclaredValue < 0 || finalDeclaredValue > 9999999999.99) {
      throw new ErrorWithCode(
        ErrorCode.ValidationError,
        "Giá trị khai báo (declaredValue) phải lớn hơn hoặc bằng 0 và không vượt quá 9,999,999,999.99 USD",
        400,
      );
    }

    if (params.products && params.products.length > 0) {
      for (const product of params.products) {
        if (!product.description || !product.description.trim()) {
          throw new ErrorWithCode(
            ErrorCode.ValidationError,
            "Tên sản phẩm (description) không được để trống",
            400,
          );
        }
        if (product.description.trim().length > 200) {
          throw new ErrorWithCode(
            ErrorCode.ValidationError,
            "Tên sản phẩm (description) không được vượt quá 200 ký tự",
            400,
          );
        }
        if (!isAsciiLatinOnly(product.description.trim())) {
          throw new ErrorWithCode(
            ErrorCode.ValidationError,
            "Tên sản phẩm (description) phải là Tiếng Anh / Ký tự Latin không dấu",
            400,
          );
        }
        if (
          product.quantity == null ||
          !Number.isInteger(product.quantity) ||
          product.quantity < 1
        ) {
          throw new ErrorWithCode(
            ErrorCode.ValidationError,
            "Số lượng sản phẩm (quantity) phải là số nguyên dương",
            400,
          );
        }
        if (
          product.value == null ||
          typeof product.value !== "number" ||
          Number.isNaN(product.value) ||
          product.value <= 0 ||
          product.value > 9999999999.99
        ) {
          throw new ErrorWithCode(
            ErrorCode.ValidationError,
            "Giá trị sản phẩm (value) phải lớn hơn 0 và không vượt quá 9,999,999,999.99 USD",
            400,
          );
        }
      }
    }

    // 1. Calculate shipping fees
    const pricing = await this.calculateOrderFreight({
      customerId,
      shippingMethod,
      country: receiverCountry,
      declaredWeight,
      dimensionLength,
      dimensionWidth,
      dimensionHeight,
      origin: shippingOrigin,
    });

    // 2. Generate a unique code with collision safety
    let orderCode = "";
    let codeIsUnique = false;
    let retries = 3;

    while (!codeIsUnique && retries > 0) {
      orderCode = this.generateOrderCode();
      const existing = await this.deps.orderRepo.findByCode(orderCode);
      if (!existing) {
        codeIsUnique = true;
      } else {
        retries--;
      }
    }

    if (!codeIsUnique) {
      throw new ErrorWithCode(
        ErrorCode.Conflict,
        "Không thể sinh mã vận đơn duy nhất sau nhiều lần thử. Vui lòng thử lại.",
        409,
      );
    }

    // 3. If sellerOrderId is provided, check for duplication (Idempotency check)
    if (sellerOrderId) {
      const existingDuplicate = await this.deps.orderRepo.findBySellerOrderId(
        customerId,
        sellerOrderId,
      );
      if (existingDuplicate) {
        throw new ErrorWithCode(
          ErrorCode.Conflict,
          `Đơn hàng có mã tham chiếu Seller Order ID "${sellerOrderId}" đã tồn tại trên hệ thống.`,
          409,
        );
      }
    }

    // 4. Construct create input
    const isGetLabelChecked = params.isGetLabel === 1;
    const initialOrderStatus: OrderStatus = isGetLabelChecked
      ? OrderStatus.LABEL_CREATED
      : OrderStatus.PENDING_LABEL;
    const initialLabelStatus: LabelStatus = isGetLabelChecked
      ? LabelStatus.SUCCESS
      : LabelStatus.PENDING_LABEL;

    const dimensionText =
      dimensionLength && dimensionWidth && dimensionHeight
        ? `${dimensionLength}x${dimensionWidth}x${dimensionHeight}`
        : null;

    const inputData: CreateOrderInput = {
      orderCode,
      customerId,
      importId: params.importId,
      status: initialOrderStatus,
      labelStatus: initialLabelStatus,
      exportCustomsStatus: "PENDING",
      importCustomsStatus: "PENDING",
      paymentStatus: "INIT",
      shippingMethod,
      shippingOrigin,
      sellerOrderId,

      senderName: params.senderName,
      senderAddress: params.senderAddress,
      senderPhone: params.senderPhone,
      senderEmail: params.senderEmail,
      senderCountry: params.senderCountry.toUpperCase().trim(),
      senderState: params.senderState,
      senderCity: params.senderCity,
      senderWard: params.senderWard,
      senderZipCode: params.senderZipCode,

      receiverName: params.receiverName,
      receiverPhone: params.receiverPhone,
      receiverEmail: params.receiverEmail,
      receiverCity: params.receiverCity,
      receiverState: params.receiverState,
      receiverAddress1: params.receiverAddress1,
      receiverAddress2: params.receiverAddress2,
      receiverCountry: params.receiverCountry,
      receiverZipCode: formatPostalCode(params.receiverCountry, params.receiverZipCode),

      detailDescription: finalDetailDescription,
      declaredWeight,
      dimensionText,
      dimensionLength: dimensionLength ?? null,
      dimensionWidth: dimensionWidth ?? null,
      dimensionHeight: dimensionHeight ?? null,
      declaredValue: finalDeclaredValue,
      packingTypeId: params.packingTypeId ?? null,
      packagingCode: params.packagingCode,

      volumeWeight: pricing.volumeWeight,
      chargeableWeight: pricing.chargeableWeight,

      rateCardId: pricing.appliedRateCardId ?? null,
      baseShippingFee: pricing.baseShippingRate,
      surchargeFee: pricing.surchargeFee,
      totalFee: pricing.totalAmount,
      isGetLabel: params.isGetLabel ?? 0,
      feeItems: {
        create: [
          {
            feeType: "BASE_SHIPPING",
            name: "Cước vận chuyển chính",
            amount: pricing.baseShippingRate,
            rateCardItemId: pricing.appliedRateCardItemId ?? null,
          },
          {
            feeType: "FUEL_SURCHARGE",
            name: "Phụ Phí Nhiên Liệu",
            amount: pricing.surchargeFee,
          },
        ],
      },
      products: params.products
        ? {
            create: params.products.map((p) => ({
              description: p.description,
              quantity: p.quantity,
              value: p.value,
              hsCode: p.hsCode,
              originCountry: p.originCountry,
              weight: p.weight,
              sku: p.sku,
            })),
          }
        : undefined,
    };

    const result = await runInTransaction(async () => {
      const createdOrder = await this.deps.orderRepo.create(inputData);

      const actorInfo = await this.resolveActorInfo("CUSTOMER", customerId.toString());

      // Create initial activity log entry
      await this.deps.orderRepo.createActivityLog({
        orderId: createdOrder.id,
        action: "STATUS_CHANGE",
        statusFrom: null,
        statusTo: initialOrderStatus,
        description: isGetLabelChecked
          ? "Đơn hàng được tạo thành công và đã tạo nhãn (Label Created)"
          : "Đơn hàng được tạo thành công (Pending Label)",
        actorType: "CUSTOMER",
        actorId: actorInfo.actorId,
        actorName: actorInfo.actorName,
        actorUsername: actorInfo.actorUsername,
        actorEmail: actorInfo.actorEmail,
      });

      return {
        ...createdOrder,
        totalFee: Number(createdOrder.totalFee),
        volumeWeight: pricing.volumeWeight,
        chargeableWeight: pricing.chargeableWeight,
        dimensionText,
      };
    });

    eventBus
      .emit("order.created", {
        orderId: result.id,
        customerId: customerId,
        status: result.status,
        orderCode: result.orderCode,
      })
      .catch((err) => {
        console.error("Failed to emit order.created event:", err);
      });

    // If customer checked isGetLabel (1), trigger label purchase via OrderLabelService
    if (isGetLabelChecked) {
      try {
        const { getOrderLabelService } = await import("@ecom/features/di/containers/OrderLabelService");
        const purchased = await getOrderLabelService().purchaseLabel({
          orderId: result.id,
          customerId,
        });
        return {
          ...result,
          ...purchased,
        };
      } catch (labelErr) {
        console.error(`[OrderService] Automatic label purchase failed for order ${result.id}:`, labelErr);
      }
    }

    return result;
  }

  /**
   * Updates order status with logging.
   */
  async updateOrderStatus(
    id: string,
    newStatus: OrderStatus,
    operatorId: string,
    metadata?: Record<string, unknown> | null,
    expectedVersion?: number,
  ) {
    const order = await this.deps.orderRepo.findById(id);
    if (!order) {
      throw new ErrorWithCode(ErrorCode.NotFound, "Đơn hàng không tồn tại", 404);
    }

    const oldStatus = order.status;
    if (oldStatus === newStatus) {
      return order;
    }

    const result = await runInTransaction(async () => {
      const updated = await this.deps.orderRepo.update(id, {
        status: newStatus,
        expectedVersion,
      });

      const actorInfo = await this.resolveActorInfo("OPERATOR", operatorId);

      await this.deps.orderRepo.createActivityLog({
        orderId: id,
        action: "STATUS_CHANGE",
        statusFrom: oldStatus,
        statusTo: newStatus,
        description: `Trạng thái đơn hàng chuyển đổi từ ${oldStatus} sang ${newStatus}`,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
        actorType: "OPERATOR",
        actorId: actorInfo.actorId,
        actorName: actorInfo.actorName,
        actorUsername: actorInfo.actorUsername,
        actorEmail: actorInfo.actorEmail,
      });

      return updated;
    });

    eventBus
      .emit("order.status_updated", {
        orderId: result.id,
        customerId: order.customerId,
        status: result.status,
        orderCode: result.orderCode,
      })
      .catch((err) => {
        console.error("Failed to emit order.status_updated event:", err);
      });

    return result;
  }

  /**
   * Adds custom tracking checkpoints (for webhook or scanner updates).
   */
  async addTrackingCheckpoint(
    orderId: string,
    checkpoint: {
      checkpointDate: Date;
      location?: string | null;
      description: string;
      carrierCode?: string | null;
    },
    operatorId: string,
  ) {
    const order = await this.deps.orderRepo.findById(orderId);
    if (!order) {
      throw new ErrorWithCode(ErrorCode.NotFound, "Đơn hàng không tồn tại", 404);
    }

    const result = await runInTransaction(async () => {
      const savedCheckpoint = await this.deps.orderRepo.upsertTrackingCheckpoint({
        orderId,
        checkpointDate: checkpoint.checkpointDate,
        location: checkpoint.location,
        description: checkpoint.description,
        carrierCode: checkpoint.carrierCode,
      });

      const actorInfo = await this.resolveActorInfo("OPERATOR", operatorId);

      // Write activity log for webhook updates
      await this.deps.orderRepo.createActivityLog({
        orderId,
        action: "WEBHOOK_RECEIVED",
        description: `Hành trình cập nhật chặng chót: ${checkpoint.description} (${checkpoint.location || "N/A"})`,
        metadata: JSON.parse(JSON.stringify(checkpoint)),
        actorType: "OPERATOR",
        actorId: actorInfo.actorId,
        actorName: actorInfo.actorName,
        actorUsername: actorInfo.actorUsername,
        actorEmail: actorInfo.actorEmail,
      });

      return savedCheckpoint;
    });

    eventBus
      .emit("order.checkpoint_added", {
        orderId: orderId,
        customerId: order.customerId,
        status: order.status,
        orderCode: order.orderCode,
        checkpoint: checkpoint.description,
      })
      .catch((err) => {
        console.error("Failed to emit order.checkpoint_added event:", err);
      });

    return result;
  }

  /**
   * Recalculates order fees.
   * If forceRefresh is true, it queries the live active RateCard.
   * Otherwise, it uses the rateCardId stored in the order to calculate based on the original version.
   */
  async recalculateOrderFees(orderId: string, operatorId: string, forceRefresh = false) {
    const order = await this.deps.orderRepo.findById(orderId);
    if (!order) {
      throw new ErrorWithCode(ErrorCode.NotFound, "Đơn hàng không tồn tại", 404);
    }

    const chargeableWeightKg = Number(order.chargeableWeight) / 1000;

    let baseShippingRate = 0;
    let surchargeFee = 0;
    let rateCardId = order.rateCardId;
    let rateCardItemId: number | null = null;

    if (forceRefresh) {
      // Fetch latest matching active rate card
      const rateResult = await this.deps.rateCardService.calculateFreight({
        customerId: order.customerId,
        shippingMethod: order.shippingMethod,
        country: order.receiverCountry,
        weight: chargeableWeightKg,
        origin: order.shippingOrigin,
      });
      baseShippingRate = rateResult.freightCost;
      surchargeFee = 0;
      rateCardId = rateResult.appliedRateCardId;
      rateCardItemId = rateResult.appliedRateCardSnapshot.itemId;
    } else {
      if (!rateCardId) {
        throw new ErrorWithCode(
          ErrorCode.ValidationError,
          "Đơn hàng này không có bảng giá liên kết để tính lại cước. Hãy dùng chức năng tính lại theo bảng giá mới nhất.",
          400,
        );
      }
      // Calculate freight using specifically the current linked rateCardId
      const rateResult = await this.deps.rateCardService.calculateFreightWithCardId(
        rateCardId,
        chargeableWeightKg,
      );
      baseShippingRate = rateResult.freightCost;
      surchargeFee = 0;
      rateCardItemId = rateResult.appliedRateCardSnapshot.itemId;
    }

    return runInTransaction(async () => {
      // Delete existing BASE_SHIPPING and FUEL_SURCHARGE
      await prisma.orderFeeItem.deleteMany({
        where: {
          orderId: order.id,
          feeType: { in: ["BASE_SHIPPING", "FUEL_SURCHARGE"] },
        },
      });

      // Insert updated BASE_SHIPPING and FUEL_SURCHARGE
      await prisma.orderFeeItem.createMany({
        data: [
          {
            orderId: order.id,
            feeType: "BASE_SHIPPING",
            name: "Cước vận chuyển chính",
            amount: baseShippingRate,
            rateCardItemId,
          },
          {
            orderId: order.id,
            feeType: "FUEL_SURCHARGE",
            name: "Phụ Phí Nhiên Liệu",
            amount: surchargeFee,
          },
        ],
      });

      // Fetch all fee items including manual ones to calculate totalFee
      const allFeeItems = await prisma.orderFeeItem.findMany({
        where: { orderId: order.id },
      });

      const totalFee = allFeeItems.reduce(
        // biome-ignore lint/suspicious/noExplicitAny: original payload type
        (sum: number, item: { amount: any }) => sum + Number(item.amount),
        0,
      );

      // Update Order totals
      const updatedOrder = await prisma.order.update({
        where: { id: order.id },
        data: {
          rateCardId,
          baseShippingFee: baseShippingRate,
          surchargeFee,
          totalFee,
        },
        select: {
          id: true,
          orderCode: true,
          status: true,
          totalFee: true,
          createdAt: true,
        },
      });

      const actorInfo = await this.resolveActorInfo("OPERATOR", operatorId);

      // Create activity log entry
      await prisma.orderActivityLog.create({
        data: {
          orderId: order.id,
          action: "PRICE_RECALCULATED",
          description: `Đã tính lại cước phí thành công (Cước chính: ${baseShippingRate} USD, Tổng: ${totalFee} USD). Hướng tính: ${forceRefresh ? "Theo giá hiện hành" : "Theo giá cũ lúc tạo đơn"}.`,
          actorType: "OPERATOR",
          actorId: actorInfo.actorId,
          actorName: actorInfo.actorName,
          actorUsername: actorInfo.actorUsername,
          actorEmail: actorInfo.actorEmail,
        },
      });

      return updatedOrder;
    });
  }

  /**
   * Retrieves paginated orders for a customer with filtering options.
   */
  async getCustomerOrders(params: {
    customerId: string;
    page?: number;
    perPage?: number;
    status?: OrderStatus;
    orderCode?: string;
    sellerOrderId?: string;
    fromDate?: Date;
    toDate?: Date;
    search?: string;
  }) {
    const result = await this.deps.orderRepo.findMany({
      customerId: params.customerId,
      page: params.page,
      perPage: params.perPage,
      status: params.status,
      orderCode: params.orderCode,
      sellerOrderId: params.sellerOrderId,
      fromDate: params.fromDate,
      toDate: params.toDate,
      search: params.search,
    });

    return {
      ...result,
      data: result.data.map(mapToCustomerOrderSummaryResponse),
    };
  }

  /**
   * Retrieves full order detail by ID, orderCode, or sellerOrderId for a customer.
   */
  async getCustomerOrderDetail(customerId: string, identifier: string) {
    const order = await this.deps.orderRepo.findByIdOrCodeForCustomer(customerId, identifier);
    if (!order) {
      throw new ErrorWithCode(ErrorCode.NotFound, "Đơn hàng không tồn tại", 404);
    }
    return mapToCustomerOrderDetailResponse(order);
  }

  /**
   * Cancels an order requested by the customer.
   * Only orders in PENDING_LABEL status can be cancelled.
   */
  async cancelCustomerOrder(customerId: string, identifier: string, reason?: string) {
    const order = await this.deps.orderRepo.findByIdOrCodeForCustomer(customerId, identifier);
    if (!order) {
      throw new ErrorWithCode(ErrorCode.NotFound, "Đơn hàng không tồn tại", 404);
    }

    if (order.labelStatus === LabelStatus.CANCELLED) {
      return order;
    }

    if (order.status !== OrderStatus.PENDING_LABEL) {
      throw new ErrorWithCode(
        ErrorCode.ValidationError,
        `Không thể hủy đơn hàng đang ở trạng thái "${order.status}". Vui lòng liên hệ bộ phận hỗ trợ.`,
        400,
      );
    }

    const oldStatus = order.status;

    const result = await runInTransaction(async () => {
      const updated = await this.deps.orderRepo.update(order.id, {
        labelStatus: LabelStatus.CANCELLED,
      });

      const actorInfo = await this.resolveActorInfo("CUSTOMER", customerId);

      const cancelDescription = reason
        ? `Khách hàng hủy đơn qua API. Lý do: ${reason}`
        : "Khách hàng đã hủy đơn hàng qua API";

      await this.deps.orderRepo.createActivityLog({
        orderId: order.id,
        action: "STATUS_CHANGE",
        statusFrom: oldStatus,
        statusTo: LabelStatus.CANCELLED,
        description: cancelDescription,
        actorType: "CUSTOMER",
        actorId: actorInfo.actorId,
        actorName: actorInfo.actorName,
        actorUsername: actorInfo.actorUsername,
        actorEmail: actorInfo.actorEmail,
      });

      return updated;
    });

    eventBus
      .emit("order.status_updated", {
        orderId: result.id,
        customerId: customerId,
        status: result.status,
        orderCode: result.orderCode,
      })
      .catch((err) => {
        console.error("Failed to emit order.status_updated event on cancel:", err);
      });

    return result;
  }
}
