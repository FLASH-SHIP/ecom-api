import type { PrismaClient } from "@ecom/prisma";

export class SlugRepository {
  private prisma: PrismaClient;
  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findByKeyAndPrefix(key: string, prefix: string) {
    return this.prisma.slug.findUnique({
      where: { key_prefix: { key, prefix } },
      select: {
        id: true,
        key: true,
        referenceId: true,
        referenceType: true,
        prefix: true,
      },
    });
  }

  async findByReference(referenceId: number, referenceType: string) {
    return this.prisma.slug.findUnique({
      where: {
        referenceId_referenceType: { referenceId, referenceType },
      },
      select: {
        id: true,
        key: true,
        prefix: true,
        translations: {
          select: {
            id: true,
            langCode: true,
            key: true,
          },
        },
      },
    });
  }

  async exists(key: string, prefix: string, excludeId?: number) {
    const where = {
      key,
      prefix,
      ...(excludeId && { id: { not: excludeId } }),
    };
    return (await this.prisma.slug.count({ where })) > 0;
  }

  async existsTranslation(key: string, prefix: string, langCode: string, excludeSlugId?: number) {
    const where = {
      key,
      langCode,
      ...(excludeSlugId && { slugId: { not: excludeSlugId } }),
      slug: { prefix },
    };
    return (await this.prisma.slugTranslation.count({ where })) > 0;
  }

  async upsert(data: { referenceId: number; referenceType: string; key: string; prefix: string }) {
    return this.prisma.slug.upsert({
      where: {
        referenceId_referenceType: {
          referenceId: data.referenceId,
          referenceType: data.referenceType,
        },
      },
      create: data,
      update: { key: data.key, prefix: data.prefix },
      select: { id: true, key: true, prefix: true },
    });
  }

  async deleteByReference(referenceId: number, referenceType: string) {
    return this.prisma.slug.deleteMany({
      where: { referenceId, referenceType },
    });
  }
}
