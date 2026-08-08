import type { ShippingOrigin } from "@ecom/prisma";
import { ForbiddenException } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import type { Request } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CustomerOrderController } from "./customer-order.controller";
import { type CreateBulkOrdersDto, CreateOrderDto } from "./dto/create-order.dto";
import type { GetCustomerOrdersDto } from "./dto/query-order.dto";

const mockCreateOrder = vi.fn();
const mockGetCustomerOrders = vi.fn();
const mockGetCustomerOrderDetail = vi.fn();
const mockCancelCustomerOrder = vi.fn();
const mockCalculateOrderFreight = vi.fn();

const mockPurchaseLabelAtomic = vi.fn();

vi.mock("@ecom/features/di/containers/OrderService", () => ({
  getOrderService: () => ({
    createOrder: mockCreateOrder,
    getCustomerOrders: mockGetCustomerOrders,
    getCustomerOrderDetail: mockGetCustomerOrderDetail,
    cancelCustomerOrder: mockCancelCustomerOrder,
    calculateOrderFreight: mockCalculateOrderFreight,
  }),
  getOrderRepository: () => ({}),
}));

vi.mock("@ecom/features/di/containers/OrderLabelService", () => ({
  getOrderLabelService: () => ({
    purchaseLabelAtomic: mockPurchaseLabelAtomic,
  }),
}));

const mockRedisGet = vi.fn();
const mockRedisSet = vi.fn();

vi.mock("@flash-ship/ecom-lib/redis", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@flash-ship/ecom-lib/redis")>();
  return {
    ...actual,
    getRedisClient: () => ({
      get: mockRedisGet,
      set: mockRedisSet,
    }),
  };
});

describe("CustomerOrderController", () => {
  let controller: CustomerOrderController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new CustomerOrderController();
  });

  const mockCustomerReq = (id = "cust_uuid_123") =>
    ({
      apiUser: {
        id,
        email: "customer@example.com",
        name: "Test Customer",
        authMethod: "api_key",
        permissions: ["customer"],
        ownerType: "Customer",
      },
    }) as unknown as Request;

  const mockUserReq = () =>
    ({
      apiUser: {
        id: "user_uuid_456",
        email: "admin@example.com",
        name: "Admin",
        authMethod: "jwt",
        permissions: ["admin"],
        ownerType: "User",
      },
    }) as unknown as Request;

  describe("Authorization Check", () => {
    it("should throw ForbiddenException if user is not a Customer", async () => {
      const req = mockUserReq();
      const body: CreateOrderDto = {
        shippingMethod: "EXPRESS",
        shippingOrigin: "HAN",
        sellerOrderId: "SELLER-123",
        senderName: "Kho Hang Ha Noi",
        senderPhone: "0912345678",
        senderAddress: "100 Nguyen Trai",
        senderCity: "Hanoi",
        senderWard: "Thuong Dinh",
        senderCountry: "VN",
        senderZipCode: "100000",
        receiverName: "Recipient",
        receiverCity: "Hanoi",
        receiverState: "HN",
        receiverAddress1: "123 Street",
        receiverCountry: "VN",
        receiverZipCode: "100000",
        detailDescription: "Goods",
        declaredWeight: 500,
        dimensionLength: 20,
        dimensionWidth: 15,
        dimensionHeight: 10,
        declaredValue: 20,
      };

      await expect(controller.createOrder(req, body)).rejects.toThrow(ForbiddenException);
    });
  });

  describe("createOrder", () => {
    it("should call purchaseLabelAtomic with customerId and isGetLabel = 1 regardless of body isGetLabel", async () => {
      const req = mockCustomerReq("cust_123");
      const body: CreateOrderDto = {
        shippingMethod: "EXPRESS",
        shippingOrigin: "HAN",
        sellerOrderId: "SELLER-123",
        senderName: "Kho Hang Ha Noi",
        senderPhone: "0912345678",
        senderAddress: "100 Nguyen Trai",
        senderCity: "Hanoi",
        senderWard: "Thuong Dinh",
        senderCountry: "VN",
        senderZipCode: "100000",
        receiverName: "Recipient",
        receiverCity: "Hanoi",
        receiverState: "HN",
        receiverAddress1: "123 Street",
        receiverCountry: "VN",
        receiverZipCode: "100000",
        detailDescription: "Goods",
        declaredWeight: 500,
        dimensionLength: 20,
        dimensionWidth: 15,
        dimensionHeight: 10,
        declaredValue: 20,
        isGetLabel: 0,
      };

      mockPurchaseLabelAtomic.mockResolvedValue({
        id: "ord_1",
        orderCode: "EC2607230001",
      });

      const result = await controller.createOrder(req, body);

      expect(mockPurchaseLabelAtomic).toHaveBeenCalledWith({
        ...body,
        isGetLabel: 1,
        customerId: "cust_123",
      });
      expect(result.id).toBe("ord_1");
    });

    it("should return cached response if idempotency key exists in Redis", async () => {
      const req = mockCustomerReq("cust_123");
      const body: CreateOrderDto = {
        shippingMethod: "EXPRESS",
        shippingOrigin: "HAN",
        sellerOrderId: "SELLER-123",
        senderName: "Kho Hang Ha Noi",
        senderPhone: "0912345678",
        senderAddress: "100 Nguyen Trai",
        senderCity: "Hanoi",
        senderWard: "Thuong Dinh",
        senderCountry: "VN",
        senderZipCode: "100000",
        receiverName: "Recipient",
        receiverCity: "Hanoi",
        receiverState: "HN",
        receiverAddress1: "123 Street",
        receiverCountry: "VN",
        receiverZipCode: "100000",
        detailDescription: "Goods",
        declaredWeight: 500,
        dimensionLength: 20,
        dimensionWidth: 15,
        dimensionHeight: 10,
        declaredValue: 20,
      };

      mockRedisGet.mockResolvedValue(JSON.stringify({ id: "cached_ord", orderCode: "EC_CACHED" }));

      const result = await controller.createOrder(req, body, "idempotency_123");

      expect(mockRedisGet).toHaveBeenCalledWith("idempotency:customer:cust_123:idempotency_123");
      expect(result.id).toBe("cached_ord");
    });

    it("should transform isGetLabel payload values (true, 1, '1', false, 0) to GET_LABEL_OPTION.GET_LABEL_NOW (1)", async () => {
      const dtoTrue = plainToInstance(CreateOrderDto, { isGetLabel: true });
      const dtoNum = plainToInstance(CreateOrderDto, { isGetLabel: 1 });
      const dtoStr = plainToInstance(CreateOrderDto, { isGetLabel: "1" });
      const dtoFalse = plainToInstance(CreateOrderDto, { isGetLabel: false });
      const dtoZero = plainToInstance(CreateOrderDto, { isGetLabel: 0 });

      expect(dtoTrue.isGetLabel).toBe(1);
      expect(dtoNum.isGetLabel).toBe(1);
      expect(dtoStr.isGetLabel).toBe(1);
      expect(dtoFalse.isGetLabel).toBe(1);
      expect(dtoZero.isGetLabel).toBe(1);
    });

    it("should fail validation with exact message when shippingMethod is empty or invalid", async () => {
      const dto = plainToInstance(CreateOrderDto, {
        shippingMethod: "",
        shippingOrigin: "HAN",
        senderName: "Kho Hang Ha Noi",
        senderPhone: "0912345678",
        senderAddress: "100 Nguyen Trai",
        senderCity: "Hanoi",
        senderWard: "Thuong Dinh",
        senderCountry: "VN",
        senderZipCode: "100000",
        receiverName: "Recipient",
        receiverCity: "Hanoi",
        receiverState: "HN",
        receiverAddress1: "123 Street",
        receiverCountry: "VN",
        receiverZipCode: "100000",
        detailDescription: "Goods",
        declaredWeight: 500,
        dimensionLength: 20,
        dimensionWidth: 15,
        dimensionHeight: 10,
        declaredValue: 20,
      });

      const errors = await validate(dto, { always: true, groups: ["create"] });
      const shippingMethodError = errors.find((e) => e.property === "shippingMethod");

      expect(shippingMethodError).toBeDefined();
      expect(Object.values(shippingMethodError?.constraints || {})).toContain(
        'Phương thức vận chuyển (shippingMethod) không hợp lệ, chỉ chấp nhận "EXPRESS" hoặc "EPACKET"',
      );
    });

    it("should fail validation with exact message when shippingOrigin is invalid", async () => {
      const dto = plainToInstance(CreateOrderDto, {
        shippingMethod: "EXPRESS",
        senderName: "FlashShip Sender",
        senderPhone: "0912345678",
        senderAddress: "100 Nguyen Trai",
        senderCity: "Hanoi",
        senderWard: "Thuong Dinh",
        senderCountry: "VN",
        senderZipCode: "100000",
        shippingOrigin: "DAD" as unknown as ShippingOrigin,
        receiverName: "Recipient",
        receiverCity: "Hanoi",
        receiverState: "HN",
        receiverAddress1: "123 Street",
        receiverCountry: "VN",
        receiverZipCode: "100000",
        detailDescription: "Goods",
        declaredWeight: 500,
        dimensionLength: 20,
        dimensionWidth: 15,
        dimensionHeight: 10,
        declaredValue: 20,
      });

      const errors = await validate(dto, { always: true, groups: ["create"] });
      const originError = errors.find((e) => e.property === "shippingOrigin");

      expect(originError).toBeDefined();
      expect(Object.values(originError?.constraints || {})).toContain(
        'Mã kho xuất hàng (shippingOrigin) không hợp lệ, chỉ chấp nhận "HAN" hoặc "SGN"',
      );
    });

    it("should fail validation with exact message when senderName is empty or missing", async () => {
      const dto = plainToInstance(CreateOrderDto, {
        shippingMethod: "EXPRESS",
        shippingOrigin: "HAN",
        senderName: "",
        senderPhone: "0912345678",
        senderAddress: "100 Nguyen Trai",
        senderCity: "Hanoi",
        senderWard: "Thuong Dinh",
        senderCountry: "VN",
        senderZipCode: "100000",
        receiverName: "Recipient",
        receiverCity: "Hanoi",
        receiverState: "HN",
        receiverAddress1: "123 Street",
        receiverCountry: "VN",
        receiverZipCode: "100000",
        detailDescription: "Goods",
        declaredWeight: 500,
        dimensionLength: 20,
        dimensionWidth: 15,
        dimensionHeight: 10,
        declaredValue: 20,
      });

      const errors = await validate(dto, { always: true, groups: ["create"] });
      const senderNameError = errors.find((e) => e.property === "senderName");

      expect(senderNameError).toBeDefined();
      expect(Object.values(senderNameError?.constraints || {})).toContain(
        "Tên người gửi (senderName) không được để trống",
      );
    });

    it("should fail validation with exact message when senderPhone is empty or missing", async () => {
      const dto = plainToInstance(CreateOrderDto, {
        shippingMethod: "EXPRESS",
        shippingOrigin: "HAN",
        senderName: "Kho Hang Ha Noi",
        senderPhone: "",
        senderAddress: "100 Nguyen Trai",
        senderCity: "Hanoi",
        senderWard: "Thuong Dinh",
        senderCountry: "VN",
        senderZipCode: "100000",
        receiverName: "Recipient",
        receiverCity: "Hanoi",
        receiverState: "HN",
        receiverAddress1: "123 Street",
        receiverCountry: "VN",
        receiverZipCode: "100000",
        detailDescription: "Goods",
        declaredWeight: 500,
        dimensionLength: 20,
        dimensionWidth: 15,
        dimensionHeight: 10,
        declaredValue: 20,
      });

      const errors = await validate(dto, { always: true, groups: ["create"] });
      const senderPhoneError = errors.find((e) => e.property === "senderPhone");

      expect(senderPhoneError).toBeDefined();
      expect(Object.values(senderPhoneError?.constraints || {})).toContain(
        "Số điện thoại người gửi (senderPhone) không được để trống",
      );
    });

    it("should fail validation with exact message when senderPhone contains invalid characters or length", async () => {
      const dto = plainToInstance(CreateOrderDto, {
        shippingMethod: "EXPRESS",
        shippingOrigin: "HAN",
        senderName: "Kho Hang Ha Noi",
        senderPhone: "12345", // too short
        senderAddress: "100 Nguyen Trai",
        senderCity: "Hanoi",
        senderWard: "Thuong Dinh",
        senderCountry: "VN",
        senderZipCode: "100000",
        receiverName: "Recipient",
        receiverCity: "Hanoi",
        receiverState: "HN",
        receiverAddress1: "123 Street",
        receiverCountry: "VN",
        receiverZipCode: "100000",
        detailDescription: "Goods",
        declaredWeight: 500,
        dimensionLength: 20,
        dimensionWidth: 15,
        dimensionHeight: 10,
        declaredValue: 20,
      });

      const errors = await validate(dto, { always: true, groups: ["create"] });
      const senderPhoneError = errors.find((e) => e.property === "senderPhone");

      expect(senderPhoneError).toBeDefined();
      expect(Object.values(senderPhoneError?.constraints || {})).toContain(
        "Số điện thoại người gửi chỉ được chứa chữ số, dấu + ở đầu và từ 9-15 ký tự.",
      );
    });

    it("should fail validation with exact message when receiverPhone contains invalid characters or length", async () => {
      const dto = plainToInstance(CreateOrderDto, {
        shippingMethod: "EXPRESS",
        shippingOrigin: "HAN",
        senderName: "Kho Hang Ha Noi",
        senderPhone: "0912345678",
        senderAddress: "100 Nguyen Trai",
        senderCity: "Hanoi",
        senderWard: "Thuong Dinh",
        senderCountry: "VN",
        senderZipCode: "100000",
        receiverName: "Recipient",
        receiverPhone: "invalid_phone_123",
        receiverCity: "Hanoi",
        receiverState: "HN",
        receiverAddress1: "123 Street",
        receiverCountry: "VN",
        receiverZipCode: "100000",
        detailDescription: "Goods",
        declaredWeight: 500,
        dimensionLength: 20,
        dimensionWidth: 15,
        dimensionHeight: 10,
        declaredValue: 20,
      });

      const errors = await validate(dto, { always: true, groups: ["create"] });
      const receiverPhoneError = errors.find((e) => e.property === "receiverPhone");

      expect(receiverPhoneError).toBeDefined();
      expect(Object.values(receiverPhoneError?.constraints || {})).toContain(
        "Số điện thoại người nhận chỉ được chứa chữ số, dấu + ở đầu và từ 9-15 ký tự.",
      );
    });

    it("should transform lowercase senderCountry 'vn' to uppercase 'VN' and pass validation", async () => {
      const dto = plainToInstance(CreateOrderDto, {
        shippingMethod: "EXPRESS",
        shippingOrigin: "HAN",
        sellerOrderId: "SELLER-123",
        senderName: "Kho Hang Ha Noi",
        senderPhone: "0912345678",
        senderAddress: "100 Nguyen Trai",
        senderCity: "Hanoi",
        senderWard: "Thuong Dinh",
        senderCountry: "vn",
        senderZipCode: "100000",
        receiverName: "Recipient",
        receiverCity: "Hanoi",
        receiverState: "HN",
        receiverAddress1: "123 Street",
        receiverCountry: "VN",
        receiverZipCode: "100000",
        detailDescription: "Goods",
        declaredWeight: 500,
        dimensionLength: 20,
        dimensionWidth: 15,
        dimensionHeight: 10,
        declaredValue: 20,
      });

      const errors = await validate(dto, { always: true, groups: ["create"] });
      expect(errors).toHaveLength(0);
      expect(dto.senderCountry).toBe("VN");
    });

    it("should fail validation with exact message when senderCountry is not 'VN'", async () => {
      const dto = plainToInstance(CreateOrderDto, {
        shippingMethod: "EXPRESS",
        shippingOrigin: "HAN",
        senderName: "Kho Hang Ha Noi",
        senderPhone: "0912345678",
        senderAddress: "100 Nguyen Trai",
        senderCity: "Hanoi",
        senderWard: "Thuong Dinh",
        senderCountry: "US",
        senderZipCode: "100000",
        receiverName: "Recipient",
        receiverCity: "Hanoi",
        receiverState: "HN",
        receiverAddress1: "123 Street",
        receiverCountry: "VN",
        receiverZipCode: "100000",
        detailDescription: "Goods",
        declaredWeight: 500,
        dimensionLength: 20,
        dimensionWidth: 15,
        dimensionHeight: 10,
        declaredValue: 20,
      });

      const errors = await validate(dto, { always: true, groups: ["create"] });
      const senderCountryError = errors.find((e) => e.property === "senderCountry");

      expect(senderCountryError).toBeDefined();
      expect(Object.values(senderCountryError?.constraints || {})).toContain(
        "Quốc gia người gửi (senderCountry) chưa được hỗ trợ",
      );
    });

    it("should fail validation with 'không được để trống' message when senderCountry is empty or missing", async () => {
      const dto = plainToInstance(CreateOrderDto, {
        shippingMethod: "EXPRESS",
        shippingOrigin: "HAN",
        senderName: "Kho Hang Ha Noi",
        senderPhone: "0912345678",
        senderAddress: "100 Nguyen Trai",
        senderCity: "Hanoi",
        senderWard: "Thuong Dinh",
        senderCountry: "",
        senderZipCode: "100000",
        receiverName: "Recipient",
        receiverCity: "Hanoi",
        receiverState: "HN",
        receiverAddress1: "123 Street",
        receiverCountry: "VN",
        receiverZipCode: "100000",
        detailDescription: "Goods",
        declaredWeight: 500,
        dimensionLength: 20,
        dimensionWidth: 15,
        dimensionHeight: 10,
        declaredValue: 20,
      });

      const errors = await validate(dto, { always: true, groups: ["create"] });
      const senderCountryError = errors.find((e) => e.property === "senderCountry");

      expect(senderCountryError).toBeDefined();
      expect(Object.values(senderCountryError?.constraints || {})).toContain(
        "Quốc gia người gửi (senderCountry) không được để trống",
      );
      expect(Object.values(senderCountryError?.constraints || {})).not.toContain(
        "Quốc gia người gửi (senderCountry) chưa được hỗ trợ",
      );
    });

    it("should fail validation with exact message when sellerOrderId is empty or missing", async () => {
      const dto = plainToInstance(CreateOrderDto, {
        shippingMethod: "EXPRESS",
        shippingOrigin: "HAN",
        sellerOrderId: "",
        senderName: "Kho Hang Ha Noi",
        senderPhone: "0912345678",
        senderAddress: "100 Nguyen Trai",
        senderCity: "Hanoi",
        senderWard: "Thuong Dinh",
        senderCountry: "VN",
        senderZipCode: "100000",
        receiverName: "Recipient",
        receiverCity: "Hanoi",
        receiverState: "HN",
        receiverAddress1: "123 Street",
        receiverCountry: "VN",
        receiverZipCode: "100000",
        detailDescription: "Goods",
        declaredWeight: 500,
        dimensionLength: 20,
        dimensionWidth: 15,
        dimensionHeight: 10,
        declaredValue: 20,
      });

      const errors = await validate(dto, { always: true, groups: ["create"] });
      const sellerOrderIdErr = errors.find((e) => e.property === "sellerOrderId");

      expect(sellerOrderIdErr).toBeDefined();
      expect(Object.values(sellerOrderIdErr?.constraints || {})).toContain(
        "Mã đơn hàng người bán (sellerOrderId) không được để trống",
      );
    });

    it("should fail validation when detailDescription exceeds 200 characters", async () => {
      const dto = plainToInstance(CreateOrderDto, {
        shippingMethod: "EXPRESS",
        shippingOrigin: "HAN",
        senderName: "Kho Hang Ha Noi",
        senderPhone: "0912345678",
        senderAddress: "100 Nguyen Trai",
        senderCity: "Hanoi",
        senderWard: "Thuong Dinh",
        senderCountry: "VN",
        senderZipCode: "100000",
        receiverName: "Recipient",
        receiverCity: "Hanoi",
        receiverState: "HN",
        receiverAddress1: "123 Street",
        receiverCountry: "VN",
        receiverZipCode: "100000",
        detailDescription: "a".repeat(201),
        declaredWeight: 500,
        dimensionLength: 20,
        dimensionWidth: 15,
        dimensionHeight: 10,
        declaredValue: 20,
      });

      const errors = await validate(dto, { always: true, groups: ["create"] });
      const detailDescError = errors.find((e) => e.property === "detailDescription");

      expect(detailDescError).toBeDefined();
      expect(Object.values(detailDescError?.constraints || {})).toContain(
        "Mô tả chi tiết hàng hóa (detailDescription) không được vượt quá 200 ký tự",
      );
    });

    it("should fail validation when dimensionLength or declaredWeight is a decimal float instead of integer", async () => {
      const dto = plainToInstance(CreateOrderDto, {
        shippingMethod: "EXPRESS",
        shippingOrigin: "HAN",
        senderName: "Kho Hang Ha Noi",
        senderPhone: "0912345678",
        senderAddress: "100 Nguyen Trai",
        senderCity: "Hanoi",
        senderWard: "Thuong Dinh",
        senderCountry: "VN",
        senderZipCode: "100000",
        receiverName: "Recipient",
        receiverCity: "Hanoi",
        receiverState: "HN",
        receiverAddress1: "123 Street",
        receiverCountry: "VN",
        receiverZipCode: "100000",
        detailDescription: "Goods",
        declaredWeight: 500.5,
        dimensionLength: 20.5,
        dimensionWidth: 15,
        dimensionHeight: 10,
        declaredValue: 20,
      });

      const errors = await validate(dto, { always: true, groups: ["create"] });
      const lengthError = errors.find((e) => e.property === "dimensionLength");
      const weightError = errors.find((e) => e.property === "declaredWeight");

      expect(lengthError).toBeUndefined();
      expect(weightError).toBeDefined();
      expect(Object.values(weightError?.constraints || {})).toContain(
        "Trọng lượng khai báo (declaredWeight) phải là số nguyên dương",
      );
    });

    it("should fail validation when senderEmail or receiverEmail is not a valid email format", async () => {
      const dto = plainToInstance(CreateOrderDto, {
        shippingMethod: "EXPRESS",
        shippingOrigin: "HAN",
        senderName: "Kho Hang Ha Noi",
        senderPhone: "0912345678",
        senderEmail: "invalid-email-string",
        senderAddress: "100 Nguyen Trai",
        senderCity: "Hanoi",
        senderWard: "Thuong Dinh",
        senderCountry: "VN",
        senderZipCode: "100000",
        receiverName: "Recipient",
        receiverEmail: "not-an-email",
        receiverCity: "Hanoi",
        receiverState: "HN",
        receiverAddress1: "123 Street",
        receiverCountry: "VN",
        receiverZipCode: "100000",
        detailDescription: "Goods",
        declaredWeight: 500,
        dimensionLength: 20,
        dimensionWidth: 15,
        dimensionHeight: 10,
        declaredValue: 20,
      });

      const errors = await validate(dto, { always: true, groups: ["create"] });
      const senderEmailErr = errors.find((e) => e.property === "senderEmail");
      const receiverEmailErr = errors.find((e) => e.property === "receiverEmail");

      expect(senderEmailErr).toBeDefined();
      expect(Object.values(senderEmailErr?.constraints || {})).toContain(
        "Email người gửi (senderEmail) không đúng định dạng email",
      );
      expect(receiverEmailErr).toBeDefined();
      expect(Object.values(receiverEmailErr?.constraints || {})).toContain(
        "Email người nhận (receiverEmail) không đúng định dạng email",
      );
    });

    it("should fail validation when declaredWeight exceeds 70kg or dimensionLength exceeds 300cm", async () => {
      const dto = plainToInstance(CreateOrderDto, {
        shippingMethod: "EXPRESS",
        shippingOrigin: "HAN",
        senderName: "Kho Hang Ha Noi",
        senderPhone: "0912345678",
        senderAddress: "100 Nguyen Trai",
        senderCity: "Hanoi",
        senderWard: "Thuong Dinh",
        senderCountry: "VN",
        senderZipCode: "100000",
        receiverName: "Recipient",
        receiverCity: "Hanoi",
        receiverState: "HN",
        receiverAddress1: "123 Street",
        receiverCountry: "VN",
        receiverZipCode: "100000",
        detailDescription: "Goods",
        declaredWeight: 80000, // > 70,000g
        dimensionLength: 350, // > 300cm
        dimensionWidth: 15,
        dimensionHeight: 10,
        declaredValue: 20,
      });

      const errors = await validate(dto, { always: true, groups: ["create"] });
      const weightErr = errors.find((e) => e.property === "declaredWeight");
      const lengthErr = errors.find((e) => e.property === "dimensionLength");

      expect(weightErr).toBeDefined();
      expect(Object.values(weightErr?.constraints || {})).toContain(
        "Trọng lượng khai báo (declaredWeight) không được vượt quá 70,000 grams (70kg)",
      );
      expect(lengthErr).toBeDefined();
      expect(Object.values(lengthErr?.constraints || {})).toContain(
        "Chiều dài (dimensionLength) không được vượt quá 300 cm",
      );
    });

    it("should pass DTO validation when receiverCountry is a No-Zipcode country (e.g. HK) and receiverZipCode is empty", async () => {
      const dto = plainToInstance(CreateOrderDto, {
        shippingMethod: "EXPRESS",
        shippingOrigin: "HAN",
        sellerOrderId: "SELLER-HK-123",
        senderName: "Kho Hang Ha Noi",
        senderPhone: "0912345678",
        senderAddress: "100 Nguyen Trai",
        senderCity: "Hanoi",
        senderWard: "Thuong Dinh",
        senderCountry: "VN",
        senderZipCode: "100000",
        receiverName: "Recipient HK",
        receiverCity: "Hong Kong",
        receiverState: "HK",
        receiverAddress1: "Central Tower 8",
        receiverCountry: "HK",
        receiverZipCode: "",
        detailDescription: "Fashion Apparel",
        declaredWeight: 500,
        dimensionLength: 20,
        dimensionWidth: 15,
        dimensionHeight: 10,
        declaredValue: 20,
      });

      const errors = await validate(dto, { always: true, groups: ["create"] });
      const zipErr = errors.find((e) => e.property === "receiverZipCode");
      expect(zipErr).toBeUndefined();
    });

    it("should fail DTO validation when receiverZipCode is invalid format for specified country", async () => {
      const dto = plainToInstance(CreateOrderDto, {
        shippingMethod: "EXPRESS",
        shippingOrigin: "HAN",
        sellerOrderId: "SELLER-US-ERR",
        senderName: "Kho Hang Ha Noi",
        senderPhone: "0912345678",
        senderAddress: "100 Nguyen Trai",
        senderCity: "Hanoi",
        senderWard: "Thuong Dinh",
        senderCountry: "VN",
        senderZipCode: "100000",
        receiverName: "Recipient US",
        receiverCity: "New York",
        receiverState: "NY",
        receiverAddress1: "5th Avenue",
        receiverCountry: "US",
        receiverZipCode: "123", // invalid 3 digits for US
        detailDescription: "Fashion Apparel",
        declaredWeight: 500,
        dimensionLength: 20,
        dimensionWidth: 15,
        dimensionHeight: 10,
        declaredValue: 20,
      });

      const errors = await validate(dto, { always: true, groups: ["create"] });
      const zipErr = errors.find((e) => e.property === "receiverZipCode");

      expect(zipErr).toBeDefined();
      expect(Object.values(zipErr?.constraints || {}).join(" ")).toContain(
        "Mã bưu chính người nhận (receiverZipCode) không đúng định dạng",
      );
    });

    it("should pass DTO validation when detailDescription and declaredValue are omitted", async () => {
      const dto = plainToInstance(CreateOrderDto, {
        shippingMethod: "EXPRESS",
        shippingOrigin: "HAN",
        sellerOrderId: "SELLER-123",
        senderName: "Kho Hang Ha Noi",
        senderPhone: "0912345678",
        senderAddress: "100 Nguyen Trai",
        senderCity: "Hanoi",
        senderWard: "Thuong Dinh",
        senderCountry: "VN",
        senderZipCode: "100000",
        receiverName: "Recipient",
        receiverCity: "Hanoi",
        receiverState: "HN",
        receiverAddress1: "123 Street",
        receiverCountry: "VN",
        receiverZipCode: "100000",
        declaredWeight: 500,
        dimensionLength: 20,
        dimensionWidth: 15,
        dimensionHeight: 10,
        products: [
          {
            description: "Ao thoi trang Cotton",
            quantity: 2,
            value: 20,
            hsCode: "610910",
            originCountry: "VN",
          },
        ],
      });

      const errors = await validate(dto, { always: true, groups: ["create"] });
      expect(errors).toHaveLength(0);
    });

    it("should fail DTO validation when product hsCode is empty, missing, or invalid format", async () => {
      const dtoMissing = plainToInstance(CreateOrderDto, {
        products: [{ description: "Goods", quantity: 1, value: 10, hsCode: "", originCountry: "VN" }],
      });
      const dtoInvalid = plainToInstance(CreateOrderDto, {
        products: [{ description: "Goods", quantity: 1, value: 10, hsCode: "123", originCountry: "VN" }],
      });

      const errorsMissing = await validate(dtoMissing, { always: true, groups: ["create"] });
      const errorsInvalid = await validate(dtoInvalid, { always: true, groups: ["create"] });

      expect(errorsMissing.length).toBeGreaterThan(0);
      expect(errorsInvalid.length).toBeGreaterThan(0);
    });

    it("should fail DTO validation when product value is null, missing, or <= 0", async () => {
      const dtoNullValue = plainToInstance(CreateOrderDto, {
        shippingMethod: "EXPRESS",
        shippingOrigin: "HAN",
        sellerOrderId: "SELLER-123",
        senderName: "Kho Hang Ha Noi",
        senderPhone: "0912345678",
        senderAddress: "100 Nguyen Trai",
        senderCity: "Hanoi",
        senderWard: "Thuong Dinh",
        senderCountry: "VN",
        senderZipCode: "100000",
        receiverName: "Recipient",
        receiverCity: "Hanoi",
        receiverState: "HN",
        receiverAddress1: "123 Street",
        receiverCountry: "VN",
        receiverZipCode: "100000",
        declaredWeight: 500,
        dimensionLength: 20,
        dimensionWidth: 15,
        dimensionHeight: 10,
        products: [
          {
            description: "Ao thoi trang Cotton",
            quantity: 2,
            value: null as unknown as number,
            originCountry: "VN",
          },
        ],
      });

      const errorsNull = await validate(dtoNullValue, { always: true, groups: ["create"] });
      const productErrNull = errorsNull.find((e) => e.property === "products");
      expect(productErrNull).toBeDefined();

      const dtoZeroValue = plainToInstance(CreateOrderDto, {
        shippingMethod: "EXPRESS",
        shippingOrigin: "HAN",
        sellerOrderId: "SELLER-123",
        senderName: "Kho Hang Ha Noi",
        senderPhone: "0912345678",
        senderAddress: "100 Nguyen Trai",
        senderCity: "Hanoi",
        senderWard: "Thuong Dinh",
        senderCountry: "VN",
        senderZipCode: "100000",
        receiverName: "Recipient",
        receiverCity: "Hanoi",
        receiverState: "HN",
        receiverAddress1: "123 Street",
        receiverCountry: "VN",
        receiverZipCode: "100000",
        declaredWeight: 500,
        dimensionLength: 20,
        dimensionWidth: 15,
        dimensionHeight: 10,
        products: [
          {
            description: "Ao thoi trang Cotton",
            quantity: 2,
            value: 0,
            originCountry: "VN",
          },
        ],
      });

      const errorsZero = await validate(dtoZeroValue, { always: true, groups: ["create"] });
      const productErrZero = errorsZero.find((e) => e.property === "products");
      expect(productErrZero).toBeDefined();
      const childErrZero = productErrZero?.children?.[0]?.children?.find(
        (c) => c.property === "value",
      );
      expect(Object.values(childErrZero?.constraints || {})).toContain(
        "Giá trị sản phẩm (value) phải lớn hơn 0",
      );
    });
  });

  describe("createOrdersBulk", () => {
    it("should create orders bulk and return results array", async () => {
      const req = mockCustomerReq("cust_123");
      const body: CreateBulkOrdersDto = {
        orders: [
          {
            shippingMethod: "EXPRESS",
            shippingOrigin: "HAN",
            sellerOrderId: "SELLER-BULK-1",
            senderName: "Kho Hang Ha Noi",
            senderPhone: "0912345678",
            senderAddress: "100 Nguyen Trai",
            senderCity: "Hanoi",
            senderWard: "Thuong Dinh",
            senderCountry: "VN",
            senderZipCode: "100000",
            receiverName: "Recipient 1",
            receiverCity: "Hanoi",
            receiverState: "HN",
            receiverAddress1: "123 Street",
            receiverCountry: "VN",
            receiverZipCode: "100000",
            detailDescription: "Goods 1",
            declaredWeight: 500,
            dimensionLength: 20,
            dimensionWidth: 15,
            dimensionHeight: 10,
            declaredValue: 20,
            isGetLabel: 0,
          },
        ],
      };

      mockPurchaseLabelAtomic.mockResolvedValue({
        id: "bulk_1",
        orderCode: "EC260723BULK1",
      });

      const res = await controller.createOrdersBulk(req, body);

      expect(res.summary).toEqual({
        total: 1,
        succeeded: 1,
        failed: 0,
      });
      expect(res.data).toHaveLength(1);
      expect(res.data[0]).toMatchObject({
        index: 0,
        success: true,
        orderId: "bulk_1",
        orderCode: "EC260723BULK1",
      });
    });
  });

  describe("getOrders", () => {
    it("should call getCustomerOrders with query options", async () => {
      const req = mockCustomerReq("cust_123");
      const query: GetCustomerOrdersDto = {
        page: 1,
        limit: 10,
        orderCode: "EC2607",
        sellerOrderId: "SHOP123",
      };

      mockGetCustomerOrders.mockResolvedValue({
        data: [],
        meta: {
          total: 0,
          page: 1,
          perPage: 10,
          lastPage: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      });

      const res = await controller.getOrders(req, query);

      expect(mockGetCustomerOrders).toHaveBeenCalledWith({
        customerId: "cust_123",
        page: 1,
        perPage: 10,
        status: undefined,
        orderCode: "EC2607",
        sellerOrderId: "SHOP123",
        fromDate: undefined,
        toDate: undefined,
        search: undefined,
      });
      expect(res.data).toEqual([]);
    });
  });

  describe("getOrderDetail", () => {
    it("should call getCustomerOrderDetail", async () => {
      const req = mockCustomerReq("cust_123");
      mockGetCustomerOrderDetail.mockResolvedValue({
        id: "ord_100",
        orderCode: "EC100",
      });

      const res = await controller.getOrderDetail(req, "EC100");

      expect(mockGetCustomerOrderDetail).toHaveBeenCalledWith("cust_123", "EC100");
      expect(res.id).toBe("ord_100");
    });
  });

  describe("cancelOrder", () => {
    it("should call cancelCustomerOrder with reason", async () => {
      const req = mockCustomerReq("cust_123");
      mockCancelCustomerOrder.mockResolvedValue({
        id: "ord_100",
        status: "CANCELLED",
      });

      const res = await controller.cancelOrder(req, "EC100", { reason: "Wrong address" });

      expect(mockCancelCustomerOrder).toHaveBeenCalledWith("cust_123", "EC100", "Wrong address");
      expect(res.status).toBe("CANCELLED");
    });
  });

  describe("estimateFreight", () => {
    it("should call orderService.calculateOrderFreight with customerId and params", async () => {
      const req = mockCustomerReq("cust_123");
      mockCalculateOrderFreight.mockResolvedValue({
        baseShippingRate: 15.5,
        surchargeFee: 0,
        totalAmount: 15.5,
        chargeableWeight: 500,
        volumeWeight: 200,
      });

      const res = await controller.estimateFreight(req, {
        shippingMethod: "EXPRESS",
        receiverCountry: "US",
        declaredWeight: 500,
      });

      expect(mockCalculateOrderFreight).toHaveBeenCalledWith({
        customerId: "cust_123",
        shippingMethod: "EXPRESS",
        country: "US",
        declaredWeight: 500,
        dimensionLength: undefined,
        dimensionWidth: undefined,
        dimensionHeight: undefined,
        origin: undefined,
      });
      expect(res.totalFee).toBe(15.5);
    });
  });
});
