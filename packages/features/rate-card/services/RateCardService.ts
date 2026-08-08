import type { RateCardType, RateItemType, ShippingMethod, ShippingOrigin } from "@ecom/prisma";
import { Prisma } from "@ecom/prisma";
import { ErrorCode } from "@flash-ship/ecom-lib/errorCodes";
import { ErrorWithCode } from "@flash-ship/ecom-lib/errors";
import { RedisCache } from "@flash-ship/ecom-lib/redis";
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
  rateType: RateItemType;
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
   * Validates that startDate is not in the past (before today 00:00:00).
   */
  validateStartDateNotPast(startDate?: Date | null) {
    if (startDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const inputDate = new Date(startDate);
      inputDate.setHours(0, 0, 0, 0);
      if (inputDate < today) {
        throw new ErrorWithCode(
          ErrorCode.RateCardValidationError,
          "Ngày bắt đầu hiệu lực không được ở trong quá khứ.",
          422,
        );
      }
    }
  }

  /**
   * Validates that endDate is not in the past and is >= startDate.
   */
  validateDateRange(startDate?: Date | null, endDate?: Date | null) {
    if (endDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(0, 0, 0, 0);
      if (end < today) {
        throw new ErrorWithCode(
          ErrorCode.RateCardValidationError,
          "Ngày kết thúc hiệu lực không được ở trong quá khứ.",
          422,
        );
      }
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (end < start) {
          throw new ErrorWithCode(
            ErrorCode.RateCardValidationError,
            "Ngày kết thúc hiệu lực phải lớn hơn hoặc bằng ngày bắt đầu hiệu lực.",
            422,
          );
        }
      }
    }
  }

  /**
   * Called when a rate card (DEFAULT or CUSTOM) is approved.
   * Updates target card status to PUBLISHED.
   * If startDate <= now (or null), archives superseded rate cards immediately.
   * Otherwise, archiving is handled by the scheduled hourly cron job once effective date is reached.
   */
  async onDefaultCardApproved(card: {
    id: number;
    type: RateCardType;
    shippingMethod: ShippingMethod;
    country: string;
    origin: string | null;
    startDate?: Date | null;
  }) {
    const updated = await this.deps.rateCardRepo.update(card.id, { status: "PUBLISHED" });

    const now = new Date();
    if (!card.startDate || new Date(card.startDate) <= now) {
      await this.archiveSupersededDefaultRateCards(now).catch(() => {});
    }

    return updated;
  }

  /**
   * Scans and archives superseded default rate cards, invalidating cache for archived cards.
   */
  async archiveSupersededDefaultRateCards(now: Date = new Date()) {
    const result = await this.deps.rateCardRepo.archiveSupersededDefaultRateCards(now);
    if (result.archivedIds.length > 0) {
      for (const id of result.archivedIds) {
        await this.invalidateRateCardCache(id).catch(() => {});
      }
    }
    return result;
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
   * Resolves the effective weight step for calculation.
   * - RANGE_PER_KG: Uses ceiling step of 1.0kg minimum (Math.max(cardWeightStep, 1.0)).
   * - STEP_FIXED / RANGE_FIXED: Uses card weightStep.
   */
  private getEffectiveWeightStep(cardWeightStep: Decimal | number, rateType: RateItemType): Decimal {
    const cardStep = new Decimal(cardWeightStep);
    if (rateType === "RANGE_PER_KG") {
      return Decimal.max(cardStep, new Decimal(1.0));
    }
    return cardStep;
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

    const validMethods: ShippingMethod[] = ["EXPRESS", "EPACKET"];
    if (!shippingMethod || !validMethods.includes(shippingMethod as ShippingMethod)) {
      throw new ErrorWithCode(
        ErrorCode.ValidationError,
        'Phương thức vận chuyển (shippingMethod) không hợp lệ, chỉ chấp nhận "EXPRESS" hoặc "EPACKET"',
        400,
      );
    }

    const validOrigins: ShippingOrigin[] = ["HAN", "SGN"];
    if (origin && !validOrigins.includes(origin as ShippingOrigin)) {
      throw new ErrorWithCode(
        ErrorCode.ValidationError,
        'Mã kho xuất hàng (shippingOrigin) không hợp lệ, chỉ chấp nhận "HAN" hoặc "SGN"',
        400,
      );
    }

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
    const minW = new Decimal(card.minWeight);

    // Enforce minimum chargeable weight guard
    const clampedWeight = Decimal.max(W, minW);

    // Find matching tier item based on clamped weight
    const matchedItem = card.items.find((item) => {
      const start = new Decimal(item.startWeight);
      const end = new Decimal(item.endWeight);
      return clampedWeight.gt(start) && clampedWeight.lte(end);
    });

    if (!matchedItem) {
      const maxWeightTxt = card.maxWeight
        ? ` (hạn mức tối đa ${new Decimal(card.maxWeight).toFixed(2)}kg)`
        : "";
      const suggestMsg =
        card.shippingMethod === "EPACKET"
          ? " Vui lòng chuyển sang dịch vụ Express hoặc điều chỉnh kích thước/cân nặng kiện hàng."
          : "";
      throw new ErrorWithCode(
        ErrorCode.RateCardValidationError,
        `Trọng lượng tính cước (${clampedWeight.toFixed(3)}kg) vượt quá nấc cước cấu hình${maxWeightTxt} của bảng giá ${card.code}.${suggestMsg}`,
        400,
      );
    }

    // Determine effective weight step and round weight
    const effectiveStep = this.getEffectiveWeightStep(card.weightStep, matchedItem.rateType);
    const RW = clampedWeight.div(effectiveStep).ceil().mul(effectiveStep);

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
        chargeableWeight: Number(RW.toFixed(3)),
        effectiveWeightStep: Number(effectiveStep.toFixed(3)),
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
    const minW = new Decimal(card.minWeight);

    const clampedWeight = Decimal.max(W, minW);

    const matchedItem = card.items.find((item) => {
      const start = new Decimal(item.startWeight);
      const end = new Decimal(item.endWeight);
      return clampedWeight.gt(start) && clampedWeight.lte(end);
    });

    if (!matchedItem) {
      const maxWeightTxt = card.maxWeight
        ? ` (hạn mức tối đa ${new Decimal(card.maxWeight).toFixed(2)}kg)`
        : "";
      const suggestMsg =
        card.shippingMethod === "EPACKET"
          ? " Vui lòng chuyển sang dịch vụ Express hoặc điều chỉnh kích thước/cân nặng kiện hàng."
          : "";
      throw new ErrorWithCode(
        ErrorCode.RateCardValidationError,
        `Trọng lượng tính cước (${clampedWeight.toFixed(3)}kg) vượt quá nấc cước cấu hình${maxWeightTxt} của bảng giá ${card.code}.${suggestMsg}`,
        400,
      );
    }

    const effectiveStep = this.getEffectiveWeightStep(card.weightStep, matchedItem.rateType);
    const RW = clampedWeight.div(effectiveStep).ceil().mul(effectiveStep);

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
        chargeableWeight: Number(RW.toFixed(3)),
        effectiveWeightStep: Number(effectiveStep.toFixed(3)),
      },
    };
  }

  /**
   * Gets rate card limit (min/max weight) for customer & destination.
   */
  async getRateCardLimit(params: {
    customerId?: string;
    shippingMethod: ShippingMethod;
    country: string;
    origin?: string | null;
  }) {
    let groupId: number | null = null;
    if (params.customerId) {
      groupId = await this.deps.rateCardRepo.findCustomerGroupIdByCustomerId(params.customerId);
    }
    const card = await this.resolveRateCard(
      groupId,
      params.shippingMethod,
      params.country,
      params.origin ?? null,
      new Date(),
    );
    const maxWeight = card.maxWeight ? Number(card.maxWeight) : 5.0;
    const minWeight = card.minWeight ? Number(card.minWeight) : 0.001;
    return {
      rateCardId: card.id,
      code: card.code,
      name: card.name,
      minWeightKg: minWeight,
      maxWeightKg: maxWeight,
      maxWeightGrams: Math.round(maxWeight * 1000),
    };
  }

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
        `Khoảng cân không liên tục: nấc [${current.startWeight} -> ${current.endWeight}kg] bắt đầu từ ${current.startWeight}kg nhưng nấc trước [${prev.startWeight} -> ${prev.endWeight}kg] kết thúc ở ${prev.endWeight}kg.`,
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
      const prevLabel = `[${prev.startWeight} -> ${prev.endWeight}kg]`;
      const currentLabel = `[${current.startWeight} -> ${current.endWeight}kg]`;

      const prevCostStr =
        prev.rateType === "RANGE_PER_KG"
          ? `${prevAmount.toFixed(2)}$/kg (tổng cước ${prevMaxCost.toFixed(2)}$)`
          : `${prevAmount.toFixed(2)}$`;

      const currentCostStr =
        current.rateType === "RANGE_PER_KG"
          ? `${currentAmount.toFixed(2)}$/kg (tổng cước ${currentMinCost.toFixed(2)}$)`
          : `${currentAmount.toFixed(2)}$`;

      throw new ErrorWithCode(
        ErrorCode.RateCardValidationError,
        `Giá cước nấc ${currentLabel} (${currentCostStr}) không được nhỏ hơn giá cước nấc trước ${prevLabel} (${prevCostStr}) để đảm bảo tính đơn điệu tăng dần.`,
        422,
      );
    }
  }

  /**
   * Validates if publishing a rate card causes date/group overlap conflicts.
   * Rates succession is handled dynamically based on effective startDate and scheduled archiving.
   */
  async validatePublishingConstraints(rateCardId: number) {
    const card = await this.deps.rateCardRepo.findById(rateCardId);
    if (!card) {
      throw new ErrorWithCode(ErrorCode.RateCardNotFound, "Bảng giá không tồn tại.", 404);
    }
    // Succession and automated archiving is managed via effective start date and scheduled cron job
    return;
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
