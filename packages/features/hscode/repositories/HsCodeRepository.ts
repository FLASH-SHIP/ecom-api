import type { PrismaClient } from "@ecom/prisma";

export class HsCodeRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Queries distinct 4-digit headings from crawl_hscode table.
   * Returns one row per heading containing the full article_description hierarchy.
   */
  async getTreeRawData() {
    // We execute a raw query or distinct query to get one row per 4-digit heading prefix.
    // This reduces data size from 20k rows to ~1.2k rows.
    const result = await this.prisma.$queryRaw<
      Array<{
        chapter_code: string;
        heading_code: string;
        article_description: string;
      }>
    >`
      SELECT DISTINCT ON (SUBSTRING(hs_code, 1, 4))
        SUBSTRING(hs_code, 1, 2) as chapter_code,
        SUBSTRING(hs_code, 1, 4) as heading_code,
        article_description
      FROM crawl_hscode
      WHERE hs_code IS NOT NULL AND LENGTH(hs_code) >= 4
      ORDER BY SUBSTRING(hs_code, 1, 4), hs_code;
    `;
    return result;
  }

  async getChapters() {
    return this.prisma.$queryRaw<
      Array<{
        code: string;
        description: string;
        notes: string | null;
      }>
    >`
      SELECT
        hs_code as code,
        article_description as description,
        notes
      FROM crawl_hscode
      WHERE hs_code IS NOT NULL AND LENGTH(hs_code) = 2 AND port_of_clearance = 'US'
      ORDER BY hs_code;
    `;
  }

  async getHeadingsByChapter(chapterCode: string) {
    return this.prisma.$queryRaw<
      Array<{
        code: string;
        description: string;
      }>
    >`
      SELECT DISTINCT ON (SUBSTRING(hs_code, 1, 4))
        SUBSTRING(hs_code, 1, 4) as code,
        article_description as description
      FROM crawl_hscode
      WHERE hs_code IS NOT NULL AND LENGTH(hs_code) >= 4 AND hs_code LIKE ${chapterCode + "%"}
      ORDER BY SUBSTRING(hs_code, 1, 4), hs_code;
    `;
  }

  /**
   * Queries all tariff rate records from hscode_flexport that belong to a 4-digit heading.
   */
  async getFlexportItemsByHeading(headingCode: string) {
    return this.prisma.hsCodeFlexport.findMany({
      where: {
        code: {
          startsWith: headingCode,
        },
      },
      select: {
        code: true,
        description: true,
        generalRate: true,
        column2Rate: true,
        specialRate: true,
        unitsofQuantity: true,
      },
      orderBy: {
        code: "asc",
      },
    });
  }

  async getAllFlexportItems() {
    return this.prisma.hsCodeFlexport.findMany({
      select: {
        code: true,
        description: true,
        generalRate: true,
        column2Rate: true,
        specialRate: true,
        unitsofQuantity: true,
      },
      orderBy: {
        code: "asc",
      },
    });
  }

  /**
   * Searches hscode_flexport items matching the search query by code or description.
   */
  async searchFlexportItems(searchQuery: string, limit = 50) {
    return this.prisma.hsCodeFlexport.findMany({
      where: {
        OR: [
          {
            code: {
              contains: searchQuery,
              mode: "insensitive",
            },
          },
          {
            description: {
              contains: searchQuery,
              mode: "insensitive",
            },
          },
        ],
      },
      select: {
        code: true,
        description: true,
        generalRate: true,
        specialRate: true,
        unitsofQuantity: true,
      },
      take: limit,
    });
  }

  /**
   * Finds the article description of a 4-digit heading to resolve its name dynamically.
   */
  async getHeadingDescription(headingCode: string) {
    const item = await this.prisma.crawlHsCode.findFirst({
      where: {
        hsCode: {
          startsWith: headingCode,
        },
      },
      select: {
        articleDescription: true,
      },
    });
    return item?.articleDescription ?? null;
  }

  /**
   * Retrieves chapter level metadata (description and crawled notes HTML).
   */
  async getChapterData(chapterCode: string) {
    return this.prisma.crawlHsCode.findFirst({
      where: {
        hsCode: chapterCode,
        portOfClearance: 'US'
      },
      select: {
        articleDescription: true,
        notes: true,
      },
    });
  }

  async getFlexportItemByCode(code: string) {
    const cleanCode = code.replace(/\./g, "").trim();
    let formatted = cleanCode;
    if (cleanCode.length === 10) {
      formatted = `${cleanCode.substring(0, 4)}.${cleanCode.substring(4, 6)}.${cleanCode.substring(6, 8)}.${cleanCode.substring(8, 10)}`;
    } else if (cleanCode.length === 8) {
      formatted = `${cleanCode.substring(0, 4)}.${cleanCode.substring(4, 6)}.${cleanCode.substring(6, 8)}`;
    } else if (cleanCode.length === 6) {
      formatted = `${cleanCode.substring(0, 4)}.${cleanCode.substring(4, 6)}`;
    }

    return this.prisma.hsCodeFlexport.findFirst({
      where: {
        OR: [
          { code: { equals: code, mode: "insensitive" } },
          { code: { equals: formatted, mode: "insensitive" } },
        ],
      },
      select: {
        code: true,
        generalRate: true,
        specialRate: true,
      },
    });
  }

  async getCountries() {
    return this.prisma.country.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        flag: true,
      },
      orderBy: {
        name: "asc",
      },
    });
  }

  async getCrawlHsCodeByCode(code: string) {
    const cleanCode = code.replace(/\./g, "").trim();
    return this.prisma.crawlHsCode.findFirst({
      where: {
        hsCode: { equals: cleanCode, mode: "insensitive" },
      },
      select: {
        generalRateOfDuty: true,
        section301TariffsRate: true,
        additionalTariffsRate: true,
        antidumpingDutyRate: true,
        countervailingDutyRate: true,
      },
    });
  }

  async getTransportModes() {
    return this.prisma.transportMode.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        code: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    });
  }
}
