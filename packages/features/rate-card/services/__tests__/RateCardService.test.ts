import { ErrorCode } from "@flash-ship/ecom-lib";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RateCardRepository } from "../../repositories/RateCardRepository";
import { RateCardService } from "../RateCardService";

// Mock @flash-ship/ecom-lib/redis
vi.mock("@flash-ship/ecom-lib/redis", () => {
  return {
    RedisCache: class {
      private prefix: string;
      private store: Record<string, unknown> = {};
      constructor(prefix: string) {
        this.prefix = prefix;
      }
      async get(key: string) {
        return this.store[key];
      }
      async set(key: string, data: unknown) {
        this.store[key] = data;
      }
      async invalidate(key: string) {
        delete this.store[key];
      }
    },
    getRedisClient: () => ({}),
  };
});

describe("RateCardService", () => {
  let rateCardRepo: Record<string, ReturnType<typeof vi.fn>>;
  let service: RateCardService;

  // Mock data setup
  const mockDefaultEpacketCard = {
    id: 1,
    code: "epacket.default.us",
    name: "Bảng giá Epacket Mặc định US",
    shippingMethod: "EPACKET",
    country: "US",
    origin: null,
    currency: "USD",
    weightStep: 0.05,
    minWeight: 0.05,
    maxWeight: 5.0,
    items: [
      { id: 101, startWeight: 0.0, endWeight: 0.05, rateType: "STEP_FIXED", amount: 3.5 },
      { id: 102, startWeight: 0.05, endWeight: 0.1, rateType: "STEP_FIXED", amount: 3.65 },
      { id: 103, startWeight: 0.1, endWeight: 0.15, rateType: "STEP_FIXED", amount: 3.8 },
      { id: 104, startWeight: 5.0, endWeight: 20.0, rateType: "RANGE_PER_KG", amount: 9.5 },
    ],
    groups: [],
  };

  const mockVipExpressCard = {
    id: 2,
    code: "express.vip.silver.us",
    name: "Bảng giá Express VIP Silver US",
    shippingMethod: "EXPRESS",
    country: "US",
    origin: null,
    currency: "USD",
    weightStep: 0.5,
    minWeight: 0.5,
    maxWeight: 20.0,
    items: [
      { id: 201, startWeight: 0.0, endWeight: 0.5, rateType: "STEP_FIXED", amount: 12.0 },
      { id: 202, startWeight: 0.5, endWeight: 1.0, rateType: "STEP_FIXED", amount: 13.5 },
      { id: 203, startWeight: 1.0, endWeight: 1.5, rateType: "STEP_FIXED", amount: 15.0 },
      { id: 204, startWeight: 20.0, endWeight: 44.0, rateType: "RANGE_PER_KG", amount: 9.99 },
    ],
    groups: [{ customerGroupId: 2 }],
  };

  beforeEach(() => {
    rateCardRepo = {
      findCustomerGroupIdByCustomerId: vi.fn(),
      findActiveByGroup: vi.fn(),
      findActiveDefault: vi.fn(),
      findById: vi.fn(),
      findOverlappingRateCards: vi.fn(),
      update: vi.fn(),
      archiveSupersededDefaultRateCards: vi.fn(),
    };

    service = new RateCardService({
      rateCardRepo: rateCardRepo as unknown as RateCardRepository,
    });
  });

  describe("calculateFreight", () => {
    it("should resolve using default system rate card when customer has no group or group card not found", async () => {
      rateCardRepo.findCustomerGroupIdByCustomerId.mockResolvedValue(null);
      rateCardRepo.findActiveDefault.mockResolvedValue(mockDefaultEpacketCard);

      const result = await service.calculateFreight({
        shippingMethod: "EPACKET",
        country: "US",
        weight: 0.08,
        customerId: "1",
      });

      expect(rateCardRepo.findActiveDefault).toHaveBeenCalled();
      expect(result.freightCost).toBe(3.65); // 0.08kg rounded up to 0.10kg slab (id: 102) -> 3.65
      expect(result.appliedRateCardId).toBe(1);
      expect(result.appliedRateCardSnapshot.rateCardCode).toBe("epacket.default.us");
    });

    it("should resolve group-specific rate card first if mapped to a customer group", async () => {
      rateCardRepo.findCustomerGroupIdByCustomerId.mockResolvedValue(2);
      rateCardRepo.findActiveByGroup.mockResolvedValue(mockVipExpressCard);

      const result = await service.calculateFreight({
        shippingMethod: "EXPRESS",
        country: "US",
        weight: 1.12, // rounded up to 1.50kg slab
        customerId: "1",
      });

      expect(rateCardRepo.findActiveByGroup).toHaveBeenCalledWith(
        "EXPRESS",
        "US",
        null,
        2,
        expect.any(Date),
      );
      expect(result.freightCost).toBe(15.0); // 1.5kg slab -> 15.00
    });

    it("should enforce minimum chargeable weight guard", async () => {
      rateCardRepo.findCustomerGroupIdByCustomerId.mockResolvedValue(null);
      rateCardRepo.findActiveDefault.mockResolvedValue(mockDefaultEpacketCard);

      const result = await service.calculateFreight({
        shippingMethod: "EPACKET",
        country: "US",
        weight: 0.02, // Less than minWeight (0.05kg)
        customerId: "1",
      });

      // 0.02kg is rounded up to 0.05kg (step 0.05). Since it matches minWeight, RW is 0.05kg -> amount 3.50
      expect(result.freightCost).toBe(3.5);
    });

    it("should enforce minimum chargeable weight for larger minWeight sheets", async () => {
      rateCardRepo.findCustomerGroupIdByCustomerId.mockResolvedValue(2);
      rateCardRepo.findActiveByGroup.mockResolvedValue(mockVipExpressCard); // minWeight is 0.5kg

      const result = await service.calculateFreight({
        shippingMethod: "EXPRESS",
        country: "US",
        weight: 0.1, // extremely light, less than minWeight
        customerId: "1",
      });

      // 0.1kg is rounded to 0.5kg (step 0.5). Enforced minimum weight RW = 0.5kg -> amount 12.0
      expect(result.freightCost).toBe(12.0);
    });

    it("should calculate correct freight for custom heavy cargo range_per_kg using 1.0kg ceiling step", async () => {
      rateCardRepo.findCustomerGroupIdByCustomerId.mockResolvedValue(null);
      rateCardRepo.findActiveDefault.mockResolvedValue(mockDefaultEpacketCard);

      const result = await service.calculateFreight({
        shippingMethod: "EPACKET",
        country: "US",
        weight: 6.42, // RANGE_PER_KG rounded up to 7.00kg (1.0kg step)
        customerId: "1",
      });

      // 7.00 * 9.5 = 66.50
      expect(result.freightCost).toBe(66.5);
      expect(result.appliedRateCardSnapshot.chargeableWeight).toBe(7.0);
      expect(result.appliedRateCardSnapshot.effectiveWeightStep).toBe(1.0);
    });

    it("should round RANGE_PER_KG heavy cargo weight using 1.0kg ceiling step for Express cargo >20kg", async () => {
      rateCardRepo.findCustomerGroupIdByCustomerId.mockResolvedValue(2);
      rateCardRepo.findActiveByGroup.mockResolvedValue(mockVipExpressCard);

      const result = await service.calculateFreight({
        shippingMethod: "EXPRESS",
        country: "US",
        weight: 20.1, // 20.1kg in range (20.0, 44.0] RANGE_PER_KG, rounded up to 21.0kg
        customerId: "1",
      });

      // 21.0 * 9.99 = 209.79
      expect(result.freightCost).toBe(209.79);
      expect(result.appliedRateCardSnapshot.chargeableWeight).toBe(21.0);
      expect(result.appliedRateCardSnapshot.effectiveWeightStep).toBe(1.0);
    });

    it("should throw validation error when weight exceeds maxWeight for ePacket", async () => {
      rateCardRepo.findCustomerGroupIdByCustomerId.mockResolvedValue(null);
      rateCardRepo.findActiveDefault.mockResolvedValue(mockDefaultEpacketCard);

      await expect(
        service.calculateFreight({
          shippingMethod: "EPACKET",
          country: "US",
          weight: 25.0, // Exceeds highest slab in mock epacket card
          customerId: "1",
        }),
      ).rejects.toThrowError(
        expect.objectContaining({
          code: ErrorCode.RateCardValidationError,
          message: expect.stringContaining("Vui lòng chuyển sang dịch vụ Express"),
        }),
      );
    });

    it("should throw RateCardNotFound error if no rate card matches", async () => {
      rateCardRepo.findCustomerGroupIdByCustomerId.mockResolvedValue(null);
      rateCardRepo.findActiveDefault.mockResolvedValue(null);

      await expect(
        service.calculateFreight({
          shippingMethod: "EPACKET",
          country: "US",
          weight: 1.0,
          customerId: "1",
        }),
      ).rejects.toThrowError(
        expect.objectContaining({
          code: ErrorCode.RateCardNotFound,
        }),
      );
    });
  });

  describe("validateSlabs", () => {
    it("should validate a correct contiguous set of slabs", () => {
      const slabs = [
        { startWeight: 0.0, endWeight: 1.0, rateType: "STEP_FIXED" as const, amount: 10 },
        { startWeight: 1.0, endWeight: 2.0, rateType: "STEP_FIXED" as const, amount: 12 },
        { startWeight: 2.0, endWeight: 10.0, rateType: "RANGE_PER_KG" as const, amount: 6 },
      ];

      expect(() => service.validateSlabs(0.0, 10.0, slabs)).not.toThrow();
    });

    it("should throw validation error if first slab does not match minWeight", () => {
      const slabs = [
        { startWeight: 0.5, endWeight: 2.0, rateType: "STEP_FIXED" as const, amount: 10 },
      ];

      expect(() => service.validateSlabs(0.0, 2.0, slabs)).toThrowError(
        expect.objectContaining({
          code: ErrorCode.RateCardValidationError,
        }),
      );
    });

    it("should throw validation error if a gap exists between slabs", () => {
      const slabs = [
        { startWeight: 0.0, endWeight: 1.0, rateType: "STEP_FIXED" as const, amount: 10 },
        { startWeight: 1.2, endWeight: 2.0, rateType: "STEP_FIXED" as const, amount: 12 }, // gap between 1.0 and 1.2
      ];

      expect(() => service.validateSlabs(0.0, 2.0, slabs)).toThrowError(
        expect.objectContaining({
          code: ErrorCode.RateCardValidationError,
        }),
      );
    });

    it("should throw validation error if monotonicity is violated (price decrease)", () => {
      const slabs = [
        { startWeight: 0.0, endWeight: 1.0, rateType: "STEP_FIXED" as const, amount: 10 },
        { startWeight: 1.0, endWeight: 2.0, rateType: "STEP_FIXED" as const, amount: 8 }, // price decreased!
      ];

      expect(() => service.validateSlabs(0.0, 2.0, slabs)).toThrowError(
        expect.objectContaining({
          code: ErrorCode.RateCardValidationError,
        }),
      );
    });

    it("should format RANGE_PER_KG monotonicity error message with unit price and total cost", () => {
      const slabs = [
        { startWeight: 0.0, endWeight: 5.0, rateType: "RANGE_PER_KG" as const, amount: 2.0 },
        { startWeight: 5.0, endWeight: 10.0, rateType: "RANGE_PER_KG" as const, amount: 0.0 },
      ];

      expect(() => service.validateSlabs(0.0, 10.0, slabs)).toThrowError(
        "Giá cước nấc [5 -> 10kg] (0.00$/kg (tổng cước 0.00$)) không được nhỏ hơn giá cước nấc trước [0 -> 5kg] (2.00$/kg (tổng cước 10.00$)) để đảm bảo tính đơn điệu tăng dần.",
      );
    });

    it("should throw validation error if last slab endWeight is less than maxWeight", () => {
      const slabs = [
        { startWeight: 0.0, endWeight: 1.0, rateType: "STEP_FIXED" as const, amount: 10 },
      ];

      expect(() => service.validateSlabs(0.0, 5.0, slabs)).toThrowError(
        expect.objectContaining({
          code: ErrorCode.RateCardValidationError,
        }),
      );
    });
  });

  describe("validatePublishingConstraints", () => {
    it("should resolve without error when validating publishing constraints", async () => {
      rateCardRepo.findById.mockResolvedValue({
        id: 3,
        shippingMethod: "EPACKET",
        country: "US",
        origin: null,
        startDate: null,
        endDate: null,
        groups: [{ customerGroupId: 1 }],
      });

      await expect(service.validatePublishingConstraints(3)).resolves.not.toThrow();
    });
  });

  describe("validateStartDateNotPast", () => {
    it("should allow future start dates or null", () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      expect(() => service.validateStartDateNotPast(tomorrow)).not.toThrow();
      expect(() => service.validateStartDateNotPast(null)).not.toThrow();
      expect(() => service.validateStartDateNotPast(undefined)).not.toThrow();
    });

    it("should throw validation error if start date is in the past", () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 2);

      expect(() => service.validateStartDateNotPast(yesterday)).toThrowError(
        expect.objectContaining({
          code: ErrorCode.RateCardValidationError,
        }),
      );
    });
  });

  describe("onDefaultCardApproved", () => {
    it("should update card status to PUBLISHED and trigger immediate archiving if startDate <= now", async () => {
      rateCardRepo.update = vi.fn().mockResolvedValue({ id: 10, status: "PUBLISHED" });
      rateCardRepo.archiveSupersededDefaultRateCards = vi.fn().mockResolvedValue({
        archivedCount: 1,
        archivedIds: [5],
      });
      rateCardRepo.findById = vi.fn().mockResolvedValue({
        id: 5,
        shippingMethod: "EXPRESS",
        country: "US",
        origin: null,
        groups: [],
      });

      const pastDate = new Date(Date.now() - 3600 * 1000);
      await service.onDefaultCardApproved({
        id: 10,
        type: "DEFAULT",
        shippingMethod: "EXPRESS",
        country: "US",
        origin: null,
        startDate: pastDate,
      });

      expect(rateCardRepo.update).toHaveBeenCalledWith(10, { status: "PUBLISHED" });
      expect(rateCardRepo.archiveSupersededDefaultRateCards).toHaveBeenCalled();
    });

    it("should update card status to PUBLISHED without immediate archiving if startDate > now (future)", async () => {
      rateCardRepo.update = vi.fn().mockResolvedValue({ id: 11, status: "PUBLISHED" });
      rateCardRepo.archiveSupersededDefaultRateCards = vi.fn();

      const futureDate = new Date(Date.now() + 86400 * 1000);
      await service.onDefaultCardApproved({
        id: 11,
        type: "DEFAULT",
        shippingMethod: "EXPRESS",
        country: "US",
        origin: null,
        startDate: futureDate,
      });

      expect(rateCardRepo.update).toHaveBeenCalledWith(11, { status: "PUBLISHED" });
      expect(rateCardRepo.archiveSupersededDefaultRateCards).not.toHaveBeenCalled();
    });
  });

  describe("archiveSupersededDefaultRateCards", () => {
    it("should archive superseded default rate cards and invalidate cache for archived cards", async () => {
      rateCardRepo.archiveSupersededDefaultRateCards = vi.fn().mockResolvedValue({
        archivedCount: 1,
        archivedIds: [5],
      });
      rateCardRepo.findById = vi.fn().mockResolvedValue({
        id: 5,
        shippingMethod: "EXPRESS",
        country: "US",
        origin: null,
        groups: [],
      });

      const now = new Date();
      const result = await service.archiveSupersededDefaultRateCards(now);

      expect(rateCardRepo.archiveSupersededDefaultRateCards).toHaveBeenCalledWith(now);
      expect(result.archivedCount).toBe(1);
      expect(result.archivedIds).toEqual([5]);
      expect(rateCardRepo.findById).toHaveBeenCalledWith(5);
    });
  });
});
