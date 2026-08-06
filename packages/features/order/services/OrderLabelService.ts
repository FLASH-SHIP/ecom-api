import { eventBus } from "@ecom/features/events/EventBus";
import { type AddressInfo, CARRIER_CODES, type CreateLabelDto, type ICarrierProvider } from "@ecom/features/integrations/carrier/interfaces/carrier-provider.interface";
import { LocalStorageAdapter } from "@ecom/features/media/storage/LocalStorageAdapter";
import { LabelStatus, OrderStatus, type Prisma, prisma, runInTransaction } from "@ecom/prisma";
import { toSafeJson } from "@flash-ship/ecom-lib";
import { ErrorCode } from "@flash-ship/ecom-lib/errorCodes";
import { ErrorWithCode } from "@flash-ship/ecom-lib/errors";
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
        isGetLabel: 1,
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

  private async deductWalletPostCreation(
    order: OrderRecord,
    actualFee: number,
    params: PurchaseLabelParams,
    carrierCode: string,
    trackingNumber: string,
  ) {
    if (!this.deps.topupRepo) return;
    const feeToDeduct = actualFee > 0 ? actualFee : Number(order.totalFee || 0);
    try {
      await this.deps.topupRepo.payOrderWithWallet({
        orderId: order.id,
        orderCode: order.orderCode,
        amount: feeToDeduct,
        customerId: order.customerId,
        actorId: params.operatorId || params.customerId,
        description: `Thanh toán cước phí tạo nhãn tem đơn #${order.orderCode}`,
      });
    } catch (payErr) {
      console.error(
        `[OrderLabelService] Warning: Label created on carrier but wallet payment failed for order #${order.orderCode}:`,
        payErr,
      );
      await this.deps.orderRepo.createActivityLog({
        orderId: order.id,
        action: "PAYMENT_FAILED_RECONCILE",
        statusFrom: order.status,
        statusTo: order.status,
        description: `CẢNH BÁO THU TIỀN: Tem đã tạo thành công trên carrier nhưng trừ tiền ví thất bại (${(payErr as Error)?.message}). Cần đối soát thu lại tiền ví.`,
        metadata: {
          carrierCode,
          trackingNumber,
          amountToDeduct: actualFee,
          errorMessage: (payErr as Error)?.message,
        },
        actorType: "SYSTEM",
        actorId: "system",
        actorName: "System",
        actorUsername: "system",
        actorEmail: null,
      });
    }
  }

  /**
   * Purchase / Generate Shipping Label for an Order.
   */
  public async purchaseLabel(params: PurchaseLabelParams) {
    const rawOrder = await this.deps.orderRepo.findById(params.orderId);
    this.validateOrder(rawOrder, params.customerId);
    const order = rawOrder;

    // Idempotent check: If label already purchased and saved locally
    if (order.trackingNumber && order.labelUrl && order.status === OrderStatus.LABEL_CREATED) {
      return order;
    }

    await this.preCheckWalletBalance(order);

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
        const creation = await this.executeCarrierLabelCreation(carrier, order, shipFromInfo, shipToInfo);
        rawRequestPayload = creation.rawRequestPayload;
        rawResponsePayload = creation.rawResponsePayload;

        if (creation.isAmbiguous) {
          await this.logFailedPartnerAudit(
            order,
            carrierCode,
            `Address Ambiguous (202): ${creation.message}`,
            rawRequestPayload,
            "CREATE_LABEL",
            rawResponsePayload,
          );
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

        await this.logFailedPartnerAudit(
          order,
          carrierCode,
          errObj?.message || String(err),
          reqPayload,
          "CREATE_LABEL",
          resPayload,
        );
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

    await this.deductWalletPostCreation(order, actualFee, params, carrierCode, trackingNumber);

    return this.persistLabelAndUpdateOrder(
      order,
      carrierCode,
      trackingNumber,
      pdfBuffer,
      actualFee,
      params,
      rawRequestPayload,
      rawResponsePayload,
    );
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
        isGetLabel: 0,
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
