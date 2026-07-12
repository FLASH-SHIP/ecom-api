import { createLogger } from "@ecom/lib/logger";
import type { PrismaClient } from "@ecom/prisma";

const log = createLogger("ImportService");

export interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{ index: number; error: string }>;
}

export class ImportService {
  private prisma: PrismaClient;
  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async importPosts(
    data: Array<{
      title: string;
      slug?: string;
      content?: string;
      excerpt?: string;
      status?: string;
      isFeatured?: boolean;
      authorId: string;
    }>,
  ): Promise<ImportResult> {
    return this.processBatch(data, async (item, index) => {
      await this.prisma.post.create({
        data: {
          title: item.title,
          slug: item.slug ?? `imported-post-${Date.now()}-${index}`,
          content: item.content,
          excerpt: item.excerpt,
          status: (item.status as "DRAFT" | "PUBLISHED") ?? "DRAFT",
          isFeatured: item.isFeatured ?? false,
          authorId: item.authorId,
        },
        select: { id: true },
      });
    });
  }

  async importCategories(
    data: Array<{
      name: string;
      slug?: string;
      description?: string;
      parentId?: number;
      order?: number;
    }>,
  ): Promise<ImportResult> {
    return this.processBatch(data, async (item, index) => {
      await this.prisma.category.create({
        data: {
          name: item.name,
          slug: item.slug ?? `imported-category-${Date.now()}-${index}`,
          description: item.description,
          parentId: item.parentId,
          order: item.order ?? 0,
        },
        select: { id: true },
      });
    });
  }

  async importTags(data: Array<{ name: string; slug?: string }>): Promise<ImportResult> {
    return this.processBatch(data, async (item, index) => {
      await this.prisma.tag.upsert({
        where: { slug: item.slug ?? item.name.toLowerCase().replace(/\s+/g, "-") },
        create: {
          name: item.name,
          slug: item.slug ?? `imported-tag-${Date.now()}-${index}`,
        },
        update: { name: item.name },
        select: { id: true },
      });
    });
  }

  async importPages(
    data: Array<{
      title: string;
      slug?: string;
      content?: string;
      template?: string;
      authorId: string;
    }>,
  ): Promise<ImportResult> {
    return this.processBatch(data, async (item, index) => {
      await this.prisma.page.create({
        data: {
          title: item.title,
          slug: item.slug ?? `imported-page-${Date.now()}-${index}`,
          content: item.content,
          template: item.template ?? "default",
          status: "DRAFT",
          authorId: item.authorId,
        },
        select: { id: true },
      });
    });
  }

  async importSettings(data: Array<{ key: string; value: string }>): Promise<ImportResult> {
    return this.processBatch(data, async (item) => {
      await this.prisma.setting.upsert({
        where: { key: item.key },
        create: { key: item.key, value: item.value },
        update: { value: item.value },
        select: { id: true },
      });
    });
  }

  private async processBatch<T>(
    data: T[],
    processor: (item: T, index: number) => Promise<void>,
  ): Promise<ImportResult> {
    const result: ImportResult = { success: 0, failed: 0, errors: [] };

    for (let i = 0; i < data.length; i++) {
      try {
        await processor(data[i] as T, i);
        result.success++;
      } catch (err) {
        result.failed++;
        result.errors.push({
          index: i,
          error: err instanceof Error ? err.message : String(err),
        });
        log.warn("Import item failed", { index: i, error: String(err) });
      }
    }

    log.info("Import batch completed", {
      success: result.success,
      failed: result.failed,
    });

    return result;
  }
}
