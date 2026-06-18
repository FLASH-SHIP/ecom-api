import { createHash } from "node:crypto";
import type { PrismaClient } from "@prisma/client";

const metaSelect = {
  id: true,
  langCode: true,
  origin: true,
  referenceId: true,
  referenceType: true,
} as const;

export class LanguageMetaRepository {
  private prisma: PrismaClient;
  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findByReference(referenceId: number, referenceType: string) {
    return this.prisma.languageMeta.findUnique({
      where: { referenceId_referenceType: { referenceId, referenceType } },
      select: metaSelect,
    });
  }

  async findByOrigin(origin: string) {
    return this.prisma.languageMeta.findMany({
      where: { origin },
      select: {
        ...metaSelect,
        language: {
          select: { id: true, name: true, locale: true, code: true, flag: true },
        },
      },
      orderBy: { langCode: "asc" },
    });
  }

  async findRelatedItems(referenceId: number, referenceType: string) {
    const meta = await this.findByReference(referenceId, referenceType);
    if (!meta) return [];
    return this.findByOrigin(meta.origin);
  }

  async saveMetaData(
    referenceId: number,
    referenceType: string,
    langCode: string,
    origin?: string,
  ) {
    const finalOrigin = origin ?? generateOriginHash(referenceId, referenceType);

    return this.prisma.languageMeta.upsert({
      where: { referenceId_referenceType: { referenceId, referenceType } },
      create: { referenceId, referenceType, langCode, origin: finalOrigin },
      update: { langCode, origin: finalOrigin },
      select: metaSelect,
    });
  }

  async deleteByReference(referenceId: number, referenceType: string) {
    return this.prisma.languageMeta.deleteMany({
      where: { referenceId, referenceType },
    });
  }

  async deleteByLangCode(langCode: string) {
    return this.prisma.languageMeta.deleteMany({
      where: { langCode },
    });
  }
}

/**
 * Generates a unique origin hash for grouping translations of the same entity.
 * Uses MD5 of referenceType + referenceId + current timestamp to ensure uniqueness.
 */
function generateOriginHash(referenceId: number, referenceType: string): string {
  const raw = `${referenceType}_${referenceId}_${Date.now()}`;
  return createHash("md5").update(raw).digest("hex");
}
