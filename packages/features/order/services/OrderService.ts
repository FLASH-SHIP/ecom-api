import { eventBus } from "@ecom/features/events/EventBus";
import type { RateCardService } from "@ecom/features/rate-card/services/RateCardService";
import { ErrorCode } from "@ecom/lib/errorCodes";
import { ErrorWithCode } from "@ecom/lib/errors";
import {
  type ActorType,
  type OrderStatus,
  prisma,
  runInTransaction,
  type ShippingMethod,
} from "@ecom/prisma";
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
  shippingOrigin?: string;
  sellerOrderId?: string | null;
  importId?: string | null;

  // Sender info
  senderName?: string | null;
  senderAddress?: string | null;
  senderPhone?: string | null;
  senderEmail?: string | null;
  senderCountry?: string | null;
  senderState?: string | null;
  senderCity?: string | null;
  senderZipCode?: string | null;

  // Receiver info
  receiverName: string;
  receiverPhone?: string | null;
  receiverEmail?: string | null;
  receiverCity: string;
  receiverState: string;
  receiverAddress1: string;
  receiverAddress2?: string | null;
  receiverCountry: string;
  receiverZipCode: string;

  // Cargo info
  detailDescription: string;
  declaredWeight: number; // in grams
  dimensionLength?: number | null;
  dimensionWidth?: number | null;
  dimensionHeight?: number | null;
  declaredValue: number;
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
    const { declaredWeight, dimensionLength, dimensionWidth, dimensionHeight } = params;

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
      shippingOrigin = "HAN",
      sellerOrderId,
      declaredWeight,
      dimensionLength,
      dimensionWidth,
      dimensionHeight,
      declaredValue,
      receiverCountry,
    } = params;

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
    const dimensionText =
      dimensionLength && dimensionWidth && dimensionHeight
        ? `${dimensionLength}x${dimensionWidth}x${dimensionHeight}`
        : null;

    const inputData: CreateOrderInput = {
      orderCode,
      customerId,
      importId: params.importId,
      status: "DRAFT",
      labelStatus: "PENDING_LABEL",
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
      senderCountry: params.senderCountry,
      senderState: params.senderState,
      senderCity: params.senderCity,
      senderZipCode: params.senderZipCode,

      receiverName: params.receiverName,
      receiverPhone: params.receiverPhone,
      receiverEmail: params.receiverEmail,
      receiverCity: params.receiverCity,
      receiverState: params.receiverState,
      receiverAddress1: params.receiverAddress1,
      receiverAddress2: params.receiverAddress2,
      receiverCountry: params.receiverCountry,
      receiverZipCode: params.receiverZipCode,

      detailDescription: params.detailDescription,
      declaredWeight,
      dimensionText,
      dimensionLength: dimensionLength ?? null,
      dimensionWidth: dimensionWidth ?? null,
      dimensionHeight: dimensionHeight ?? null,
      declaredValue,
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
        statusTo: "DRAFT",
        description: "Đơn hàng nháp được tạo thành công",
        actorType: "CUSTOMER",
        actorId: actorInfo.actorId,
        actorName: actorInfo.actorName,
        actorUsername: actorInfo.actorUsername,
        actorEmail: actorInfo.actorEmail,
      });

      return {
        ...createdOrder,
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
}
