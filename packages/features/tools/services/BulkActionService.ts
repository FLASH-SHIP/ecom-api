import type { PrismaClient } from "@ecom/prisma";
import { createLogger } from "@flash-ship/ecom-lib/logger";

const log = createLogger("BulkActionService");

export interface BulkResult<T = number | string> {
  success: number;
  failed: number;
  errors: Array<{ id: T; error: string }>;
}

export class BulkActionService {
  private prisma: PrismaClient;
  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async bulkDeletePosts(ids: number[]): Promise<BulkResult<number>> {
    return this.processBulk(ids, async (id) => {
      await this.prisma.post.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    });
  }

  async bulkStatusPosts(
    ids: number[],
    status: "PUBLISHED" | "DRAFT" | "ARCHIVED",
  ): Promise<BulkResult<number>> {
    return this.processBulk(ids, async (id) => {
      const data: Record<string, unknown> = { status };
      if (status === "PUBLISHED") {
        data.publishedAt = new Date();
      }
      await this.prisma.post.update({ where: { id }, data });
    });
  }

  async bulkCategoryAssign(postIds: number[], categoryIds: number[]): Promise<BulkResult<number>> {
    return this.processBulk(postIds, async (postId) => {
      const records = categoryIds.map((categoryId) => ({
        postId,
        categoryId,
      }));
      await this.prisma.postCategory.createMany({
        data: records,
        skipDuplicates: true,
      });
    });
  }

  async bulkDeleteCategories(ids: number[]): Promise<BulkResult<number>> {
    return this.processBulk(ids, async (id) => {
      await this.prisma.category.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    });
  }

  async bulkDeleteTags(ids: number[]): Promise<BulkResult<number>> {
    return this.processBulk(ids, async (id) => {
      await this.prisma.tag.delete({ where: { id } });
    });
  }

  async bulkDeletePages(ids: number[]): Promise<BulkResult<number>> {
    return this.processBulk(ids, async (id) => {
      await this.prisma.page.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    });
  }

  async bulkStatusCustomers(
    ids: string[],
    status: "ACTIVE" | "INACTIVE" | "BANNED",
  ): Promise<BulkResult<string>> {
    return this.processBulk(ids, async (id) => {
      await this.prisma.customer.update({ where: { id }, data: { status } });
    });
  }

  private async processBulk<T>(
    ids: T[],
    processor: (id: T) => Promise<void>,
  ): Promise<BulkResult<T>> {
    const result: BulkResult<T> = { success: 0, failed: 0, errors: [] };

    for (const id of ids) {
      try {
        await processor(id);
        result.success++;
      } catch (err) {
        result.failed++;
        result.errors.push({
          id,
          error: err instanceof Error ? err.message : String(err),
        });
        log.warn("Bulk action item failed", { id, error: String(err) });
      }
    }

    log.info("Bulk action completed", {
      total: ids.length,
      success: result.success,
      failed: result.failed,
    });

    return result;
  }
}
