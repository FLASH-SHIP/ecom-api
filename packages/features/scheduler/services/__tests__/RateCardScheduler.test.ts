import { beforeEach, describe, expect, it, vi } from "vitest";
import { archiveSupersededDefaultRateCards } from "../RateCardScheduler";

const mockArchiveSupersededDefaultRateCards = vi.fn();

vi.mock("@ecom/features/di/containers/ShippingRateService", () => {
  return {
    getRateCardService: () => ({
      archiveSupersededDefaultRateCards: mockArchiveSupersededDefaultRateCards,
    }),
  };
});

describe("RateCardScheduler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should trigger archiveSupersededDefaultRateCards on RateCardService", async () => {
    mockArchiveSupersededDefaultRateCards.mockResolvedValue({
      archivedCount: 2,
      archivedIds: [10, 12],
    });

    const now = new Date("2026-08-03T10:00:00Z");
    const result = await archiveSupersededDefaultRateCards(now);

    expect(mockArchiveSupersededDefaultRateCards).toHaveBeenCalledWith(now);
    expect(result).toEqual({
      archivedCount: 2,
      archivedIds: [10, 12],
    });
  });
});
