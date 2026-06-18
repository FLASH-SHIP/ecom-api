import type { PrismaClient } from "@prisma/client";

export class ExportService {
  private prisma: PrismaClient;
  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async exportPosts() {
    return this.prisma.post.findMany({
      select: {
        id: true,
        title: true,
        slug: true,
        content: true,
        excerpt: true,
        status: true,
        formatType: true,
        isFeatured: true,
        allowComments: true,
        views: true,
        createdAt: true,
        updatedAt: true,
        author: { select: { id: true, name: true, email: true } },
        categories: { select: { category: { select: { id: true, name: true } } } },
        tags: { select: { tag: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async exportCategories() {
    return this.prisma.category.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        status: true,
        parentId: true,
        order: true,
        createdAt: true,
      },
      orderBy: { order: "asc" },
    });
  }

  async exportTags() {
    return this.prisma.tag.findMany({
      select: { id: true, name: true, slug: true, createdAt: true },
      orderBy: { name: "asc" },
    });
  }

  async exportPages() {
    return this.prisma.page.findMany({
      select: {
        id: true,
        title: true,
        slug: true,
        content: true,
        excerpt: true,
        template: true,
        status: true,
        order: true,
        createdAt: true,
      },
      orderBy: { order: "asc" },
    });
  }

  async exportMembers() {
    return this.prisma.member.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        status: true,
        emailVerified: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async exportSettings() {
    return this.prisma.setting.findMany({
      select: { id: true, key: true, value: true, createdAt: true, updatedAt: true },
      orderBy: { key: "asc" },
    });
  }

  async exportAll() {
    const [posts, categories, tags, pages, members, settings] = await Promise.all([
      this.exportPosts(),
      this.exportCategories(),
      this.exportTags(),
      this.exportPages(),
      this.exportMembers(),
      this.exportSettings(),
    ]);
    return {
      exportedAt: new Date().toISOString(),
      version: "1.0",
      data: { posts, categories, tags, pages, members, settings },
    };
  }
}
