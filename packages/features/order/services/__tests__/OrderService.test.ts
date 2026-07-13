import type { RateCardService } from "@ecom/features/rate-card/services/RateCardService";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OrderRepository } from "../../repositories/OrderRepository";
import { OrderService } from "../OrderService";

vi.mock("@ecom/prisma", () => {
  return {
    prisma: {
      customer: {
        findUnique: vi.fn(),
      },
      user: {
        findFirst: vi.fn(),
      },
      orderFeeItem: {
        deleteMany: vi.fn(),
        createMany: vi.fn(),
        findMany: vi.fn(),
      },
      order: {
        update: vi.fn(),
      },
      orderActivityLog: {
        create: vi.fn(),
      },
    },
    runInTransaction: (work: () => any) => work(),
  };
});

describe("OrderService", () => {
  let orderRepoMock: Record<string, ReturnType<typeof vi.fn>>;
  let rateCardServiceMock: Record<string, ReturnType<typeof vi.fn>>;
  let service: OrderService;

  beforeEach(() => {
    orderRepoMock = {
      findByCode: vi.fn(),
      findBySellerOrderId: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      createActivityLog: vi.fn(),
      upsertTrackingCheckpoint: vi.fn(),
      findById: vi.fn(),
      update: vi.fn(),
    };

    rateCardServiceMock = {
      calculateFreight: vi.fn(),
      calculateFreightWithCardId: vi.fn(),
    };

    service = new OrderService({
      orderRepo: orderRepoMock as unknown as OrderRepository,
      rateCardService: rateCardServiceMock as unknown as RateCardService,
      orderCodePrefix: "TEST",
    });
  });

  describe("generateOrderCode", () => {
    it("should generate a code with prefix, date and base36 string", () => {
      const code = service.generateOrderCode();
      expect(code.startsWith("TEST")).toBe(true);
      expect(code.length).toBe(18); // TEST (4) + Date (6) + random (8) = 18
    });
  });

  describe("calculateWeights", () => {
    it("should calculate volume weight using divisor 5", () => {
      // 32 * 12 * 20 / 5 = 1536 grams
      const { volumeWeightGrams, chargeableWeightGrams } = service.calculateWeights(
        1000,
        32,
        12,
        20,
      );
      expect(volumeWeightGrams).toBe(1536);
      expect(chargeableWeightGrams).toBe(1536);
    });

    it("should default to declared weight if it is higher than volume weight", () => {
      // 10 * 10 * 10 / 5 = 200 grams. Declared weight is 500 grams.
      const { volumeWeightGrams, chargeableWeightGrams } = service.calculateWeights(
        500,
        10,
        10,
        10,
      );
      expect(volumeWeightGrams).toBe(200);
      expect(chargeableWeightGrams).toBe(500);
    });
  });

  describe("calculateOrderFreight", () => {
    it("should throw error if declared weight is 0 or negative", async () => {
      await expect(
        service.calculateOrderFreight({
          customerId: 1,
          shippingMethod: "EPACKET",
          country: "US",
          declaredWeight: 0,
        }),
      ).rejects.toThrow("Cân nặng khai báo phải lớn hơn 0");
    });

    it("should convert weight to kg and call rateCardService calculateFreight", async () => {
      rateCardServiceMock.calculateFreight.mockResolvedValue({
        freightCost: 15.5,
        appliedRateCardId: 10,
      });

      const res = await service.calculateOrderFreight({
        customerId: 1,
        shippingMethod: "EPACKET",
        country: "US",
        declaredWeight: 1500, // 1.5kg
        dimensionLength: 20,
        dimensionWidth: 10,
        dimensionHeight: 10, // 2000 / 5 = 400 grams volume weight. 1.5kg is higher.
      });

      expect(rateCardServiceMock.calculateFreight).toHaveBeenCalledWith({
        customerId: 1,
        shippingMethod: "EPACKET",
        country: "US",
        weight: 1.5,
        origin: undefined,
      });

      expect(res.baseShippingRate).toBe(15.5);
      expect(res.totalAmount).toBe(15.5);
      expect(res.chargeableWeight).toBe(1500);
    });
  });

  describe("createOrder", () => {
    it("should throw conflict error if sellerOrderId is already used", async () => {
      rateCardServiceMock.calculateFreight.mockResolvedValue({
        freightCost: 10,
        appliedRateCardId: 1,
      });

      orderRepoMock.findByCode.mockResolvedValue(null);
      orderRepoMock.findBySellerOrderId.mockResolvedValue({
        id: "order_123",
        sellerOrderId: "SHOP1001",
      });

      await expect(
        service.createOrder({
          customerId: 1,
          shippingMethod: "EPACKET",
          receiverName: "John Doe",
          receiverCity: "LA",
          receiverState: "CA",
          receiverAddress1: "123 St",
          receiverCountry: "US",
          receiverZipCode: "90001",
          detailDescription: "Shoes",
          declaredWeight: 1000,
          declaredValue: 50,
          sellerOrderId: "SHOP1001",
        }),
      ).rejects.toThrow(
        'Đơn hàng có mã tham chiếu Seller Order ID "SHOP1001" đã tồn tại trên hệ thống.',
      );
    });

    it("should successfully generate code, calculate rates and create order", async () => {
      rateCardServiceMock.calculateFreight.mockResolvedValue({
        freightCost: 25.0,
        appliedRateCardId: 5,
      });

      orderRepoMock.findByCode.mockResolvedValue(null);
      orderRepoMock.findBySellerOrderId.mockResolvedValue(null);
      orderRepoMock.create.mockResolvedValue({
        id: "new_order_id",
        orderCode: "TEST260711ABCDEFGH",
        status: "DRAFT",
        totalFee: 25.0,
        createdAt: new Date(),
      });

      const res = await service.createOrder({
        customerId: 1,
        shippingMethod: "EPACKET",
        receiverName: "John Doe",
        receiverCity: "LA",
        receiverState: "CA",
        receiverAddress1: "123 St",
        receiverCountry: "US",
        receiverZipCode: "90001",
        detailDescription: "Shoes",
        declaredWeight: 1000,
        declaredValue: 50,
        sellerOrderId: "SHOP1002",
      });

      expect(orderRepoMock.create).toHaveBeenCalled();
      expect(orderRepoMock.createActivityLog).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: "new_order_id",
          action: "STATUS_CHANGE",
          statusTo: "DRAFT",
          description: "Đơn hàng nháp được tạo thành công",
        }),
      );
      expect(res.id).toBe("new_order_id");
      expect(res.totalFee).toBe(25.0);
    });
  });

  describe("updateOrderStatus", () => {
    it("should transition status and write activity log", async () => {
      orderRepoMock.findById.mockResolvedValue({
        id: "order_123",
        status: "DRAFT",
      });

      orderRepoMock.update.mockResolvedValue({
        id: "order_123",
        status: "WAITING_FOR_PICKUP",
      });

      const res = await service.updateOrderStatus("order_123", "WAITING_FOR_PICKUP", "operator_1");

      expect(orderRepoMock.update).toHaveBeenCalledWith("order_123", {
        status: "WAITING_FOR_PICKUP",
      });
      expect(orderRepoMock.createActivityLog).toHaveBeenCalledWith({
        orderId: "order_123",
        action: "STATUS_CHANGE",
        statusFrom: "DRAFT",
        statusTo: "WAITING_FOR_PICKUP",
        description: "Trạng thái đơn hàng chuyển đổi từ DRAFT sang WAITING_FOR_PICKUP",
        metadata: null,
        actorType: "OPERATOR",
        actorId: "operator_1",
        actorName: "operator_1",
        actorUsername: "operator_1",
        actorEmail: null,
      });

      expect(res.status).toBe("WAITING_FOR_PICKUP");
    });

    it("should pass expectedVersion to repository update", async () => {
      orderRepoMock.findById.mockResolvedValue({
        id: "order_123",
        status: "DRAFT",
        version: 2,
      });

      orderRepoMock.update.mockResolvedValue({
        id: "order_123",
        status: "WAITING_FOR_PICKUP",
        version: 3,
      });

      const res = await service.updateOrderStatus(
        "order_123",
        "WAITING_FOR_PICKUP",
        "operator_1",
        null,
        2,
      );

      expect(orderRepoMock.update).toHaveBeenCalledWith("order_123", {
        status: "WAITING_FOR_PICKUP",
        expectedVersion: 2,
      });
      expect(res.status).toBe("WAITING_FOR_PICKUP");
    });
  });

  describe("recalculateOrderFees", () => {
    it("should throw error if order not found", async () => {
      orderRepoMock.findById.mockResolvedValue(null);

      await expect(service.recalculateOrderFees("invalid_id", "operator_1")).rejects.toThrow(
        "Đơn hàng không tồn tại",
      );
    });

    it("should throw validation error if order has no rateCardId when forceRefresh is false", async () => {
      orderRepoMock.findById.mockResolvedValue({
        id: "order_123",
        customerId: 1,
        shippingMethod: "EPACKET",
        chargeableWeight: 1500,
        rateCardId: null,
      });

      await expect(service.recalculateOrderFees("order_123", "operator_1", false)).rejects.toThrow(
        "Đơn hàng này không có bảng giá liên kết để tính lại cước",
      );
    });
  });
});
