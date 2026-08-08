import { eventBus } from "@ecom/features/events/EventBus";
import {
  type AddressInfo,
  CARRIER_CODES,
  type CreateLabelDto,
  type ICarrierProvider,
} from "@ecom/features/integrations/carrier/interfaces/carrier-provider.interface";
import { LocalStorageAdapter } from "@ecom/features/media/storage/LocalStorageAdapter";
import { LabelStatus, OrderStatus, Prisma, prisma, runInTransaction } from "@ecom/prisma";
import { toSafeJson } from "@flash-ship/ecom-lib";
import { ErrorCode } from "@flash-ship/ecom-lib/errorCodes";
import { ErrorWithCode } from "@flash-ship/ecom-lib/errors";
import { getRedisClient } from "@flash-ship/ecom-lib/redis";
import { GET_LABEL_OPTION, TopupStatus, TopupType } from "@flash-ship/ecom-types";
import {
  EPICHUB_DEFAULT_SERVICE_CODE,
  EPICHUB_SHIP_FROM_ADDRESSES,
  EpicHubAuthService,
  EpicHubCarrierService,
  EpicHubHttpClient,
  PartnerProviderRegistry,
} from "../../integrations";
import type { TopupTransactionRepository } from "../../topup/repositories/TopupTransactionRepository";
import type { OrderRepository } from "../repositories/OrderRepository";
import type { CreateOrderParams } from "./OrderService";

export interface IOrderLabelServiceDeps {
  orderRepo: OrderRepository;
  topupRepo?: TopupTransactionRepository;
  storage?: LocalStorageAdapter;
}

export interface PurchaseLabelParams {
  orderId: string;
  customerId?: string;
  operatorId?: string;
  serviceCode?: string;
}

type OrderRecord = NonNullable<Awaited<ReturnType<OrderRepository["findById"]>>>;

/** Làm tròn số dư & tiền tệ đến 2 chữ số thập phân an toàn floating-point trong JavaScript */
export function roundCurrency(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

export class OrderLabelService {
  /** Map khóa chống đụng độ đồng thời giữa Auto Reconcile Cronjob và thao tác Admin CMS */
  private static reconcilingOrderIds = new Set<string>();
  /** Map khóa RAM Mutex Lock chống Race Condition khi khách sửa địa chỉ / retry mua tem liên tiếp */
  private static modifyingOrderIds = new Set<string>();

  private deps: IOrderLabelServiceDeps;
  private storage: LocalStorageAdapter;

  constructor(deps: IOrderLabelServiceDeps) {
    this.deps = deps;
    this.storage = deps.storage || new LocalStorageAdapter();
  }

  /**
   * Lazily resolves or registers a carrier provider in the registry.
   */
  private getCarrierProvider(carrierCode: string) {
    const registry = PartnerProviderRegistry.getInstance();
    const codeUpper = carrierCode.toUpperCase();

    if (!registry.hasProvider("carrier", codeUpper)) {
      if (codeUpper === CARRIER_CODES.EPICHUB) {
        const baseUrl = process.env.EPICHUB_BASE_URL || "https://clutchshipper.com/api";
        const authService = new EpicHubAuthService();
        const httpClient = new EpicHubHttpClient(baseUrl, authService);
        const epicHubService = new EpicHubCarrierService(httpClient);
        registry.registerCarrier(epicHubService);
      } else {
        throw new ErrorWithCode(
          ErrorCode.ValidationError,
          `Carrier provider '${carrierCode}' chưa được đăng ký trong hệ thống`,
          400,
        );
      }
    }

    return registry.getCarrier(codeUpper);
  }

  /**
   * Validate order eligibility for label purchasing.
   */
  private validateOrder(order: unknown, customerId?: string): asserts order is OrderRecord {
    if (!order) {
      throw new ErrorWithCode(ErrorCode.NotFound, "Không tìm thấy đơn hàng", 404);
    }
    const record = order as OrderRecord;
    if (customerId && record.customerId !== customerId) {
      throw new ErrorWithCode(
        ErrorCode.Forbidden,
        "Bạn không có quyền thực hiện thao tác trên đơn hàng này",
        403,
      );
    }
    if (record.status === OrderStatus.CANCELLED) {
      throw new ErrorWithCode(
        ErrorCode.ValidationError,
        "Không thể mua nhãn cho đơn hàng đã bị hủy",
        400,
      );
    }
  }

  /**
   * Resolve 100% Independent US ShipFrom Address by ShippingOrigin (HAN vs SGN).
   */
  private buildShipFromInfo(shippingOrigin?: string): AddressInfo {
    const originKey = (shippingOrigin === "SGN" ? "SGN" : "HAN") as "HAN" | "SGN";
    const epichubShipFrom = EPICHUB_SHIP_FROM_ADDRESSES[originKey];
    return {
      name: epichubShipFrom.Name,
      attentionName: epichubShipFrom.AttentionName,
      phone: epichubShipFrom.Phone || "2133730000",
      email: epichubShipFrom.EmailAddress || "sender@example.com",
      addressLine1: epichubShipFrom.Address.AddressLine1,
      addressLine2: epichubShipFrom.Address.AddressLine2,
      city: epichubShipFrom.Address.City,
      stateProvinceCode: epichubShipFrom.Address.StateProvinceCode,
      postalCode: epichubShipFrom.Address.PostalCode,
      countryCode: epichubShipFrom.Address.CountryCode,
    };
  }

  /**
   * Build ShipTo address payload from order.
   */
  private buildShipToInfo(order: OrderRecord): AddressInfo {
    const rawDigits = (order.receiverPhone || "").replace(/[^0-9]/g, "");
    const phone = rawDigits.length >= 10 ? rawDigits.slice(-10) : "2133730000";
    return {
      name: order.receiverName,
      attentionName: order.receiverName,
      phone: phone,
      email: order.receiverEmail || undefined,
      addressLine1: order.receiverAddress1,
      addressLine2: order.receiverAddress2 || undefined,
      city: order.receiverCity,
      stateProvinceCode: order.receiverState,
      postalCode: order.receiverZipCode || "",
      countryCode: order.receiverCountry || "US",
    };
  }

  /**
   * Build CreateLabelDto payload with unit conversions (Grams -> LBS, CM -> IN).
   */
  private buildCreateLabelDto(order: OrderRecord, shipFromInfo: AddressInfo, shipToInfo: AddressInfo): CreateLabelDto {
    const weightInLbs = Math.max(0.1, Math.round((order.declaredWeight / 453.59237) * 100) / 100);
    const lengthIn = Math.max(1, Math.round((Number(order.dimensionLength || 10)) / 2.54));
    const widthIn = Math.max(1, Math.round((Number(order.dimensionWidth || 10)) / 2.54));
    const heightIn = Math.max(1, Math.round((Number(order.dimensionHeight || 10)) / 2.54));

    return {
      requestId: order.orderCode,
      serviceCode: EPICHUB_DEFAULT_SERVICE_CODE,
      shipmentDescription: (order.detailDescription || "Ecom Express Shipping").slice(0, 50),
      addressValidation: true,
      shipFrom: shipFromInfo,
      shipTo: shipToInfo,
      packages: [
        {
          numberLabels: 1,
          reference: order.orderCode,
          reference2: order.sellerOrderId || undefined,
          weight: { weight: weightInLbs, unitOfMeasurement: "LBS" },
          dimensions: { length: lengthIn, width: widthIn, height: heightIn, unitOfMeasurement: "IN" },
          items: order.products?.map((p) => ({
            description: p.description,
            quantity: p.quantity,
            weight: {
              weight: Math.max(0.1, Math.round(((p.weight || order.declaredWeight) / 453.59237) * 100) / 100),
              unitOfMeasurement: "LBS",
            },
            price: { monetaryValue: Number(p.value), currencyCode: "USD" },
          })),
        },
      ],
    };
  }

  /**
   * Check existing label PDF buffer for idempotency protection.
   * Priority 1: Read from local storage cache if order.labelUrl exists and file is on disk.
   * Priority 2: Fallback to carrier.printLabel remote API.
   */
  private async checkExistingLabelBuffer(
    carrier: ICarrierProvider,
    order: OrderRecord,
  ): Promise<Buffer | undefined> {
    // 1. Local Cache First
    if (order.labelUrl) {
      try {
        const fileExists = await this.storage.exists(order.labelUrl);
        if (fileExists) {
          return await this.storage.read(order.labelUrl);
        }
      } catch {
        // Fallback to remote if local read fails
      }
    }

    // 2. Remote API Fallback
    if (!carrier.printLabel) return undefined;
    try {
      const printResult = await carrier.printLabel({ requestId: order.orderCode, encoded: true });
      return printResult?.pdfBuffer;
    } catch {
      return undefined;
    }
  }

  /**
   * Helper to resolve Partner and PartnerService IDs for audit logging.
   */
  private async resolvePartnerAndService(carrierCode: string) {
    const codeUpper = carrierCode.toUpperCase();
    const partner = await prisma.partner.findFirst({
      where: {
        OR: [
          { code: carrierCode },
          { code: codeUpper },
        ],
      },
      select: { id: true, code: true },
    });

    const partnerService = partner
      ? await prisma.partnerService.findFirst({
          where: {
            partnerId: partner.id,
            code: EPICHUB_DEFAULT_SERVICE_CODE,
          },
          select: { id: true, code: true },
        })
      : null;

    return { partner, partnerService };
  }

  /**
   * Record failure audit log when label purchase fails.
   */
  private async logFailedPartnerAudit(
    order: OrderRecord,
    carrierCode: string,
    errorMsg: string,
    rawRequest?: unknown,
    action: string = "CREATE_LABEL",
    rawResponse?: unknown,
  ) {
    try {
      const { partner, partnerService } = await this.resolvePartnerAndService(carrierCode);
      const serviceCode = partnerService?.code || EPICHUB_DEFAULT_SERVICE_CODE;

      const safeRawRequest = rawRequest
        ? toSafeJson(rawRequest)
        : {
            url: `${process.env.EPICHUB_BASE_URL || "https://clutchshipper.com/api"}/v2/shipments/label-request`,
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: { serviceCode, origin: order.shippingOrigin, receiverCountry: order.receiverCountry },
          };

      const safeRawResponse = rawResponse
        ? toSafeJson(rawResponse)
        : toSafeJson({ error: errorMsg, status: "FAILURE" });

      const resObj = (rawResponse || {}) as { durationMs?: number };
      const durationMs = resObj.durationMs;

      await prisma.partnerAuditLog.create({
        data: {
          orderId: order.id,
          partnerId: partner?.id || null,
          partnerServiceId: partnerService?.id || null,
          partnerCode: carrierCode.toUpperCase(),
          serviceType: "LASTMILE",
          action: action,
          requestId: order.orderCode,
          serviceCode: serviceCode,
          externalRefId: order.trackingNumber || null,
          quotedFee: order.totalFee ? Number(order.totalFee) : 0,
          actualFee: 0,
          currency: "USD",
          status: "FAILURE",
          errorMessage: errorMsg,
          rawRequest: safeRawRequest as Prisma.InputJsonValue,
          rawResponse: safeRawResponse as Prisma.InputJsonValue,
          metadata: durationMs !== undefined ? ({ durationMs } as Prisma.InputJsonValue) : undefined,
        },
      });
    } catch (auditErr) {
      console.error("[OrderLabelService] Failed to record failure partner audit log:", auditErr);
    }
  }

  private async logLabelCreationAuditAndLogs(
    order: OrderRecord,
    carrierCode: string,
    trackingNumber: string,
    actualFee: number,
    labelUrl: string,
    params: PurchaseLabelParams,
    rawRequestPayload?: unknown,
    rawResponsePayload?: unknown,
  ) {
    const { partner, partnerService } = await this.resolvePartnerAndService(carrierCode);
    const serviceCode = partnerService?.code || EPICHUB_DEFAULT_SERVICE_CODE;

    await this.deps.orderRepo.createActivityLog({
      orderId: order.id,
      action: "PURCHASE_LABEL",
      statusFrom: order.status,
      statusTo: OrderStatus.LABEL_CREATED,
      description: `Mua nhãn tem thành công từ đối tác ${carrierCode} (Dịch vụ: ${serviceCode}, Tracking: ${trackingNumber}, Cước phí: $${actualFee})`,
      metadata: {
        carrierCode,
        serviceCode,
        trackingNumber,
        actualFee,
        quotedFee: Number(order.totalFee),
      },
      actorType: params.operatorId ? "OPERATOR" : "CUSTOMER",
      actorId: params.operatorId || params.customerId || "system",
      actorName: params.operatorId ? "Operator" : "Customer",
      actorUsername: params.operatorId ? "operator" : "customer",
      actorEmail: null,
    });

    if (actualFee > Number(order.totalFee || 0)) {
      await this.deps.orderRepo.createActivityLog({
        orderId: order.id,
        action: "FEE_DISCREPANCY",
        statusFrom: order.status,
        statusTo: OrderStatus.LABEL_CREATED,
        description: `CẢNH BÁO CHÊNH LỆCH CƯỚC: Cước thực tế nhà cung cấp ($${actualFee}) cao hơn cước báo khách ($${order.totalFee}). Cần kiểm tra đối soát.`,
        metadata: {
          carrierCode,
          serviceCode,
          trackingNumber,
          quotedFee: Number(order.totalFee),
          actualFee,
          discrepancyAmount: roundCurrency(actualFee - Number(order.totalFee)),
        },
        actorType: "SYSTEM",
        actorId: "system",
        actorName: "System Auditor",
        actorUsername: "system",
        actorEmail: null,
      });
    }

    await prisma.partnerAuditLog.create({
      data: {
        orderId: order.id,
        partnerId: partner?.id || null,
        partnerServiceId: partnerService?.id || null,
        partnerCode: carrierCode.toUpperCase(),
        serviceType: "LASTMILE",
        action: "CREATE_LABEL",
        requestId: order.orderCode,
        serviceCode: serviceCode,
        externalRefId: trackingNumber,
        quotedFee: order.totalFee ? Number(order.totalFee) : 0,
        actualFee: actualFee,
        currency: "USD",
        status: "SUCCESS",
        rawRequest: rawRequestPayload
          ? (toSafeJson(rawRequestPayload) as Prisma.InputJsonValue)
          : { serviceCode, origin: order.shippingOrigin, receiverCountry: order.receiverCountry },
        rawResponse: rawResponsePayload
          ? (toSafeJson(rawResponsePayload) as Prisma.InputJsonValue)
          : { trackingNumber, labelUrl, status: "SUCCESS" },
      },
    });
  }

  /**
   * Persist PDF label to local storage and update DB records.
   */
  private async persistLabelAndUpdateOrder(
    order: OrderRecord,
    carrierCode: string,
    trackingNumber: string,
    pdfBuffer: Buffer,
    actualFee: number,
    params: PurchaseLabelParams,
    rawRequestPayload?: unknown,
    rawResponsePayload?: unknown,
  ) {
    const fileName = `labels/${order.orderCode}_${trackingNumber || "label"}.pdf`;
    const labelUrl = await this.storage.upload(pdfBuffer, fileName, "application/pdf");

    const updatedOrder = await runInTransaction(async () => {
      const saved = await this.deps.orderRepo.update(order.id, {
        trackingNumber,
        carrierCode,
        labelUrl,
        status: OrderStatus.LABEL_CREATED,
        labelStatus: LabelStatus.SUCCESS,
        isGetLabel: GET_LABEL_OPTION.GET_LABEL_NOW,
      });

      await this.logLabelCreationAuditAndLogs(
        order,
        carrierCode,
        trackingNumber,
        actualFee,
        labelUrl,
        params,
        rawRequestPayload,
        rawResponsePayload,
      );

      return saved;
    });

    eventBus
      .emit("order.status_updated", {
        orderId: updatedOrder.id,
        customerId: order.customerId,
        status: updatedOrder.status,
        orderCode: updatedOrder.orderCode,
      })
      .catch((err) => {
        console.error("Failed to emit order.status_updated event:", err);
      });

    return updatedOrder;
  }

  /**
   * Helper to execute carrier label creation and fetch PDF.
   */
  private async executeCarrierLabelCreation(
    carrier: ICarrierProvider,
    order: OrderRecord,
    shipFromInfo: AddressInfo,
    shipToInfo: AddressInfo,
  ) {
    const createLabelDto = this.buildCreateLabelDto(order, shipFromInfo, shipToInfo);
    const result = await carrier.createLabel(createLabelDto);

    if ("isAmbiguous" in result && result.isAmbiguous) {
      return {
        isAmbiguous: true as const,
        message: result.message,
        candidates: result.candidates,
        trackingNumber: "",
        actualFee: Number(order.totalFee),
        pdfBuffer: undefined,
        rawRequestPayload: result.rawRequest || createLabelDto,
        rawResponsePayload: result.rawEnvelope || result,
      };
    }

    const successResult = result as {
      shipmentIdentificationNumber?: string;
      packageResults?: Array<{ trackingNumber: string }>;
      totalCharges?: { monetaryValue?: number };
      rawRequest?: unknown;
    };
    const trackingNumber = successResult.shipmentIdentificationNumber || successResult.packageResults?.[0]?.trackingNumber || "";
    const actualFee = successResult.totalCharges?.monetaryValue ? Number(successResult.totalCharges.monetaryValue) : Number(order.totalFee);
    let pdfBuffer: Buffer | undefined;

    if (carrier.printLabel) {
      const printResult = await carrier.printLabel({ trackingNumber, encoded: true });
      pdfBuffer = printResult.pdfBuffer;
    }

    return {
      isAmbiguous: false as const,
      message: undefined,
      candidates: undefined,
      trackingNumber,
      actualFee,
      pdfBuffer,
      rawRequestPayload: result.rawRequest || createLabelDto,
      rawResponsePayload: result.rawEnvelope || result,
    };
  }

  /**
   * Purchase / Generate Shipping Label for an Order.
   */
  private async preCheckWalletBalance(order: OrderRecord) {
    if (!this.deps.topupRepo) return;
    const walletBalance = await this.deps.topupRepo.getWalletBalance(order.customerId);
    const totalFee = Number(order.totalFee || 0);
    if (walletBalance < totalFee) {
      throw new ErrorWithCode(
        ErrorCode.ValidationError,
        `Số dư ví khả dụng (${walletBalance.toFixed(2)}$) không đủ để mua label cho đơn hàng #${order.orderCode} (${totalFee.toFixed(2)}$). Vui lòng nạp thêm tiền vào ví.`,
        400,
      );
    }
  }

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: wallet deduction workflow
  private async deductWalletBeforeCreation(
    order: OrderRecord,
    params: PurchaseLabelParams,
  ) {
    if (!this.deps.topupRepo) return;
    const currentFee = Number(order.totalFee || 0);

    // Check if order was already paid previously in topup_transactions
    const existingPayment = await prisma.topupTransaction.findFirst({
      where: {
        orderId: order.id,
        topupType: TopupType.PAID,
        status: TopupStatus.CONFIRMED,
      },
    });

    if (existingPayment) {
      // Fee Difference Ledger Logic cho đơn đã từng thanh toán trước đó
      const previousPaidFee = Number(existingPayment.wireAmountApprove || order.totalFee || 0);
      const feeDiff = roundCurrency(currentFee - previousPaidFee);

      if (feeDiff > 0) {
        // Cước mới cao hơn ➔ Thu bù chênh lệch
        await this.deps.topupRepo.payOrderWithWallet({
          orderId: order.id,
          orderCode: order.orderCode,
          amount: feeDiff,
          customerId: order.customerId,
          actorId: params.operatorId || params.customerId,
          description: `Thanh toán bổ sung chênh lệch cước đổi địa chỉ đơn #${order.orderCode}`,
        });

        await this.deps.orderRepo.createActivityLog({
          orderId: order.id,
          action: "FEE_ADJUSTMENT_DECREASE",
          statusFrom: order.status,
          statusTo: order.status,
          description: `THU BÙ CHÊNH LỆCH CƯỚC: Đã trừ bổ sung $${feeDiff} từ ví khách (Cước cũ: $${previousPaidFee}, Cước mới: $${currentFee})`,
          metadata: { previousPaidFee, currentFee, feeDiff },
          actorType: params.operatorId ? "OPERATOR" : "CUSTOMER",
          actorId: params.operatorId || params.customerId || "system",
          actorName: params.operatorId ? "Operator" : "Customer",
          actorUsername: params.operatorId ? "operator" : "customer",
          actorEmail: null,
        });
      } else if (feeDiff < 0) {
        // Cước mới thấp hơn ➔ Hoàn cước dư
        const refundAmount = Math.abs(feeDiff);
        await this.deps.topupRepo.refundOrderWithWallet({
          orderId: order.id,
          orderCode: order.orderCode,
          amount: refundAmount,
          customerId: order.customerId,
          actorId: params.operatorId || params.customerId,
          description: `Hoàn tiền chênh lệch cước đổi địa chỉ đơn #${order.orderCode}`,
        });

        await this.deps.orderRepo.createActivityLog({
          orderId: order.id,
          action: "FEE_ADJUSTMENT_INCREASE",
          statusFrom: order.status,
          statusTo: order.status,
          description: `HOÀN CƯỚC DƯ: Đã hoàn lại $${refundAmount} vào ví khách (Cước cũ: $${previousPaidFee}, Cước mới: $${currentFee})`,
          metadata: { previousPaidFee, currentFee, feeDiff },
          actorType: params.operatorId ? "OPERATOR" : "CUSTOMER",
          actorId: params.operatorId || params.customerId || "system",
          actorName: params.operatorId ? "Operator" : "Customer",
          actorUsername: params.operatorId ? "operator" : "customer",
          actorEmail: null,
        });
      }
    } else {
      // Trừ tiền cước ban đầu TRƯỚC KHI MUA LABEL
      await this.deps.topupRepo.payOrderWithWallet({
        orderId: order.id,
        orderCode: order.orderCode,
        amount: currentFee,
        customerId: order.customerId,
        actorId: params.operatorId || params.customerId,
        description: `Thanh toán cước phí tạo nhãn tem đơn #${order.orderCode}`,
      });
    }
  }

  /**
   * Transient Pre-commit Atomic Order & Label Creation for REST API (B2B).
   * 1. Acquires Redis lock for sellerOrderId.
   * 2. Constructs transient order data in RAM (using OrderService.prepareOrderData).
   * 3. Calls payOrderWithWallet directly to deduct wallet balance before calling Carrier API.
   * 4. Calls Carrier Provider API (EpicHub).
   * 5. On Carrier Failure / Ambiguous address:
   *    - Auto-refunds wallet balance 100%.
   *    - Writes partnerAuditLog with orderId = null for admin diagnostics.
   *    - NO rows inserted in `orders` DB table.
   * 6. On Carrier Success:
   *    - Performs single DB transaction (`runInTransaction`):
   *      Inserts `orders` (status = LABEL_CREATED, labelStatus = SUCCESS, trackingNumber, labelUrl),
   *      `order_products`, `order_fee_items`, `order_activity_logs`, `partner_audit_logs`.
   *    - Emits `order.created` event.
   *    - Returns full order detail response.
   */
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: atomic label purchase flow
  public async purchaseLabelAtomic(params: CreateOrderParams) {
    const lockKey = `idempotency:lock:${params.customerId}:${params.sellerOrderId}`;
    const redis = getRedisClient();
    const lockAcquired = await redis.set(lockKey, "LOCKED", "EX", 30, "NX");
    if (!lockAcquired) {
      throw new ErrorWithCode(
        ErrorCode.Conflict,
        `Đơn hàng có mã sellerOrderId "${params.sellerOrderId}" đang được xử lý mua nhãn tem. Vui lòng chờ trong giây lát.`,
        409,
      );
    }

    try {
      const { getOrderService } = await import("@ecom/features/di/containers/OrderService");
      const orderService = getOrderService();
      const { inputData, pricing, dimensionText, orderCode, totalFee } =
        await orderService.prepareOrderData(params);

      // BƯỚC 1: TRỪ TIỀN VÍ TRƯỚC (Deduct-First - Gọi trực tiếp payOrderWithWallet)
      if (this.deps.topupRepo) {
        await this.deps.topupRepo.payOrderWithWallet({
          orderId: orderCode,
          orderCode,
          amount: Number(totalFee),
          customerId: params.customerId,
          actorId: params.customerId,
          description: `Thanh toán cước phí tạo nhãn tem REST API đơn #${orderCode}`,
        });
      }

      const carrierCode = CARRIER_CODES.EPICHUB;
      const carrier = this.getCarrierProvider(carrierCode);
      const shipFromInfo = this.buildShipFromInfo(inputData.shippingOrigin);

      const transientOrder = {
        id: orderCode,
        orderCode,
        customerId: params.customerId,
        shippingMethod: inputData.shippingMethod,
        shippingOrigin: inputData.shippingOrigin,
        carrierCode,
        receiverName: inputData.receiverName,
        receiverPhone: inputData.receiverPhone,
        receiverEmail: inputData.receiverEmail,
        receiverAddress1: inputData.receiverAddress1,
        receiverAddress2: inputData.receiverAddress2,
        receiverCity: inputData.receiverCity,
        receiverState: inputData.receiverState,
        receiverCountry: inputData.receiverCountry,
        receiverZipCode: inputData.receiverZipCode,
        declaredWeight: inputData.declaredWeight,
        dimensionLength: inputData.dimensionLength,
        dimensionWidth: inputData.dimensionWidth,
        dimensionHeight: inputData.dimensionHeight,
        products: params.products || [],
        totalFee,
      };

      const shipToInfo = this.buildShipToInfo(transientOrder as unknown as OrderRecord);

      let rawRequestPayload: unknown = this.buildCreateLabelDto(
        transientOrder as unknown as OrderRecord,
        shipFromInfo,
        shipToInfo,
      );
      let rawResponsePayload: unknown;

      let creation: Awaited<ReturnType<typeof this.executeCarrierLabelCreation>>;
      try {
        creation = await this.executeCarrierLabelCreation(
          carrier,
          transientOrder as unknown as OrderRecord,
          shipFromInfo,
          shipToInfo,
        );
        rawRequestPayload = creation.rawRequestPayload;
        rawResponsePayload = creation.rawResponsePayload;
      } catch (carrierErr) {
        // Auto refund wallet on Carrier API failure
        if (this.deps.topupRepo) {
          await this.deps.topupRepo.refundOrderWithWallet({
            orderId: orderCode,
            orderCode,
            amount: Number(totalFee),
            customerId: params.customerId,
            actorId: params.customerId,
            description: `Tự động hoàn tiền REST API đơn #${orderCode} do lỗi Carrier`,
          });
        }

        const errObj = carrierErr as Error;
        const partnerErr = carrierErr as { rawResponse?: unknown; rawRequest?: unknown };
        const reqPayload = partnerErr?.rawRequest || rawRequestPayload;
        const resPayload = partnerErr?.rawResponse || rawResponsePayload;

        await prisma.partnerAuditLog
          .create({
            data: {
              orderId: null,
              partnerCode: carrierCode.toUpperCase(),
              serviceType: "LASTMILE",
              action: "CREATE_LABEL",
              requestId: orderCode,
              status: "FAILURE",
              errorMessage: errObj?.message || String(carrierErr),
              rawRequest: reqPayload ? (toSafeJson(reqPayload) as Prisma.InputJsonValue) : Prisma.JsonNull,
              rawResponse: resPayload ? (toSafeJson(resPayload) as Prisma.InputJsonValue) : Prisma.JsonNull,
            },
          })
          .catch((auditErr) => {
            console.warn("[purchaseLabelAtomic] Failed to log partner audit:", auditErr);
          });

        throw carrierErr;
      }

      if (creation.isAmbiguous) {
        // Auto refund wallet on Ambiguous address
        if (this.deps.topupRepo) {
          await this.deps.topupRepo.refundOrderWithWallet({
            orderId: orderCode,
            orderCode,
            amount: Number(totalFee),
            customerId: params.customerId,
            actorId: params.customerId,
            description: `Tự động hoàn tiền REST API đơn #${orderCode} do lỗi địa chỉ Carrier`,
          });
        }

        await prisma.partnerAuditLog
          .create({
            data: {
              orderId: null,
              partnerCode: carrierCode.toUpperCase(),
              serviceType: "LASTMILE",
              action: "CREATE_LABEL",
              requestId: orderCode,
              status: "FAILURE",
              errorMessage: `Address Ambiguous (202): ${creation.message}`,
              rawRequest: rawRequestPayload ? (toSafeJson(rawRequestPayload) as Prisma.InputJsonValue) : Prisma.JsonNull,
              rawResponse: rawResponsePayload ? (toSafeJson(rawResponsePayload) as Prisma.InputJsonValue) : Prisma.JsonNull,
            },
          })
          .catch((auditErr) => {
            console.warn("[purchaseLabelAtomic] Failed to log partner audit:", auditErr);
          });

        return {
          isAmbiguous: true,
          message: creation.message,
          candidates: creation.candidates,
          orderCode,
        };
      }

      const trackingNumber = creation.trackingNumber;
      const actualFee = creation.actualFee;
      const pdfBuffer = creation.pdfBuffer;

      let labelUrl = "";
      if (pdfBuffer && this.storage) {
        try {
          const fileName = `labels/${orderCode}_${trackingNumber || "label"}.pdf`;
          labelUrl = await this.storage.upload(pdfBuffer, fileName, "application/pdf");
        } catch (uploadErr) {
          console.error(
            `[purchaseLabelAtomic] PDF label upload to storage failed for ${orderCode}:`,
            uploadErr,
          );
        }
      }

      // ATOMIC COMMIT INTO DB: Insert order with status LABEL_CREATED
      const createdOrder = await runInTransaction(async () => {
        const finalInputData = {
          ...inputData,
          status: OrderStatus.LABEL_CREATED,
          labelStatus: LabelStatus.SUCCESS,
          trackingNumber,
          labelUrl: labelUrl || null,
          paidFee: actualFee,
          actualFee,
          carrierCode,
        };

        const newOrder = await this.deps.orderRepo.create(finalInputData);

        await this.logLabelCreationAuditAndLogs(
          newOrder,
          carrierCode,
          trackingNumber,
          actualFee,
          labelUrl || "",
          { orderId: newOrder.id, customerId: params.customerId },
          rawRequestPayload,
          rawResponsePayload,
        );

        return newOrder;
      });

      eventBus
        .emit("order.created", {
          orderId: createdOrder.id,
          customerId: params.customerId,
          status: createdOrder.status,
          orderCode: createdOrder.orderCode,
        })
        .catch((err) => {
          console.error("Failed to emit order.created event:", err);
        });

      return {
        ...createdOrder,
        totalFee: Number(createdOrder.totalFee),
        volumeWeight: pricing.volumeWeight,
        chargeableWeight: pricing.chargeableWeight,
        dimensionText,
      };
    } finally {
      await redis.del(lockKey).catch(() => {});
    }
  }

  /**
   * Purchase / Generate Shipping Label for an Order (Deduct-First with Compensation).
   */
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: label purchase flow
  public async purchaseLabel(params: PurchaseLabelParams & { isApiCall?: boolean }) {
    if (OrderLabelService.modifyingOrderIds.has(params.orderId)) {
      throw new ErrorWithCode(
        ErrorCode.ValidationError,
        `Đơn hàng #${params.orderId} đang trong quá trình xử lý mua nhãn tem, vui lòng chờ trong giây lát.`,
        400,
      );
    }

    OrderLabelService.modifyingOrderIds.add(params.orderId);

    try {
      const rawOrder = await this.deps.orderRepo.findById(params.orderId);
      this.validateOrder(rawOrder, params.customerId);
      const order = rawOrder;

      // Idempotent check: If label already purchased and saved locally
      if (order.trackingNumber && order.labelUrl && order.status === OrderStatus.LABEL_CREATED) {
        return order;
      }

      // BƯỚC 1: Pre-check số dư ví khả dụng
      await this.preCheckWalletBalance(order);

      // BƯỚC 2: TRỪ TIỀN VÍ TRƯỚC (Deduct-First)
      await this.deductWalletBeforeCreation(order, params);

      const carrierCode = order.carrierCode || CARRIER_CODES.EPICHUB;
      const carrier = this.getCarrierProvider(carrierCode);
      const shipFromInfo = this.buildShipFromInfo(order.shippingOrigin);
      const shipToInfo = this.buildShipToInfo(order);

      let pdfBuffer = await this.checkExistingLabelBuffer(carrier, order);
      let trackingNumber = order.trackingNumber || "";
      let actualFee = Number(order.totalFee);

      let rawRequestPayload: unknown = this.buildCreateLabelDto(order, shipFromInfo, shipToInfo);
      let rawResponsePayload: unknown;

      if (!pdfBuffer) {
        try {
          // BƯỚC 3: GỌI CARRIER PARTNER API MUA LABEL
          const creation = await this.executeCarrierLabelCreation(carrier, order, shipFromInfo, shipToInfo);
          rawRequestPayload = creation.rawRequestPayload;
          rawResponsePayload = creation.rawResponsePayload;

          if (creation.isAmbiguous) {
            await this.deps.orderRepo.update(order.id, {
              labelStatus: LabelStatus.FAILED,
            });

            await this.logFailedPartnerAudit(
              order,
              carrierCode,
              `Address Ambiguous (202): ${creation.message}`,
              rawRequestPayload,
              "CREATE_LABEL",
              rawResponsePayload,
            );

            // Nếu là REST API B2B call -> Compensation Auto-Refund 100% tiền ví
            if (params.isApiCall && this.deps.topupRepo) {
              await this.deps.topupRepo.refundOrderWithWallet({
                orderId: order.id,
                orderCode: order.orderCode,
                amount: Number(order.totalFee),
                customerId: order.customerId,
                actorId: params.operatorId || params.customerId,
                description: `Tự động hoàn tiền REST API đơn #${order.orderCode} do lỗi địa chỉ Carrier`,
              });
            }

            return {
              isAmbiguous: true,
              message: creation.message,
              candidates: creation.candidates,
              orderId: order.id,
              orderCode: order.orderCode,
            };
          }

          trackingNumber = creation.trackingNumber;
          actualFee = creation.actualFee;
          pdfBuffer = creation.pdfBuffer;
        } catch (err: unknown) {
          const errObj = err as Error;
          const partnerErr = err as { rawResponse?: unknown; rawRequest?: unknown };
          const reqPayload = partnerErr?.rawRequest || rawRequestPayload;
          const resPayload = partnerErr?.rawResponse || rawResponsePayload;

          await this.deps.orderRepo.update(order.id, {
            labelStatus: LabelStatus.FAILED,
          });

          await this.logFailedPartnerAudit(
            order,
            carrierCode,
            errObj?.message || String(err),
            reqPayload,
            "CREATE_LABEL",
            resPayload,
          );

          // Nếu là REST API B2B call -> Compensation Auto-Refund 100% tiền ví
          if (params.isApiCall && this.deps.topupRepo) {
            await this.deps.topupRepo.refundOrderWithWallet({
              orderId: order.id,
              orderCode: order.orderCode,
              amount: Number(order.totalFee),
              customerId: order.customerId,
              actorId: params.operatorId || params.customerId,
              description: `Tự động hoàn tiền REST API đơn #${order.orderCode} do lỗi Carrier`,
            });
          }

          throw err;
        }
      }

      if (!pdfBuffer) {
        const err = new ErrorWithCode(
          ErrorCode.InternalError,
          `Không thể lấy file nhãn PDF cho vận đơn ${trackingNumber}`,
          500,
        );
        await this.logFailedPartnerAudit(order, carrierCode, err.message, rawRequestPayload);
        throw err;
      }

      // BƯỚC 4: MUA LABEL SUCCESS -> Lưu PDF & Cập nhật Order DB
      return await this.persistLabelAndUpdateOrder(
        order,
        carrierCode,
        trackingNumber,
        pdfBuffer,
        actualFee,
        params,
        rawRequestPayload,
        rawResponsePayload,
      );
    } finally {
      OrderLabelService.modifyingOrderIds.delete(params.orderId);
    }
  }

  /**
   * Void / Cancel Shipping Label for an Order.
   */
  public async voidLabel(params: PurchaseLabelParams) {
    const rawOrder = await this.deps.orderRepo.findById(params.orderId);
    this.validateOrder(rawOrder, params.customerId);
    const order = rawOrder;

    if (!order.trackingNumber && !order.labelUrl) {
      throw new ErrorWithCode(
        ErrorCode.ValidationError,
        "Đơn hàng chưa có mã vận đơn hoặc chưa được mua nhãn tem",
        400,
      );
    }

    const allowedStatuses: OrderStatus[] = [
      OrderStatus.LABEL_CREATED,
      OrderStatus.WAITING_FOR_PICKUP,
      OrderStatus.PENDING_LABEL,
    ];

    if (!allowedStatuses.includes(order.status)) {
      throw new ErrorWithCode(
        ErrorCode.ValidationError,
        `Không thể hủy nhãn cho đơn hàng ở trạng thái '${order.status}'. Chỉ có thể hủy nhãn khi đơn hàng chưa xuất kho.`,
        400,
      );
    }

    const carrierCode = order.carrierCode || CARRIER_CODES.EPICHUB;
    const carrier = this.getCarrierProvider(carrierCode);

    if (!carrier.voidLabel) {
      throw new ErrorWithCode(
        ErrorCode.ValidationError,
        `Đối tác vận chuyển ${carrierCode} không hỗ trợ tính năng hủy nhãn`,
        400,
      );
    }

    const trackingNumber = order.trackingNumber || "";
    if (!trackingNumber) {
      throw new ErrorWithCode(
        ErrorCode.ValidationError,
        "Đơn hàng chưa có mã vận đơn (Tracking Number) để thực hiện hủy nhãn",
        400,
      );
    }

    let voidResult: Record<string, unknown> | undefined;
    try {
      voidResult = (await carrier.voidLabel(trackingNumber)) as unknown as Record<string, unknown>;
    } catch (err: unknown) {
      const errObj = err as Error;
      const partnerErr = err as { rawResponse?: unknown; rawRequest?: unknown };
      const reqPayload = partnerErr?.rawRequest || { trackingNumber };
      const resPayload = partnerErr?.rawResponse;

      await this.logFailedPartnerAudit(
        order,
        carrierCode,
        `Void Label Failed: ${errObj?.message || String(err)}`,
        reqPayload,
        "VOID_LABEL",
        resPayload,
      );
      throw new ErrorWithCode(
        ErrorCode.InternalError,
        `Hủy nhãn với đối tác ${carrierCode} thất bại: ${errObj?.message || String(err)}`,
        500,
      );
    }

    // Delete PDF file from storage if exists
    if (order.labelUrl) {
      try {
        await this.storage.delete(order.labelUrl);
      } catch (err) {
        console.warn(`[OrderLabelService] Failed to delete label PDF on void: ${order.labelUrl}`, err);
      }
    }

    const updatedOrder = await this.executeVoidOrderTransaction(
      order,
      carrierCode,
      trackingNumber,
      voidResult,
      params,
    );

    eventBus
      .emit("order.status_updated", {
        orderId: updatedOrder.id,
        customerId: order.customerId,
        status: updatedOrder.status,
        orderCode: updatedOrder.orderCode,
      })
      .catch((err) => {
        console.error("Failed to emit order.status_updated event on void:", err);
      });

    return updatedOrder;
  }

  private async refundWalletForVoid(order: OrderRecord, netRefundedFee: number, params: PurchaseLabelParams) {
    if (!this.deps.topupRepo || netRefundedFee <= 0) return;
    try {
      await this.deps.topupRepo.refundOrderWithWallet({
        orderId: order.id,
        orderCode: order.orderCode,
        amount: netRefundedFee,
        customerId: order.customerId,
        actorId: params.operatorId || params.customerId,
        description: `Hoàn tiền cước phí hủy nhãn tem đơn #${order.orderCode}`,
      });
    } catch (refundErr) {
      console.error(
        `[OrderLabelService] Failed to refund customer wallet on void label for order #${order.orderCode}:`,
        refundErr,
      );
    }
  }

  private async executeVoidRefundAndAudit(
    order: OrderRecord,
    carrierCode: string,
    trackingNumber: string,
    voidResult: Record<string, unknown> | undefined,
    params: PurchaseLabelParams,
  ) {
    const { partner, partnerService } = await this.resolvePartnerAndService(carrierCode);
    const serviceCode = partnerService?.code || EPICHUB_DEFAULT_SERVICE_CODE;

    const originalFee = Number(order.totalFee);
    const feePercent = typeof voidResult?.voidFeePercent === "number" ? voidResult.voidFeePercent : 0;
    const netRefundedFee = roundCurrency(originalFee * (1 - feePercent / 100));

    await this.deps.orderRepo.createActivityLog({
      orderId: order.id,
      action: "VOID_LABEL",
      statusFrom: order.status,
      statusTo: OrderStatus.PENDING_LABEL,
      description: `Hủy nhãn tem thành công từ đối tác ${carrierCode} (Tracking: ${trackingNumber}, Phí hủy Carrier: ${feePercent}%, Hoàn ví: $${netRefundedFee})`,
      metadata: {
        carrierCode,
        serviceCode,
        trackingNumber,
        originalFee,
        voidFeePercent: feePercent,
        netRefundedFee,
      },
      actorType: params.operatorId ? "OPERATOR" : "CUSTOMER",
      actorId: params.operatorId || params.customerId || "system",
      actorName: params.operatorId ? "Operator" : "Customer",
      actorUsername: params.operatorId ? "operator" : "customer",
      actorEmail: null,
    });
    const rawResponsePayload = voidResult?.rawEnvelope
      ? toSafeJson(voidResult.rawEnvelope)
      : voidResult
      ? toSafeJson(voidResult)
      : { status: "SUCCESS" };

    await prisma.partnerAuditLog.create({
      data: {
        orderId: order.id,
        partnerId: partner?.id || null,
        partnerServiceId: partnerService?.id || null,
        partnerCode: carrierCode.toUpperCase(),
        serviceType: "LASTMILE",
        action: "VOID_LABEL",
        requestId: order.orderCode,
        serviceCode: serviceCode,
        externalRefId: trackingNumber,
        quotedFee: 0,
        actualFee: -netRefundedFee,
        currency: "USD",
        status: "SUCCESS",
        rawRequest: toSafeJson({ trackingNumber, carrierCode }) as Prisma.InputJsonValue,
        rawResponse: rawResponsePayload as Prisma.InputJsonValue,
      },
    });

    await this.refundWalletForVoid(order, netRefundedFee, params);
  }

  private async executeVoidOrderTransaction(
    order: OrderRecord,
    carrierCode: string,
    trackingNumber: string,
    voidResult: Record<string, unknown> | undefined,
    params: PurchaseLabelParams,
  ) {
    return runInTransaction(async () => {
      const saved = await this.deps.orderRepo.update(order.id, {
        trackingNumber: null,
        labelUrl: null,
        status: OrderStatus.PENDING_LABEL,
        labelStatus: LabelStatus.CANCELLED,
        isGetLabel: GET_LABEL_OPTION.GET_LABEL_LATER,
      });

      await this.executeVoidRefundAndAudit(order, carrierCode, trackingNumber, voidResult, params);

      return saved;
    });
  }

  /**
   * Khấu trừ ví bổ sung / Đối soát tự động các đơn hàng đã tạo tem nhưng chưa trừ tiền ví (log PAYMENT_FAILED_RECONCILE)
   */
  public async reconcilePendingLabelPayment(params: {
    orderId: string;
    actorId?: string;
    actorType?: "SYSTEM" | "OPERATOR";
  }) {
    if (OrderLabelService.reconcilingOrderIds.has(params.orderId)) {
      throw new Error(`Đơn hàng #${params.orderId} đang trong quá trình đối soát, vui lòng chờ trong giây lát.`);
    }

    OrderLabelService.reconcilingOrderIds.add(params.orderId);

    try {
      const order = await this.deps.orderRepo.findById(params.orderId);
      if (!order) {
        throw new ErrorWithCode(ErrorCode.NotFound, "Không tìm thấy đơn hàng", 404);
      }

      if (!this.deps.topupRepo) {
        throw new Error("Repository topup chưa được Inject vào OrderLabelService");
      }

      const labelFeeRaw = (order as unknown as { labelFee?: unknown }).labelFee;
      const actualFee = labelFeeRaw ? Number(labelFeeRaw) : Number(order.totalFee || 0);
      const feeToDeduct = roundCurrency(actualFee);

      const balance = await this.deps.topupRepo.getWalletBalance(order.customerId);
      if (balance < feeToDeduct) {
        throw new Error(`Số dư ví khả dụng (${balance.toFixed(2)}$) không đủ để khấu trừ cước phí (${feeToDeduct.toFixed(2)}$).`);
      }

      await this.deps.topupRepo.payOrderWithWallet({
        orderId: order.id,
        orderCode: order.orderCode,
        amount: feeToDeduct,
        customerId: order.customerId,
        actorId: params.actorId || "system",
        description: `Khấu trừ bổ sung cước phí nhãn tem đơn #${order.orderCode}`,
      });

      const isOperator = params.actorType === "OPERATOR";
      await this.deps.orderRepo.createActivityLog({
        orderId: order.id,
        action: "RECONCILE_SUCCESS",
        statusFrom: order.status,
        statusTo: order.status,
        description: `ĐỐI SOÁT THÀNH CÔNG: Đã khấu trừ bổ sung $${feeToDeduct} cước tem vào ví khách hàng`,
        metadata: {
          carrierCode: order.carrierCode || CARRIER_CODES.EPICHUB,
          trackingNumber: order.trackingNumber,
          amountDeducted: feeToDeduct,
          actorType: params.actorType || "SYSTEM",
        },
        actorType: isOperator ? "OPERATOR" : "SYSTEM",
        actorId: params.actorId || "system",
        actorName: isOperator ? "Operator" : "System Reconciler",
        actorUsername: isOperator ? "operator" : "system",
        actorEmail: null,
      });

      return {
        success: true,
        feeDeducted: feeToDeduct,
        remainingBalance: roundCurrency(balance - feeToDeduct),
      };
    } finally {
      OrderLabelService.reconcilingOrderIds.delete(params.orderId);
    }
  }
}
