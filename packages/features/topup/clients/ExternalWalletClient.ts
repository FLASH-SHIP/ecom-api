import crypto from "node:crypto";
import { Injectable, Logger } from "@nestjs/common";
import {
  type BuyerInfo,
  type ChargingRequest,
  type CreateWalletAccountRequest,
  EXTERNAL_WALLET_FROM_SYSTEM,
  EXTERNAL_WALLET_PAYMENT_TYPE,
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

  /** Map lưu vết các tiến trình đang tạo ví (In-Flight Lock) chống race-condition tạo trùng ví */
  private static readonly inFlightCreations = new Map<string, Promise<any>>();

  constructor() {
    this.baseUrl = (
      process.env.EXTERNAL_WALLET_API_BASE_URL || "https://dev-api.ecomexpress.vn"
    ).replace(/\/$/, "");
    this.secretKey = process.env.EXTERNAL_WALLET_SECRET_KEY || "";
  }

  private parseHttpError(response: Response, responseText: string): Error {
    let parsedErrorMsg = responseText;
    try {
      const parsed = JSON.parse(responseText);
      parsedErrorMsg = parsed.message || parsed.msg || parsed.error || responseText;
    } catch {
      // Giữ nguyên response text nếu không phải JSON
    }
    return new Error(`Hệ Thống Ví Độc Lập [HTTP ${response.status}]: ${parsedErrorMsg || response.statusText}`);
  }

  private validateBusinessResponse(
    data: unknown,
    targetUrl: string,
    rawBody: string,
    headers: Record<string, string>,
    responseText: string,
  ): void {
    if (!data || typeof data !== "object") return;

    const resObj = data as Record<string, unknown>;
    const validCodes = new Set([0, 200, "00", "200", "FLS_200"]);
    const isFailedSuccess = resObj.success === false;
    const isInvalidCode = resObj.code !== undefined && !validCodes.has(resObj.code as string | number);

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

  /**
   * Phương thức Base xử lý gửi POST request dùng chung cho tất cả 4 Endpoints của Hệ Thống Ví Độc Lập.
   * - Tự động đính kèm các Request Headers bắt buộc: `X-Timestamp`, `X-Signature`, `Content-Type`.
   * - Giữ nguyên `partnerId` dạng chuỗi (UUID String) để gửi sang Hệ Thống Ví Độc Lập.
   * - Tự động bóc tách và ném lỗi tập trung (throw Error) nếu gặp lỗi HTTP (4xx, 5xx) hoặc lỗi nghiệp vụ (code != 200 / success == false).
   */
  private async sendRequest<T>(endpoint: string, payload: unknown): Promise<T> {
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
    } catch (netErr: unknown) {
      const netMsg = (netErr as Error)?.message || String(netErr);
      this.logger.error(`Connection to External Wallet API failed (${targetUrl}): ${netMsg}`);
      throw new Error(`Kết nối đến Hệ Thống Ví Độc Lập thất bại (${targetUrl}): ${netMsg}`);
    }

    const responseText = await response.text();

    if (!response.ok) {
      const fullError = this.parseHttpError(response, responseText);
      this.logger.error(fullError.message, {
        targetUrl,
        rawBody,
        headers,
        responseText,
      });
      throw fullError;
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
        // Ưu tiên bóc tách trường resObj.err (ví dụ "Seller Not Found.") tránh bị ghi đè bởi resObj.msg ("fail")
        const errorMsg =
          (resObj.err && resObj.msg ? `${resObj.err} (${resObj.msg})` : resObj.err || resObj.message || resObj.error || resObj.msg) || JSON.stringify(data);

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
   * Kiểm tra lỗi phản hồi từ API ví xem có phải do tài khoản chưa được khởi tạo (Partner not found / Seller Not Found) hay không.
   * Bao phủ đầy đủ các biến thể lỗi từ Server Ví: Seller Not Found, Partner Not Found, Account Not Found, FLS_400, FLS_404...
   *
   * @param error Đối tượng lỗi nhận từ try-catch hoặc response
   * @returns true nếu lỗi do chưa có tài khoản ví
   */
  public isPartnerNotFound(error: any): boolean {
    if (!error) return false;
    // Bóc tách toàn bộ thông điệp lỗi từ error.message, error.err, error.msg, error.code
    const msg = String(
      error?.message || error?.msg || error?.err || error?.error || error?.code || error || "",
    ).toLowerCase();

    return (
      msg.includes("seller not found") ||
      msg.includes("seller_not_found") ||
      msg.includes("partner not found") ||
      msg.includes("partner_not_found") ||
      msg.includes("account not found") ||
      msg.includes("account_not_found") ||
      msg.includes("user not found") ||
      msg.includes("customer not found") ||
      msg.includes("chưa tồn tại") ||
      msg.includes("không tồn tại") ||
      msg.includes("not found") ||
      msg.includes("not_found") ||
      msg.includes("404") ||
      msg.includes("fls_400") ||
      msg.includes("fls_404")
    );
  }

  /**
   * Đảm bảo tài khoản ví được khởi tạo thành công (sử dụng In-Flight Lock chống race condition tạo trùng ví).
   * @param partnerId Mã ID duy nhất của đối tác/khách hàng (UUID)
   * @param partnerCodeSupplier Hàm callback bất đồng bộ cung cấp partnerCode (customerCode) từ DB
   */
  private async ensureAccountCreated(
    partnerId: string,
    partnerCodeSupplier: () => Promise<string>,
  ): Promise<ExternalWalletBaseResponse<WalletAccountData>> {
    // 1. Kiểm tra nếu đã có tiến trình tạo ví cho partnerId này đang chạy trong bộ nhớ -> dùng lại Promise đó (In-Flight Lock)
    const existingInFlight = ExternalWalletClient.inFlightCreations.get(partnerId);
    if (existingInFlight) {
      return existingInFlight;
    }

    // 2. Tạo tiến trình khởi tạo ví mới và lưu vào Map inFlightCreations
    const creationPromise = (async () => {
      try {
        // Lấy mã khách hàng (partnerCode) từ supplier
        const partnerCode = await partnerCodeSupplier();
        this.logger.log(
          `[Self-Healing] Tự động khởi tạo tài khoản ví cho partnerId=${partnerId}, partnerCode=${partnerCode}`,
        );
        // Gọi API POST /payment-api/account/create
        return await this.createAccount({ partnerId, partnerCode });
      } catch (creationError) {
        this.logger.error(
          `[Self-Healing] Lỗi tự động tạo tài khoản ví cho partnerId=${partnerId}:`,
          creationError,
        );
        throw creationError;
      } finally {
        // Luôn giải phóng khóa In-Flight Lock khỏi bộ nhớ sau khi hoàn tất hoặc gặp lỗi
        ExternalWalletClient.inFlightCreations.delete(partnerId);
      }
    })();

    ExternalWalletClient.inFlightCreations.set(partnerId, creationPromise);
    return creationPromise;
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
   * Nếu không có thông tin ví (Partner not found / data rỗng / không chứa dữ liệu ví) và có partnerCodeSupplier,
   * hệ thống sẽ tự động gọi /payment-api/account/create để khởi tạo ví và truy vấn lại (Self-Healing).
   *
   * @param payload Thông số truy vấn ví ({ partnerId })
   * @param partnerCodeSupplier Callback dự phòng lấy mã partnerCode từ DB khi cần khởi tạo ví
   */
  async getAccountInfo(
    payload: WalletAccountInfoRequest,
    partnerCodeSupplier?: () => Promise<string>,
  ): Promise<ExternalWalletBaseResponse<WalletAccountData>> {
    const isDataInvalid = (data: any) => {
      if (!data) return true;
      if (typeof data !== "object") return true;
      if (Object.keys(data).length === 0) return true;
      const hasBal =
        data.balance !== undefined ||
        data.accountBalance !== undefined ||
        data.account_balance !== undefined ||
        data.accountInfo?.balance !== undefined;
      return !hasBal && !data.partnerId && !data.partnerCode && !data.accountNumber;
    };

    try {
      // Gửi request POST /payment-api/account/info sang hệ thống ví độc lập
      const res = await this.sendRequest<ExternalWalletBaseResponse<WalletAccountData>>(
        "/payment-api/account/info",
        payload,
      );

      // Trường hợp 1: Kết nối HTTP 200 thành công nhưng data ví rỗng/null/không hợp lệ -> Kích hoạt tự động tạo ví (Self-Healing)
      if (isDataInvalid(res?.data) && partnerCodeSupplier) {
        this.logger.warn(
          `[Self-Healing] Thông tin ví trả về data rỗng hoặc không hợp lệ cho partnerId=${payload.partnerId}. Tiến hành tự động tạo ví...`,
        );
        await this.ensureAccountCreated(String(payload.partnerId), partnerCodeSupplier);
        // Retry truy vấn thông tin ví lại sau khi tạo thành công
        return await this.sendRequest<ExternalWalletBaseResponse<WalletAccountData>>(
          "/payment-api/account/info",
          payload,
        );
      }

      return res;
    } catch (err: any) {
      // Trường hợp 2: Bắt lỗi nghiệp vụ "Partner not found" khi chưa có ví -> Kích hoạt tự động tạo ví (Self-Healing)
      if (this.isPartnerNotFound(err) && partnerCodeSupplier) {
        this.logger.warn(
          `[Self-Healing] Bắt lỗi chưa có ví (Partner not found) cho partnerId=${payload.partnerId}. Tiến hành tự động tạo ví...`,
        );
        await this.ensureAccountCreated(String(payload.partnerId), partnerCodeSupplier);
        // Retry truy vấn thông tin ví lại sau khi tạo thành công
        return await this.sendRequest<ExternalWalletBaseResponse<WalletAccountData>>(
          "/payment-api/account/info",
          payload,
        );
      }
      // Ném lại lỗi hệ thống thực sự (HTTP 500, lỗi mạng...) nếu không phải lỗi chưa có ví
      throw err;
    }
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
  }): Promise<ExternalWalletBaseResponse<Record<string, unknown>>> {
    const fullPayload: ChargingRequest = {
      fromSystem: payload.fromSystem ?? EXTERNAL_WALLET_FROM_SYSTEM,
      buyerInfo: payload.buyerInfo,
      orderItem: {
        ...payload.orderItem,
        paymentType: payload.orderItem.paymentType ?? EXTERNAL_WALLET_PAYMENT_TYPE,
      },
    };
    return this.sendRequest<ExternalWalletBaseResponse<Record<string, unknown>>>(
      "/payment-api/charging-request",
      fullPayload,
    );
  }
}
