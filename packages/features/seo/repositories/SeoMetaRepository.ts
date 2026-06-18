import type { PrismaClient } from "@prisma/client";

export class SeoMetaRepository {
  private prisma: PrismaClient;
  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findByPostId(postId: number) {
    return this.prisma.seoMeta.findUnique({
      where: { postId },
      select: {
        id: true,
        seoTitle: true,
        seoDescription: true,
        seoImage: true,
        indexMode: true,
      },
    });
  }

  async findByCategoryId(categoryId: number) {
    return this.prisma.seoMeta.findUnique({
      where: { categoryId },
      select: {
        id: true,
        seoTitle: true,
        seoDescription: true,
        seoImage: true,
        indexMode: true,
      },
    });
  }

  async findByPageId(pageId: number) {
    return this.prisma.seoMeta.findUnique({
      where: { pageId },
      select: {
        id: true,
        seoTitle: true,
        seoDescription: true,
        seoImage: true,
        indexMode: true,
      },
    });
  }

  async upsertForPost(
    postId: number,
    data: { seoTitle?: string; seoDescription?: string; seoImage?: string; indexMode?: string },
  ) {
    return this.prisma.seoMeta.upsert({
      where: { postId },
      create: { postId, ...data },
      update: data,
      select: {
        id: true,
        seoTitle: true,
        seoDescription: true,
        seoImage: true,
        indexMode: true,
      },
    });
  }

  async upsertForCategory(
    categoryId: number,
    data: { seoTitle?: string; seoDescription?: string; seoImage?: string; indexMode?: string },
  ) {
    return this.prisma.seoMeta.upsert({
      where: { categoryId },
      create: { categoryId, ...data },
      update: data,
      select: {
        id: true,
        seoTitle: true,
        seoDescription: true,
        seoImage: true,
        indexMode: true,
      },
    });
  }

  async upsertForPage(
    pageId: number,
    data: { seoTitle?: string; seoDescription?: string; seoImage?: string; indexMode?: string },
  ) {
    return this.prisma.seoMeta.upsert({
      where: { pageId },
      create: { pageId, ...data },
      update: data,
      select: {
        id: true,
        seoTitle: true,
        seoDescription: true,
        seoImage: true,
        indexMode: true,
      },
    });
  }

  async deleteByPostId(postId: number) {
    return this.prisma.seoMeta.deleteMany({ where: { postId } });
  }
}
