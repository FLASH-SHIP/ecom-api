import type { HsCodeRepository } from "../repositories/HsCodeRepository";

export interface IHsCodeServiceDeps {
  hsCodeRepo: HsCodeRepository;
}

function parseDutyRate(rateStr: string | null | undefined): number {
  if (!rateStr) return 0;
  const normalized = rateStr.trim().toLowerCase();
  if (normalized === "free") return 0;

  const match = normalized.match(/(\d+(?:\.\d+)?)%/);
  if (match && match[1]) {
    return parseFloat(match[1]);
  }
  return 0;
}

// Countries subject to Section 301 tariffs
const SECTION_301_COUNTRIES = ["CN", "CHINA"];

// Countries subject to Section 232 or other additional trade tariffs
const ADDITIONAL_TARIFF_COUNTRIES = ["CN", "CHINA", "RU", "RUSSIA", "BY", "BELARUS", "IR", "IRAN", "KP", "NORTH KOREA"];

export class HsCodeService {
  private deps: IHsCodeServiceDeps;

  constructor(deps: IHsCodeServiceDeps) {
    this.deps = deps;
  }

  /**
   * Retrieves the tree of chapters (level 1) with notesHtml.
   */
  async getTree() {
    const chapters = await this.deps.hsCodeRepo.getChapters();
    return chapters.map((ch) => {
      const desc = ch.description || "";
      const capitalizedDesc = desc.charAt(0).toUpperCase() + desc.slice(1);
      return {
        code: ch.code,
        description: capitalizedDesc,
      };
    });
  }

  /**
   * Retrieves detail data of a 4-digit heading, including chapter notes and tariff rates list.
   */
  async getDetail(inputCode: string) {
    if (!inputCode) {
      throw new Error("Code parameter is required.");
    }

    const cleanCode = inputCode.replace(/\./g, "").trim();
    let headingCode = "0101";
    if (cleanCode.length >= 4) {
      headingCode = cleanCode.substring(0, 4);
    } else if (cleanCode.length >= 2) {
      headingCode = cleanCode.substring(0, 2) + "01";
    }

    const chapterCode = headingCode.substring(0, 2);

    // 1. Resolve Chapter and Heading names from crawl_hscode description hierarchy
    const articleDescription = await this.deps.hsCodeRepo.getHeadingDescription(headingCode);
    const descParts = articleDescription
      ? articleDescription.split(/[：:]+/).map((s) => s.trim())
      : [];
    const chapterName = descParts[0] || `Chapter ${chapterCode}`;
    const headingName = descParts[1] || `Heading ${headingCode}`;

    // 2. Fetch chapter level notes HTML container from database
    const chapterData = await this.deps.hsCodeRepo.getChapterData(chapterCode);
    const notesHtml = chapterData?.notes || null;
    const dbChapterName = chapterData?.articleDescription || chapterName;

    // 3. Query tariff rates list from hscode_flexport
    const rawRates = await this.deps.hsCodeRepo.getFlexportItemsByHeading(headingCode);

    const rates = rawRates.map((rate) => {
      let cleanDesc = rate.description ?? "";
      const dotCount = (cleanDesc.match(/·/g) || []).length;
      const strippedDesc = cleanDesc.replace(/^[·\s]+/, "").trim();

      const midpoint = Math.floor(strippedDesc.length / 2);
      const firstHalf = strippedDesc.substring(0, midpoint).trim();
      const secondHalf = strippedDesc.substring(midpoint).trim();
      if (firstHalf === secondHalf && firstHalf.length > 0) {
        cleanDesc = firstHalf;
      } else {
        cleanDesc = strippedDesc;
      }

      return {
        code: rate.code,
        description: cleanDesc,
        indent: dotCount,
        unit: rate.unitsofQuantity || null,
        generalRate: rate.generalRate || null,
        specialRate: rate.specialRate || null,
      };
    });

    const selectedRate = rates.find((r) => r.code.replace(/\./g, "") === cleanCode) || null;

    // Filter rates to only return matching prefix if queried code is more specific than heading (length > 4)
    const filteredRates =
      cleanCode.length > 4
        ? rates.filter((r) => r.code.replace(/\./g, "").startsWith(cleanCode))
        : rates;

    return {
      chapter: {
        code: chapterCode,
        name: dbChapterName,
        notesHtml,
      },
      heading: {
        code: headingCode,
        name: headingName,
      },
      selectedRate,
      rates: filteredRates,
    };
  }

  /**
   * Performs autocomplete and searches commodities list by text or code.
   */
  async search(query: string) {
    if (!query) return [];

    const rawItems = await this.deps.hsCodeRepo.searchFlexportItems(query, 50);

    return rawItems.map((item) => {
      const cleanCode = item.code.replace(/\./g, "");
      const chapterCode = cleanCode.substring(0, 2);
      const headingCode = cleanCode.substring(0, 4);

      // Clean duplicate description halves
      let cleanDesc = item.description ?? "";
      const strippedDesc = cleanDesc.replace(/^[·\s]+/, "").trim();
      const midpoint = Math.floor(strippedDesc.length / 2);
      const firstHalf = strippedDesc.substring(0, midpoint).trim();
      const secondHalf = strippedDesc.substring(midpoint).trim();
      if (firstHalf === secondHalf && firstHalf.length > 0) {
        cleanDesc = firstHalf;
      } else {
        cleanDesc = strippedDesc;
      }

      return {
        code: item.code,
        description: cleanDesc,
        chapterCode,
        headingCode,
        unit: item.unitsofQuantity || null,
        generalRate: item.generalRate || null,
        specialRate: item.specialRate || null,
      };
    });
  }

  async getHeadingTree(headingCode: string) {
    const rawItems = await this.deps.hsCodeRepo.getFlexportItemsByHeading(headingCode);

    const root: Array<{
      code: string;
      description: string;
      generalRate: string | null;
      specialRate: string | null;
      unit: string | null;
      children: any[];
    }> = [];
    const stack: any[] = [];

    for (const item of rawItems) {
      const rawDesc = item.description ?? "";
      const dotCount = (rawDesc.match(/·/g) || []).length;

      let cleanDesc = rawDesc.replace(/^[·\s]+/, "").trim();
      const midpoint = Math.floor(cleanDesc.length / 2);
      const firstHalf = cleanDesc.substring(0, midpoint).trim();
      const secondHalf = cleanDesc.substring(midpoint).trim();
      if (firstHalf === secondHalf && firstHalf.length > 0) {
        cleanDesc = firstHalf;
      }

      const node = {
        code: item.code,
        description: cleanDesc,
        generalRate: item.generalRate || null,
        specialRate: item.specialRate || null,
        unit: item.unitsofQuantity || null,
        children: [] as any[],
      };

      if (dotCount === 0) {
        root.push(node);
        stack[0] = node;
        stack.length = 1;
      } else {
        let parentIdx = dotCount - 1;
        while (parentIdx >= 0 && !stack[parentIdx]) {
          parentIdx--;
        }

        if (parentIdx >= 0 && stack[parentIdx]) {
          stack[parentIdx].children.push(node);
          stack[dotCount] = node;
          stack.length = dotCount + 1;
        } else {
          root.push(node);
          stack[dotCount] = node;
          stack.length = dotCount + 1;
        }
      }
    }

    return root;
  }

  async calculate(dto: {
    code: string;
    value: number;
    mode: string;
    country?: string;
    entryDate?: string;
    loadingDate?: string;
  }) {
    const item = await this.deps.hsCodeRepo.getFlexportItemByCode(dto.code);
    const rateStr = item?.generalRate || "Free";
    let percentage = parseDutyRate(rateStr);

    const isSection301Applicable =
      dto.country && SECTION_301_COUNTRIES.includes(dto.country.toUpperCase());
    const isAdditionalTariffApplicable =
      dto.country && ADDITIONAL_TARIFF_COUNTRIES.includes(dto.country.toUpperCase());

    if (isSection301Applicable || isAdditionalTariffApplicable) {
      const crawlItem = await this.deps.hsCodeRepo.getCrawlHsCodeByCode(dto.code);
      if (crawlItem) {
        if (isSection301Applicable && crawlItem.section301TariffsRate) {
          percentage += parseDutyRate(crawlItem.section301TariffsRate);
        }
        if (isAdditionalTariffApplicable && crawlItem.additionalTariffsRate) {
          percentage += parseDutyRate(crawlItem.additionalTariffsRate);
        }
      }
    }

    const baseCost = dto.value;
    const duties = Math.round(baseCost * (percentage / 100));

    const isOcean = dto.mode.toLowerCase() === "ocean";
    const hmf = isOcean ? Math.round(baseCost * 0.00125) : 0;

    let rawMpf = baseCost * 0.003464;
    if (baseCost > 2500) {
      if (rawMpf < 31.67) rawMpf = 31.67;
      if (rawMpf > 614.35) rawMpf = 614.35;
    } else {
      rawMpf = 2.22;
    }
    const mpf = Math.round(rawMpf);

    const total = baseCost + duties + hmf + mpf;

    return {
      dutyRate: percentage > 0 ? `${percentage.toFixed(2)}%` : rateStr,
      baseCost,
      totalDuties: duties,
      hmf,
      mpf,
      total,
    };
  }

  async getCountries() {
    return this.deps.hsCodeRepo.getCountries();
  }

  async getTransportModes() {
    return this.deps.hsCodeRepo.getTransportModes();
  }
}
