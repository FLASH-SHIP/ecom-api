import { ErrorCode } from "@ecom/lib/errorCodes";
import { ErrorWithCode } from "@ecom/lib/errors";
import { RedisCache } from "@ecom/lib/redis";
import type { RateCardType, ShippingMethod } from "@ecom/prisma";
import { Prisma } from "@ecom/prisma";
import type { RateCardRepository } from "../repositories/RateCardRepository";

type Decimal = Prisma.Decimal;
const { Decimal } = Prisma;

export interface IRateCardServiceDeps {
  rateCardRepo: RateCardRepository;
}

export interface CalculateFreightParams {
  shippingMethod: ShippingMethod;
  country: string;
  weight: number; // raw input weight in kg
  origin?: string | null;
  customerId: string;
  calculationDate?: Date;
}

export interface SlabInput {
  startWeight: number;
  endWeight: number;
  rateType: RateCardType;
  amount: number;
}

type ResolvedRateCard = NonNullable<Awaited<ReturnType<RateCardRepository["findActiveDefault"]>>>;

export class RateCardService {
  private deps: IRateCardServiceDeps;
  private cache: RedisCache<ResolvedRateCard>;

  constructor(deps: IRateCardServiceDeps) {
    this.deps = deps;
    // Cache TTL is set to 1 hour (3600 seconds)
    this.cache = new RedisCache("rate-cards", 3600);
  }

  /**
   * Resolves active Rate Card from cache or waterfall DB queries.
   */
  private async resolveRateCard(
    groupId: number | null,
    shippingMethod: ShippingMethod,
    country: string,
    origin: string | null,
    calculationDate: Date,
  ): Promise<ResolvedRateCard> {
    const cacheKey = `group:${groupId ?? "default"}:${shippingMethod}:${country}:${origin}`;
    let card = await this.cache.get(cacheKey);

    if (!card) {
      // 1. Resolve from DB using 2-step waterfall cascade
      if (groupId !== null) {
        card =
          (await this.deps.rateCardRepo.findActiveByGroup(
            shippingMethod,
            country,
            origin,
            groupId,
            calculationDate,
          )) ?? undefined;
      }

      if (!card) {
        card =
          (await this.deps.rateCardRepo.findActiveDefault(
            shippingMethod,
            country,
            origin,
            calculationDate,
          )) ?? undefined;
      }

      if (card) {
        // Save database model to Redis cache
        await this.cache.set(cacheKey, card);
      }
    }

    if (!card) {
      throw new ErrorWithCode(
        ErrorCode.RateCardNotFound,
        `Không tìm thấy bảng giá cước phù hợp cho phương thức ${shippingMethod}, quốc gia ${country}, và hub ${origin}.`,
        404,
      );
    }

    return card;
  }

  /**
   * Calculates freight cost based on selected pricing slab rate type.
   */
  private calculateItemFreight(
    matchedItem: ResolvedRateCard["items"][number],
    chargeableWeight: Decimal,
  ): Decimal {
    const itemAmount = new Decimal(matchedItem.amount);

    if (matchedItem.rateType === "STEP_FIXED" || matchedItem.rateType === "RANGE_FIXED") {
      return itemAmount;
    }
    if (matchedItem.rateType === "RANGE_PER_KG") {
      return chargeableWeight.mul(itemAmount);
    }
    throw new ErrorWithCode(
      ErrorCode.ValidationError,
      `Kiểu giá cước ${matchedItem.rateType} không hợp lệ.`,
      400,
    );
  }

  /**
   * Calculates shipping freight based on shipping method, destination country,
   * cargo weight, origin airport/hub, and customer ID.
   */
  async calculateFreight(params: CalculateFreightParams) {
    const {
      shippingMethod,
      country,
      weight,
      origin = null,
      customerId,
      calculationDate = new Date(),
    } = params;

    // Resolve Customer Group
    const groupId = await this.deps.rateCardRepo.findCustomerGroupIdByCustomerId(customerId);

    // Resolve Rate Card
    const card = await this.resolveRateCard(
      groupId,
      shippingMethod,
      country,
      origin,
      calculationDate,
    );

    // Convert weight and step values to Decimal for precise calculations
    const W = new Decimal(weight);
    const S = new Decimal(card.weightStep);
    const minW = new Decimal(card.minWeight);

    // Step 2: Weight Rounding
    // rounded = ceil(W / S) * S
    let RW = W.div(S).ceil().mul(S);

    // Enforce minimum chargeable weight guard
    if (RW.lt(minW)) {
      RW = minW;
    }

    // Step 3: Price Evaluation
    // Find matching tier item
    const matchedItem = card.items.find((item) => {
      const start = new Decimal(item.startWeight);
      const end = new Decimal(item.endWeight);
      return RW.gt(start) && RW.lte(end);
    });

    if (!matchedItem) {
      throw new ErrorWithCode(
        ErrorCode.RateCardValidationError,
        `Trọng lượng tính cước ${RW.toFixed(3)}kg vượt quá mọi nấc cước cấu hình của bảng giá ${card.code}.`,
        400,
      );
    }

    // Calculate freight cost based on rate type
    const freightCost = this.calculateItemFreight(matchedItem, RW);
    const itemAmount = new Decimal(matchedItem.amount);

    // Return the calculation result and audit snapshot
    return {
      freightCost: Number(freightCost.toFixed(2)),
      appliedRateCardId: card.id,
      appliedRateCardSnapshot: {
        rateCardId: card.id,
        rateCardCode: card.code,
        rateCardName: card.name,
        currency: card.currency,
        itemId: matchedItem.id,
        startWeight: Number(new Decimal(matchedItem.startWeight).toFixed(3)),
        endWeight: Number(new Decimal(matchedItem.endWeight).toFixed(3)),
        rateType: matchedItem.rateType,
        amount: Number(itemAmount.toFixed(2)),
      },
    };
  }

  /**
   * Calculates freight cost using a specific RateCard ID.
   */
  async calculateFreightWithCardId(rateCardId: number, weight: number) {
    const card = await this.deps.rateCardRepo.findById(rateCardId);
    if (!card) {
      throw new ErrorWithCode(
        ErrorCode.NotFound,
        `Bảng giá cước với ID ${rateCardId} không tồn tại.`,
        404,
      );
    }

    const W = new Decimal(weight);
    const S = new Decimal(card.weightStep);
    const minW = new Decimal(card.minWeight);

    let RW = W.div(S).ceil().mul(S);
    if (RW.lt(minW)) {
      RW = minW;
    }

    const matchedItem = card.items.find((item) => {
      const start = new Decimal(item.startWeight);
      const end = new Decimal(item.endWeight);
      return RW.gt(start) && RW.lte(end);
    });

    if (!matchedItem) {
      throw new ErrorWithCode(
        ErrorCode.RateCardValidationError,
        `Trọng lượng tính cước ${RW.toFixed(3)}kg vượt quá mọi nấc cước cấu hình của bảng giá ${card.code}.`,
        400,
      );
    }

    const freightCost = this.calculateItemFreight(matchedItem, RW);
    const itemAmount = new Decimal(matchedItem.amount);

    return {
      freightCost: Number(freightCost.toFixed(2)),
      appliedRateCardId: card.id,
      appliedRateCardSnapshot: {
        rateCardId: card.id,
        rateCardCode: card.code,
        rateCardName: card.name,
        currency: card.currency,
        itemId: matchedItem.id,
        startWeight: Number(new Decimal(matchedItem.startWeight).toFixed(3)),
        endWeight: Number(new Decimal(matchedItem.endWeight).toFixed(3)),
        rateType: matchedItem.rateType,
        amount: Number(itemAmount.toFixed(2)),
      },
    };
  }

  /**
   * Validates pricing slabs for continuity, gaps, and monotonicity.
   */
  /**
   * Validates pricing slabs for continuity, gaps, and monotonicity.
   */
  validateSlabs(minWeight: number, maxWeight: number, slabs: SlabInput[]) {
    if (slabs.length === 0) {
      throw new ErrorWithCode(
        ErrorCode.RateCardValidationError,
        "Bảng giá cước phải chứa ít nhất một nấc cước.",
        422,
      );
    }

    // Sort slabs by startWeight ascending
    const sorted = [...slabs].sort((a, b) => a.startWeight - b.startWeight);

    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    if (!first || !last) {
      throw new ErrorWithCode(
        ErrorCode.RateCardValidationError,
        "Bảng giá cước không hợp lệ hoặc rỗng.",
        422,
      );
    }

    this.validateSlabsBounds(first, last, minWeight, maxWeight);
    this.validateSlabsContiguityAndMonotonicity(sorted);
  }

  private validateSlabsBounds(
    first: SlabInput,
    last: SlabInput,
    minWeight: number,
    maxWeight: number,
  ) {
    if (!new Decimal(first.startWeight).eq(new Decimal(minWeight))) {
      throw new ErrorWithCode(
        ErrorCode.RateCardValidationError,
        `Nấc cước đầu tiên phải bắt đầu từ minWeight (${minWeight}kg), hiện tại là ${first.startWeight}kg.`,
        422,
      );
    }

    if (new Decimal(last.endWeight).lt(new Decimal(maxWeight))) {
      throw new ErrorWithCode(
        ErrorCode.RateCardValidationError,
        `Các nấc cước phải bao phủ ít nhất đến tối đa maxWeight (${maxWeight}kg), hiện tại kết thúc ở ${last.endWeight}kg.`,
        422,
      );
    }
  }

  private validateSlabsContiguityAndMonotonicity(sorted: SlabInput[]) {
    for (let i = 0; i < sorted.length; i++) {
      const current = sorted[i];
      if (!current) continue;

      // Verify bounds
      if (current.endWeight <= current.startWeight) {
        throw new ErrorWithCode(
          ErrorCode.RateCardValidationError,
          `Nấc cước không hợp lệ: startWeight (${current.startWeight}kg) phải nhỏ hơn endWeight (${current.endWeight}kg).`,
          422,
        );
      }

      // Monotonicity Check: heavier slab should not cost less than lighter slab
      if (i > 0) {
        const prev = sorted[i - 1];
        if (!prev) continue;
        this.checkGapAndMonotonicity(prev, current);
      }
    }
  }

  private checkGapAndMonotonicity(prev: SlabInput, current: SlabInput) {
    if (!new Decimal(current.startWeight).eq(new Decimal(prev.endWeight))) {
      throw new ErrorWithCode(
        ErrorCode.RateCardValidationError,
        `Khoảng cân không liên tục: nấc tiếp theo bắt đầu từ ${current.startWeight}kg nhưng nấc trước kết thúc ở ${prev.endWeight}kg.`,
        422,
      );
    }

    const prevEndWeight = new Decimal(prev.endWeight);
    const prevAmount = new Decimal(prev.amount);
    const prevMaxCost =
      prev.rateType === "RANGE_PER_KG" ? prevEndWeight.mul(prevAmount) : prevAmount;

    const currentStartWeight = new Decimal(current.startWeight);
    const currentAmount = new Decimal(current.amount);
    const currentMinCost =
      current.rateType === "RANGE_PER_KG" ? currentStartWeight.mul(currentAmount) : currentAmount;

    if (currentMinCost.lt(prevMaxCost)) {
      throw new ErrorWithCode(
        ErrorCode.RateCardValidationError,
        `Giá cước nấc sau tính từ ${currentStartWeight}kg (tối thiểu ${currentMinCost.toFixed(2)}) không được nhỏ hơn giá trị nấc trước tại ${prevEndWeight}kg (tối đa ${prevMaxCost.toFixed(2)}) để đảm bảo tính đơn điệu tăng dần.`,
        422,
      );
    }
  }

  /**
   * Validates if publishing a rate card causes date/group overlap conflicts.
   */
  async validatePublishingConstraints(rateCardId: number) {
    const card = await this.deps.rateCardRepo.findById(rateCardId);
    if (!card) {
      throw new ErrorWithCode(ErrorCode.RateCardNotFound, "Bảng giá không tồn tại.", 404);
    }

    const groupIds = card.groups.map((g) => g.customerGroupId);

    const overlaps = await this.deps.rateCardRepo.findOverlappingRateCards({
      excludeId: card.id,
      shippingMethod: card.shippingMethod,
      country: card.country,
      origin: card.origin,
      customerGroupIds: groupIds,
      startDate: card.startDate,
      endDate: card.endDate,
    });

    if (overlaps.length > 0) {
      const conflictList = overlaps.map((o) => `"${o.code}"`).join(", ");
      throw new ErrorWithCode(
        ErrorCode.RateCardConflict,
        `Không thể hoạt động bảng giá này vì chồng chéo khoảng thời gian hiệu lực với bảng giá đang hoạt động khác: ${conflictList}.`,
        409,
      );
    }
  }

  /**
   * Helper to invalidate cache keys for a given Rate Card.
   */
  async invalidateRateCardCache(rateCardId: number) {
    const card = await this.deps.rateCardRepo.findById(rateCardId);
    if (!card) return;

    const groupIds = card.groups.map((g) => g.customerGroupId);

    if (groupIds.length > 0) {
      for (const groupId of groupIds) {
        const key = `group:${groupId}:${card.shippingMethod}:${card.country}:${card.origin}`;
        await this.cache.invalidate(key);
      }
    } else {
      // Invalidate system default cache key
      const key = `group:default:${card.shippingMethod}:${card.country}:${card.origin}`;
      await this.cache.invalidate(key);
    }
  }
}
