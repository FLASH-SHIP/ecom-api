import type { PrismaClient } from "@ecom/prisma";

export class TranslationRepository {
  private prisma: PrismaClient;
  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  // ─── Languages ──────────────────────────────────
  async findActiveLanguages() {
    return this.prisma.language.findMany({
      where: { isActive: true },
      orderBy: [{ isDefault: "desc" }, { order: "asc" }],
      select: {
        id: true,
        name: true,
        code: true,
        flag: true,
        isDefault: true,
        order: true,
      },
    });
  }

  // ─── Post Translations ──────────────────────────
  async findPostTranslation(postId: number, langCode: string) {
    return this.prisma.postTranslation.findUnique({
      where: { postId_langCode: { postId, langCode } },
      select: {
        id: true,
        langCode: true,
        title: true,
        slug: true,
        excerpt: true,
        content: true,
      },
    });
  }

  async findPostTranslations(postId: number) {
    return this.prisma.postTranslation.findMany({
      where: { postId },
      select: {
        id: true,
        langCode: true,
        title: true,
        slug: true,
        excerpt: true,
        content: true,
      },
      orderBy: { langCode: "asc" },
    });
  }

  async upsertPostTranslation(
    postId: number,
    langCode: string,
    data: { title: string; slug?: string; excerpt?: string; content?: string },
  ) {
    return this.prisma.postTranslation.upsert({
      where: { postId_langCode: { postId, langCode } },
      create: { postId, langCode, ...data },
      update: data,
      select: {
        id: true,
        langCode: true,
        title: true,
        slug: true,
        excerpt: true,
        content: true,
      },
    });
  }

  async deletePostTranslation(postId: number, langCode: string) {
    return this.prisma.postTranslation.deleteMany({
      where: { postId, langCode },
    });
  }

  // ─── Category Translations ─────────────────────
  async findCategoryTranslation(categoryId: number, langCode: string) {
    return this.prisma.categoryTranslation.findUnique({
      where: { categoryId_langCode: { categoryId, langCode } },
      select: {
        id: true,
        langCode: true,
        name: true,
        description: true,
      },
    });
  }

  async findCategoryTranslations(categoryId: number) {
    return this.prisma.categoryTranslation.findMany({
      where: { categoryId },
      select: {
        id: true,
        langCode: true,
        name: true,
        description: true,
      },
      orderBy: { langCode: "asc" },
    });
  }

  async upsertCategoryTranslation(
    categoryId: number,
    langCode: string,
    data: { name: string; description?: string },
  ) {
    return this.prisma.categoryTranslation.upsert({
      where: { categoryId_langCode: { categoryId, langCode } },
      create: { categoryId, langCode, ...data },
      update: data,
      select: {
        id: true,
        langCode: true,
        name: true,
        description: true,
      },
    });
  }

  async deleteCategoryTranslation(categoryId: number, langCode: string) {
    return this.prisma.categoryTranslation.deleteMany({
      where: { categoryId, langCode },
    });
  }

  // ─── Page Translations ─────────────────────────
  async findPageTranslation(pageId: number, langCode: string) {
    return this.prisma.pageTranslation.findUnique({
      where: { pageId_langCode: { pageId, langCode } },
      select: {
        id: true,
        langCode: true,
        title: true,
        slug: true,
        content: true,
        excerpt: true,
      },
    });
  }

  async findPageTranslations(pageId: number) {
    return this.prisma.pageTranslation.findMany({
      where: { pageId },
      select: {
        id: true,
        langCode: true,
        title: true,
        slug: true,
        content: true,
        excerpt: true,
      },
      orderBy: { langCode: "asc" },
    });
  }

  async upsertPageTranslation(
    pageId: number,
    langCode: string,
    data: { title: string; slug?: string; content?: string; excerpt?: string },
  ) {
    return this.prisma.pageTranslation.upsert({
      where: { pageId_langCode: { pageId, langCode } },
      create: { pageId, langCode, ...data },
      update: data,
      select: {
        id: true,
        langCode: true,
        title: true,
        slug: true,
        content: true,
        excerpt: true,
      },
    });
  }

  async deletePageTranslation(pageId: number, langCode: string) {
    return this.prisma.pageTranslation.deleteMany({
      where: { pageId, langCode },
    });
  }

  // ─── Tag Translations ──────────────────────────
  async findTagTranslation(tagId: number, langCode: string) {
    return this.prisma.tagTranslation.findUnique({
      where: { tagId_langCode: { tagId, langCode } },
      select: { id: true, langCode: true, name: true, description: true },
    });
  }

  async findTagTranslations(tagId: number) {
    return this.prisma.tagTranslation.findMany({
      where: { tagId },
      select: { id: true, langCode: true, name: true, description: true },
      orderBy: { langCode: "asc" },
    });
  }

  async upsertTagTranslation(
    tagId: number,
    langCode: string,
    data: { name: string; description?: string | null },
  ) {
    return this.prisma.tagTranslation.upsert({
      where: { tagId_langCode: { tagId, langCode } },
      create: { tagId, langCode, ...data },
      update: data,
      select: { id: true, langCode: true, name: true, description: true },
    });
  }

  async deleteTagTranslation(tagId: number, langCode: string) {
    return this.prisma.tagTranslation.deleteMany({
      where: { tagId, langCode },
    });
  }

  // ─── MenuItem Translations ──────────────────────
  async findMenuItemTranslation(menuItemId: number, langCode: string) {
    return this.prisma.menuItemTranslation.findUnique({
      where: { menuItemId_langCode: { menuItemId, langCode } },
      select: { id: true, langCode: true, label: true },
    });
  }

  async findMenuItemTranslations(menuItemId: number) {
    return this.prisma.menuItemTranslation.findMany({
      where: { menuItemId },
      select: { id: true, langCode: true, label: true },
      orderBy: { langCode: "asc" },
    });
  }

  async upsertMenuItemTranslation(menuItemId: number, langCode: string, data: { label: string }) {
    return this.prisma.menuItemTranslation.upsert({
      where: { menuItemId_langCode: { menuItemId, langCode } },
      create: { menuItemId, langCode, ...data },
      update: data,
      select: { id: true, langCode: true, label: true },
    });
  }

  async deleteMenuItemTranslation(menuItemId: number, langCode: string) {
    return this.prisma.menuItemTranslation.deleteMany({
      where: { menuItemId, langCode },
    });
  }

  // ─── Translation Status ─────────────────────────
  async getTranslationStatus(entityType: string, entityId: number) {
    let rawRows: { langCode: string }[] = [];
    switch (entityType) {
      case "post":
        rawRows = await this.prisma.postTranslation.findMany({
          where: { postId: entityId },
          select: { langCode: true },
        });
        break;
      case "category":
        rawRows = await this.prisma.categoryTranslation.findMany({
          where: { categoryId: entityId },
          select: { langCode: true },
        });
        break;
      case "page":
        rawRows = await this.prisma.pageTranslation.findMany({
          where: { pageId: entityId },
          select: { langCode: true },
        });
        break;
      case "tag":
        rawRows = await this.prisma.tagTranslation.findMany({
          where: { tagId: entityId },
          select: { langCode: true },
        });
        break;
      case "menuItem":
        rawRows = await this.prisma.menuItemTranslation.findMany({
          where: { menuItemId: entityId },
          select: { langCode: true },
        });
        break;
    }

    const meta = await this.prisma.languageMeta.findUnique({
      where: { referenceId_referenceType: { referenceId: entityId, referenceType: entityType } },
      select: { langCode: true },
    });

    const codes = rawRows.map((r) => r.langCode);
    let originLangCode = "";

    if (meta) {
      originLangCode = meta.langCode;
      if (!codes.includes(meta.langCode)) {
        codes.push(meta.langCode);
      }
    } else {
      const defaultLang = await this.prisma.language.findFirst({
        where: { isDefault: true },
        select: { code: true },
      });
      originLangCode = defaultLang?.code ?? "vi";
      if (!codes.includes(originLangCode)) {
        codes.push(originLangCode);
      }
    }

    return {
      translations: codes.map((c) => ({ langCode: c })),
      originLangCode,
    };
  }

  /**
   * Batch translation status — single query for multiple entity IDs.
   * Returns a map of entityId → langCode[] including the original language from LanguageMeta.
   */
  private async getRawTranslationRows(
    entityType: string,
    entityIds: number[],
  ): Promise<{ entityId: number; langCode: string }[]> {
    switch (entityType) {
      case "post":
        return (
          await this.prisma.postTranslation.findMany({
            where: { postId: { in: entityIds } },
            select: { postId: true, langCode: true },
          })
        ).map((r) => ({ entityId: r.postId, langCode: r.langCode }));
      case "category":
        return (
          await this.prisma.categoryTranslation.findMany({
            where: { categoryId: { in: entityIds } },
            select: { categoryId: true, langCode: true },
          })
        ).map((r) => ({ entityId: r.categoryId, langCode: r.langCode }));
      case "page":
        return (
          await this.prisma.pageTranslation.findMany({
            where: { pageId: { in: entityIds } },
            select: { pageId: true, langCode: true },
          })
        ).map((r) => ({ entityId: r.pageId, langCode: r.langCode }));
      case "tag":
        return (
          await this.prisma.tagTranslation.findMany({
            where: { tagId: { in: entityIds } },
            select: { tagId: true, langCode: true },
          })
        ).map((r) => ({ entityId: r.tagId, langCode: r.langCode }));
      case "menuItem":
        return (
          await this.prisma.menuItemTranslation.findMany({
            where: { menuItemId: { in: entityIds } },
            select: { menuItemId: true, langCode: true },
          })
        ).map((r) => ({ entityId: r.menuItemId, langCode: r.langCode }));
      default:
        return [];
    }
  }

  async getBatchTranslationStatus(
    entityType: string,
    entityIds: number[],
  ): Promise<Record<number, string[]>> {
    if (entityIds.length === 0) return {};

    const rows = await this.getRawTranslationRows(entityType, entityIds);

    const metas = await this.prisma.languageMeta.findMany({
      where: {
        referenceId: { in: entityIds },
        referenceType: entityType,
      },
      select: { referenceId: true, langCode: true },
    });

    const defaultLang = await this.prisma.language.findFirst({
      where: { isDefault: true },
      select: { code: true },
    });
    const defaultLangCode = defaultLang?.code ?? "vi";

    const result: Record<number, string[]> = {};
    for (const id of entityIds) {
      result[id] = [];
    }

    for (const row of rows) {
      const arr = result[row.entityId];
      if (arr && !arr.includes(row.langCode)) {
        arr.push(row.langCode);
      }
    }

    for (const meta of metas) {
      const arr = result[meta.referenceId];
      if (arr && !arr.includes(meta.langCode)) {
        arr.push(meta.langCode);
      }
    }

    for (const id of entityIds) {
      const hasMeta = metas.some((m) => m.referenceId === id);
      const arr = result[id];
      if (arr && !hasMeta && !arr.includes(defaultLangCode)) {
        arr.push(defaultLangCode);
      }
    }

    return result;
  }
}
