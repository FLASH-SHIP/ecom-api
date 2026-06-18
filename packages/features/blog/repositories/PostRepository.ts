import { normalizePagination, paginate } from "@ecom/lib/pagination";
import type { ContentStatus, PrismaClient } from "@ecom/prisma";

export class PostRepository {
  private prisma: PrismaClient;
  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findById(id: number) {
    return this.prisma.post.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        slug: true,
        content: true,
        excerpt: true,
        featuredImage: true,
        bannerImage: true,
        isFeatured: true,
        allowComments: true,
        formatType: true,
        views: true,
        status: true,
        authorId: true,
        publishedAt: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findByIdWithRelations(id: number) {
    return this.prisma.post.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        slug: true,
        content: true,
        excerpt: true,
        featuredImage: true,
        bannerImage: true,
        isFeatured: true,
        allowComments: true,
        formatType: true,
        views: true,
        status: true,
        authorId: true,
        publishedAt: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
        author: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        categories: {
          select: {
            category: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
        tags: {
          select: {
            tag: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
        translations: {
          select: {
            id: true,
            langCode: true,
            title: true,
            slug: true,
            excerpt: true,
            content: true,
          },
        },
        seoMeta: {
          select: {
            id: true,
            seoTitle: true,
            seoDescription: true,
            seoImage: true,
            indexMode: true,
          },
        },
      },
    });
  }

  async findBySlug(slug: string) {
    return this.prisma.post.findUnique({
      where: { slug, deletedAt: null },
      select: {
        id: true,
        title: true,
        slug: true,
        content: true,
        excerpt: true,
        featuredImage: true,
        bannerImage: true,
        isFeatured: true,
        views: true,
        status: true,
        authorId: true,
        publishedAt: true,
        createdAt: true,
        author: {
          select: { id: true, name: true, avatarUrl: true },
        },
        categories: {
          select: {
            category: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
        tags: {
          select: {
            tag: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
      },
    });
  }

  async findMany(options: {
    status?: ContentStatus;
    authorId?: number;
    categoryId?: number;
    isFeatured?: boolean;
    search?: string;
    includeDeleted?: boolean;
    page?: number;
    perPage?: number;
    sortBy?: "createdAt" | "title" | "publishedAt" | "views";
    sortOrder?: "asc" | "desc";
  }) {
    const {
      status,
      authorId,
      categoryId,
      isFeatured,
      search,
      includeDeleted = false,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = options;

    const { page, perPage, skip } = normalizePagination(options);

    const where = {
      ...(!includeDeleted && { deletedAt: null }),
      ...(status && { status }),
      ...(authorId && { authorId }),
      ...(isFeatured !== undefined && { isFeatured }),
      ...(categoryId && {
        categories: { some: { categoryId } },
      }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: "insensitive" as const } },
          { excerpt: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          featuredImage: true,
          isFeatured: true,
          views: true,
          status: true,
          authorId: true,
          publishedAt: true,
          deletedAt: true,
          createdAt: true,
          author: {
            select: { id: true, name: true, avatarUrl: true },
          },
          categories: {
            select: {
              category: {
                select: { id: true, name: true, slug: true },
              },
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: perPage,
      }),
      this.prisma.post.count({ where }),
    ]);

    return paginate(items, total, page, perPage);
  }

  async create(data: {
    title: string;
    slug: string;
    content?: string;
    excerpt?: string;
    featuredImage?: string;
    bannerImage?: string;
    isFeatured?: boolean;
    allowComments?: boolean;
    formatType?: string;
    status?: ContentStatus;
    authorId: number;
    publishedAt?: Date;
    categoryIds?: number[];
    tagIds?: number[];
  }) {
    const { categoryIds, tagIds, ...postData } = data;

    return this.prisma.post.create({
      data: {
        ...postData,
        ...(categoryIds?.length && {
          categories: {
            create: categoryIds.map((categoryId) => ({ categoryId })),
          },
        }),
        ...(tagIds?.length && {
          tags: {
            create: tagIds.map((tagId) => ({ tagId })),
          },
        }),
      },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        createdAt: true,
      },
    });
  }

  async update(
    id: number,
    data: {
      title?: string;
      slug?: string;
      content?: string;
      excerpt?: string;
      featuredImage?: string | null;
      bannerImage?: string | null;
      isFeatured?: boolean;
      allowComments?: boolean;
      formatType?: string | null;
      status?: ContentStatus;
      publishedAt?: Date | null;
    },
  ) {
    return this.prisma.post.update({
      where: { id },
      data,
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        updatedAt: true,
      },
    });
  }

  async updateCategories(postId: number, categoryIds: number[]) {
    await this.prisma.$transaction([
      this.prisma.postCategory.deleteMany({ where: { postId } }),
      ...categoryIds.map((categoryId) =>
        this.prisma.postCategory.create({
          data: { postId, categoryId },
        }),
      ),
    ]);
  }

  async updateTags(postId: number, tagIds: number[]) {
    await this.prisma.$transaction([
      this.prisma.postTag.deleteMany({ where: { postId } }),
      ...tagIds.map((tagId) =>
        this.prisma.postTag.create({
          data: { postId, tagId },
        }),
      ),
    ]);
  }

  async incrementViews(id: number) {
    return this.prisma.post.update({
      where: { id },
      data: { views: { increment: 1 } },
      select: { id: true, views: true },
    });
  }

  async softDelete(id: number) {
    return this.prisma.post.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true, deletedAt: true },
    });
  }

  async restore(id: number) {
    return this.prisma.post.update({
      where: { id },
      data: { deletedAt: null },
      select: { id: true, deletedAt: true },
    });
  }

  async hardDelete(id: number) {
    return this.prisma.post.delete({
      where: { id },
      select: { id: true },
    });
  }
}
