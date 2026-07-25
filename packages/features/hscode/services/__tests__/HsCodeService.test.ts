import { describe, expect, it, vi } from "vitest";
import { HsCodeService } from "../HsCodeService";
import type { HsCodeRepository } from "../repositories/HsCodeRepository";

function createMockRepo() {
  return {
    getTreeRawData: vi.fn(),
    getChapters: vi.fn(),
    getAllFlexportItems: vi.fn(),
    getFlexportItemsByHeading: vi.fn(),
    searchFlexportItems: vi.fn(),
    getHeadingDescription: vi.fn(),
    getChapterData: vi.fn(),
    getFlexportItemByCode: vi.fn(),
    getCountries: vi.fn(),
    getCrawlHsCodeByCode: vi.fn(),
    getTransportModes: vi.fn(),
  } as unknown as HsCodeRepository & Record<string, ReturnType<typeof vi.fn>>;
}

function createService(repo = createMockRepo()) {
  return {
    service: new HsCodeService({ hsCodeRepo: repo }),
    repo,
  };
}

describe("HsCodeService", () => {
  describe("getCountries", () => {
    it("should return sorted countries", async () => {
      const { service, repo } = createService();
      const mockCountries = [
        { id: 1, name: "Vietnam", code: "VN", flag: "🇻🇳" },
        { id: 2, name: "United States", code: "US", flag: "🇺🇸" },
      ];
      repo.getCountries.mockResolvedValue(mockCountries);

      const result = await service.getCountries();
      expect(result).toEqual(mockCountries);
      expect(repo.getCountries).toHaveBeenCalled();
    });
  });

  describe("getTransportModes", () => {
    it("should return the list of transport modes from database", async () => {
      const { service, repo } = createService();
      const mockModes = [
        { id: "ocean", name: "Ocean" },
        { id: "air", name: "Air" },
      ];
      repo.getTransportModes.mockResolvedValue(mockModes);

      const result = await service.getTransportModes();
      expect(result).toEqual(mockModes);
      expect(repo.getTransportModes).toHaveBeenCalled();
    });
  });

  describe("calculate", () => {
    it("should calculate duties and total costs correctly for ocean mode", async () => {
      const { service, repo } = createService();
      repo.getFlexportItemByCode.mockResolvedValue({
        code: "2203.00.00.60",
        generalRate: "10%",
        specialRate: null,
      });

      const result = await service.calculate({
        code: "2203.00.00.60",
        value: 10000,
        mode: "ocean",
      });

      expect(result).toEqual({
        dutyRate: "10.00%",
        baseCost: 10000,
        totalDuties: 1000,
        hmf: 13,
        mpf: 35,
        total: 11048,
      });
    });

    it("should calculate correctly for air mode without HMF", async () => {
      const { service, repo } = createService();
      repo.getFlexportItemByCode.mockResolvedValue({
        code: "2203.00.00.60",
        generalRate: "Free",
        specialRate: null,
      });

      const result = await service.calculate({
        code: "2203.00.00.60",
        value: 1000,
        mode: "air",
      });

      expect(result.hmf).toBe(0);
      expect(result.totalDuties).toBe(0);
      expect(result.mpf).toBe(2); // baseCost <= 2500 -> mpf is 2.22 -> Math.round is 2
    });

    it("should include Section 301 and Section 232 tariffs when country of origin is China", async () => {
      const { service, repo } = createService();
      repo.getFlexportItemByCode.mockResolvedValue({
        code: "7601.10.30.00",
        generalRate: "2.60%",
        specialRate: null,
      });
      repo.getCrawlHsCodeByCode.mockResolvedValue({
        generalRateOfDuty: "2.60%",
        section301TariffsRate: "25%",
        additionalTariffsRate: "50%",
      });

      const result = await service.calculate({
        code: "7601.10.30.00",
        value: 10000,
        mode: "Ocean",
        country: "China",
      });

      // 2.6% + 25% + 50% = 77.60%
      expect(result.dutyRate).toBe("77.60%");
      expect(result.totalDuties).toBe(7760);
      expect(result.total).toBe(10000 + 7760 + 13 + 35); // Base + Duties + HMF + MPF
    });
  });

  describe("search", () => {
    it("should return empty list if query is empty", async () => {
      const { service } = createService();
      const result = await service.search("");
      expect(result).toEqual([]);
    });

    it("should clean and map raw database items", async () => {
      const { service, repo } = createService();
      repo.searchFlexportItems.mockResolvedValue([
        {
          code: "2203.00.00.60",
          description: "···Beer made from maltBeer made from malt",
          unitsofQuantity: "bbl",
          generalRate: "Free",
          specialRate: null,
        },
      ]);

      const result = await service.search("beer");
      expect(result).toEqual([
        {
          code: "2203.00.00.60",
          description: "Beer made from malt",
          chapterCode: "22",
          headingCode: "2203",
          unit: "bbl",
          generalRate: "Free",
          specialRate: null,
        },
      ]);
    });
  });

  describe("getTree", () => {
    it("should return the list of level 1 chapters with capitalized description", async () => {
      const { service, repo } = createService();
      repo.getChapters.mockResolvedValue([
        {
          code: "22",
          description: "Beverages, spirits and vinegar",
          notes: "<p>These are chapter 22 notes</p>",
        },
      ]);

      const result = await service.getTree();
      expect(result).toHaveLength(1);
      expect(result[0].code).toBe("22");
      expect(result[0].description).toBe("Beverages, spirits and vinegar");
      expect(result[0]).not.toHaveProperty("notesHtml");
    });
  });
});
