import crypto from "node:crypto";
import { Injectable, Logger } from "@nestjs/common";
import {
  EXTERNAL_WALLET_FROM_SYSTEM,
  EXTERNAL_WALLET_PAYMENT_TYPE,
  type BuyerInfo,
  type ChargingRequest,
  type CreateWalletAccountRequest,
  type ExternalWalletBaseResponse,
  type OrderItemInfo,
  type UpdateCreditLimitRequest,
  type WalletAccountData,
  type WalletAccountInfoRequest,
} from "../dtos/externalWalletDTOs";

/**
 * Hàm sinh chữ ký điện tử HMAC-SHA256 dạng chuỗi Hex 64 ký tự viết thường.
 * Dữ liệu mã hóa bao gồm: `rawBody + timestamp`.
 * 
 * @param rawBody Chuỗi JSON stringify của request body.
 * @param secretKey Khóa bí mật cấu hình từ môi trường.
 * @param timestamp Chuỗi millisecond Unix epoch timestamp (UTC+7).
 */
export function generateWalletSignature(
  rawBody: string,
  secretKey: string,
  timestamp: string,
): string {
  const cleanKey = (secretKey || "").trim().replace(/^["']|["']$/g, "");
  if (!cleanKey) {
    throw new Error("Payment signature secret is not configured");
  }
  const dataToSign = `${rawBody}${timestamp}`;
  return crypto.createHmac("sha256", cleanKey).update(dataToSign, "utf8").digest("hex");
}

/**
 * Service Client kết nối tới Hệ Thống Ví Độc Lập (External Wallet Service).
 * Đảm nhiệm việc gửi request, tính toán chữ ký số bảo mật HMAC-SHA256 (rawBody + timestamp),
 * và xử lý lỗi tập trung cho toàn bộ 4 APIs tích hợp ví.
 */
@Injectable()
export class ExternalWalletClient {
  private readonly logger = new Logger(ExternalWalletClient.name);
  private readonly baseUrl: string;
  private readonly secretKey: string;

  constructor() {
    this.baseUrl = (
      process.env.EXTERNAL_WALLET_API_BASE_URL || "https://dev-api.ecomexpress.vn"
    ).replace(/\/$/, "");
    this.secretKey = process.env.EXTERNAL_WALLET_SECRET_KEY || "";
  }

  /**
   * Phương thức Base xử lý gửi POST request dùng chung cho tất cả 4 Endpoints của Hệ Thống Ví Độc Lập.
   * - Tự động đính kèm các Request Headers bắt buộc: `X-Timestamp`, `X-Signature`, `Content-Type`.
   * - Giữ nguyên `partnerId` dạng chuỗi (UUID String) để gửi sang Hệ Thống Ví Độc Lập.
   * - Tự động bóc tách và ném lỗi tập trung (throw Error) nếu gặp lỗi HTTP (4xx, 5xx) hoặc lỗi nghiệp vụ (code != 200 / success == false).
   */
  private async sendRequest<T>(endpoint: string, payload: Record<string, any>): Promise<T> {
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    const targetUrl = `${this.baseUrl}${cleanEndpoint}`;

    // Gửi payload trực tiếp dạng UUID string
    const rawBody = JSON.stringify(payload);
    const cleanSecretKey = (this.secretKey || "").trim().replace(/^["']|["']$/g, "");
    const timestamp = Date.now().toString();
    const signature = generateWalletSignature(rawBody, cleanSecretKey, timestamp);

    // Không gửi trùng tên header alias (x-timestamp, timestamp) tránh gây lỗi Invalid timestamp
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Timestamp": timestamp,
      "X-Signature": signature,
    };

    let response: Response;
    try {
      response = await fetch(targetUrl, {
        method: "POST",
        headers,
        body: rawBody,
      });
    } catch (netErr: any) {
      const netMsg = netErr?.message || String(netErr);
      this.logger.error(`Connection to External Wallet API failed (${targetUrl}): ${netMsg}`);
      throw new Error(`Kết nối đến Hệ Thống Ví Độc Lập thất bại (${targetUrl}): ${netMsg}`);
    }

    const responseText = await response.text();

    if (!response.ok) {
      let parsedErrorMsg = responseText;
      try {
        const parsed = JSON.parse(responseText);
        parsedErrorMsg = parsed.message || parsed.msg || parsed.error || responseText;
      } catch {
        // Giữ nguyên response text nếu không phải JSON
      }

      const fullError = `Hệ Thống Ví Độc Lập [HTTP ${response.status}]: ${parsedErrorMsg || response.statusText}`;
      this.logger.error(fullError, {
        targetUrl,
        rawBody,
        headers,
        responseText,
      });
      throw new Error(fullError);
    }

    let data: T;
    try {
      data = JSON.parse(responseText) as T;
    } catch {
      data = responseText as unknown as T;
    }

    const resObj = data as any;
    if (resObj && typeof resObj === "object") {
      const isFailedSuccess = resObj.success === false;
      const isInvalidCode =
        resObj.code !== undefined &&
        resObj.code !== 0 &&
        resObj.code !== 200 &&
        resObj.code !== "00" &&
        resObj.code !== "200" &&
        resObj.code !== "FLS_200";

      if (isFailedSuccess || isInvalidCode) {
        const errorMsg =
          resObj.message || resObj.msg || resObj.err || resObj.error || JSON.stringify(data);

        const fullBizError = `Hệ Thống Ví Độc Lập: ${errorMsg}`;
        this.logger.error(fullBizError, {
          targetUrl,
          rawBody,
          headers,
          responseText,
        });
        throw new Error(fullBizError);
      }
    }

    return data;
  }

  /**
   * 5.1 POST /payment-api/account/create
   * Khởi tạo tài khoản ví mới cho Partner (gửi partnerId dạng UUID string và partnerCode).
   */
  async createAccount(
    payload: CreateWalletAccountRequest,
  ): Promise<ExternalWalletBaseResponse<WalletAccountData>> {
    return this.sendRequest<ExternalWalletBaseResponse<WalletAccountData>>(
      "/payment-api/account/create",
      payload,
    );
  }

  /**
   * 5.2 POST /payment-api/account/info
   * Lấy thông tin chi tiết và số dư tài khoản ví của Partner.
   */
  async getAccountInfo(
    payload: WalletAccountInfoRequest,
  ): Promise<ExternalWalletBaseResponse<WalletAccountData>> {
    return this.sendRequest<ExternalWalletBaseResponse<WalletAccountData>>(
      "/payment-api/account/info",
      payload,
    );
  }

  /**
   * 5.3 POST /payment-api/account/update-credit-limit
   * Cập nhật hạn mức tín dụng (credit limit) cho tài khoản ví Partner.
   */
  async updateCreditLimit(
    payload: UpdateCreditLimitRequest,
  ): Promise<ExternalWalletBaseResponse<WalletAccountData>> {
    return this.sendRequest<ExternalWalletBaseResponse<WalletAccountData>>(
      "/payment-api/account/update-credit-limit",
      payload,
    );
  }

  /**
   * 5.4 POST /payment-api/charging-request
   * Thực hiện nạp hoặc trừ tiền trên tài khoản ví Partner.
   * Trường `fromSystem` mặc định là EXTERNAL_WALLET_FROM_SYSTEM ("ECOM").
   */
  async chargingRequest(payload: {
    fromSystem?: string;
    buyerInfo: BuyerInfo;
    orderItem: OrderItemInfo;
  }): Promise<ExternalWalletBaseResponse<any>> {
    const fullPayload: ChargingRequest = {
      fromSystem: payload.fromSystem ?? EXTERNAL_WALLET_FROM_SYSTEM,
      buyerInfo: payload.buyerInfo,
      orderItem: {
        ...payload.orderItem,
        paymentType: payload.orderItem.paymentType ?? EXTERNAL_WALLET_PAYMENT_TYPE,
      },
    };
    return this.sendRequest<ExternalWalletBaseResponse<any>>(
      "/payment-api/charging-request",
      fullPayload,
    );
  }
}
