import { ForbiddenException } from "@nestjs/common";
import type { Request } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CustomerOrderController } from "./customer-order.controller";
import type { CreateBulkOrdersDto, CreateOrderDto } from "./dto/create-order.dto";
import type { GetCustomerOrdersDto } from "./dto/query-order.dto";

const mockCreateOrder = vi.fn();
const mockGetCustomerOrders = vi.fn();
const mockGetCustomerOrderDetail = vi.fn();
const mockCancelCustomerOrder = vi.fn();
const mockCalculateOrderFreight = vi.fn();

vi.mock("@ecom/features/di/containers/OrderService", () => ({
  getOrderService: () => ({
    createOrder: mockCreateOrder,
    getCustomerOrders: mockGetCustomerOrders,
    getCustomerOrderDetail: mockGetCustomerOrderDetail,
    cancelCustomerOrder: mockCancelCustomerOrder,
    calculateOrderFreight: mockCalculateOrderFreight,
  }),
}));

const mockRedisGet = vi.fn();
const mockRedisSet = vi.fn();

vi.mock("@ecom/lib/redis", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@ecom/lib/redis")>();
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
        receiverName: "Recipient",
        receiverCity: "Hanoi",
        receiverState: "HN",
        receiverAddress1: "123 Street",
        receiverCountry: "VN",
        receiverZipCode: "100000",
        detailDescription: "Goods",
        declaredWeight: 500,
        declaredValue: 20,
      };

      await expect(controller.createOrder(req, body)).rejects.toThrow(ForbiddenException);
    });
  });

  describe("createOrder", () => {
    it("should call orderService.createOrder with customerId", async () => {
      const req = mockCustomerReq("cust_123");
      const body: CreateOrderDto = {
        shippingMethod: "EXPRESS",
        receiverName: "Recipient",
        receiverCity: "Hanoi",
        receiverState: "HN",
        receiverAddress1: "123 Street",
        receiverCountry: "VN",
        receiverZipCode: "100000",
        detailDescription: "Goods",
        declaredWeight: 500,
        declaredValue: 20,
      };

      mockCreateOrder.mockResolvedValue({
        id: "ord_1",
        orderCode: "EC2607230001",
      });

      const result = await controller.createOrder(req, body);

      expect(mockCreateOrder).toHaveBeenCalledWith({
        ...body,
        customerId: "cust_123",
      });
      expect(result.id).toBe("ord_1");
    });

    it("should return cached response if idempotency key exists in Redis", async () => {
      const req = mockCustomerReq("cust_123");
      const body: CreateOrderDto = {
        shippingMethod: "EXPRESS",
        receiverName: "Recipient",
        receiverCity: "Hanoi",
        receiverState: "HN",
        receiverAddress1: "123 Street",
        receiverCountry: "VN",
        receiverZipCode: "100000",
        detailDescription: "Goods",
        declaredWeight: 500,
        declaredValue: 20,
      };

      mockRedisGet.mockResolvedValue(JSON.stringify({ id: "cached_ord", orderCode: "EC_CACHED" }));

      const result = await controller.createOrder(req, body, "idempotency_123");

      expect(mockRedisGet).toHaveBeenCalledWith("idempotency:customer:cust_123:idempotency_123");
      expect(mockCreateOrder).not.toHaveBeenCalled();
      expect(result.id).toBe("cached_ord");
    });
  });

  describe("createOrdersBulk", () => {
    it("should create orders bulk and return results array", async () => {
      const req = mockCustomerReq("cust_123");
      const body: CreateBulkOrdersDto = {
        orders: [
          {
            shippingMethod: "EXPRESS",
            receiverName: "Recipient 1",
            receiverCity: "Hanoi",
            receiverState: "HN",
            receiverAddress1: "123 Street",
            receiverCountry: "VN",
            receiverZipCode: "100000",
            detailDescription: "Goods 1",
            declaredWeight: 500,
            declaredValue: 20,
          },
        ],
      };

      mockCreateOrder.mockResolvedValue({
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
