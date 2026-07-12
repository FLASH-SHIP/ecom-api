import type { ContentStatus, Prisma, PrismaClient } from "@ecom/prisma";

export class PageRepository {
  private prisma: PrismaClient;
  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findMany(params: {
    search?: string;
    status?: ContentStatus;
    parentId?: number | null;
    page?: number;
    perPage?: number;
    sortBy?: string;
    sortDir?: "asc" | "desc";
    where?: Record<string, unknown>;
  }) {
    const {
      search,
      status,
      parentId,
      page = 1,
      perPage = 20,
      sortBy,
      sortDir,
      where: customWhere,
    } = params;

    const where: Record<string, unknown> = { deletedAt: null, ...customWhere };
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
      ];
    }
    if (status) where.status = status;
    if (parentId !== undefined) where.parentId = parentId;

    const orderBy: Record<string, "asc" | "desc">[] = [];
    if (sortBy) {
      orderBy.push({ [sortBy]: sortDir ?? "asc" });
    } else {
      orderBy.push({ order: "asc" }, { createdAt: "desc" });
    }

    const [data, total] = await Promise.all([
      this.prisma.page.findMany({
        where,
        select: {
          id: true,
          title: true,
          slug: true,
          template: true,
          order: true,
          status: true,
          parentId: true,
          authorId: true,
          author: { select: { id: true, name: true } },
          publishedAt: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { children: true } },
        },
        orderBy,
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      this.prisma.page.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, perPage, totalPages: Math.ceil(total / perPage) },
    };
  }

  async findById(id: number) {
    return this.prisma.page.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        slug: true,
        content: true,
        excerpt: true,
        featuredImage: true,
        template: true,
        order: true,
        parentId: true,
        status: true,
        authorId: true,
        author: { select: { id: true, name: true, email: true } },
        publishedAt: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
        bannerImage: true,
        heroBanner: true,
        layout: true,
        hideTitle: true,
        hideBreadcrumb: true,
        hideSidebar: true,
        hideFooter: true,
        gallery: true,
        subtitle: true,
        ctaText: true,
        ctaLink: true,
      },
    });
  }

  async findBySlug(slug: string) {
    return this.prisma.page.findFirst({
      where: { slug, status: "PUBLISHED", deletedAt: null },
      select: {
        id: true,
        title: true,
        slug: true,
        content: true,
        excerpt: true,
        featuredImage: true,
        template: true,
        publishedAt: true,
        seoMeta: {
          select: {
            seoTitle: true,
            seoDescription: true,
            seoImage: true,
            indexMode: true,
          },
        },
      },
    });
  }

  async create(data: {
    title: string;
    slug: string;
    content?: string;
    excerpt?: string;
    featuredImage?: string;
    template?: string;
    order?: number;
    parentId?: number;
    status?: ContentStatus;
    authorId: string;
    bannerImage?: string;
    heroBanner?: string;
    layout?: string;
    hideTitle?: boolean;
    hideBreadcrumb?: boolean;
    hideSidebar?: boolean;
    hideFooter?: boolean;
    gallery?: Prisma.InputJsonValue;
    subtitle?: string;
    ctaText?: string;
    ctaLink?: string;
  }) {
    return this.prisma.page.create({
      data,
      select: { id: true, title: true, slug: true, status: true },
    });
  }

  async update(
    id: number,
    data: {
      title?: string;
      slug?: string;
      content?: string;
      excerpt?: string;
      featuredImage?: string;
      template?: string;
      order?: number;
      parentId?: number | null;
      status?: ContentStatus;
      bannerImage?: string;
      heroBanner?: string;
      layout?: string;
      hideTitle?: boolean;
      hideBreadcrumb?: boolean;
      hideSidebar?: boolean;
      hideFooter?: boolean;
      gallery?: Prisma.InputJsonValue;
      subtitle?: string;
      ctaText?: string;
      ctaLink?: string;
      publishedAt?: Date;
    },
  ) {
    return this.prisma.page.update({
      where: { id },
      data,
      select: { id: true, title: true, slug: true, status: true },
    });
  }

  async softDelete(id: number) {
    return this.prisma.page.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async findBySlugExact(slug: string) {
    return this.prisma.page.findFirst({
      where: { slug },
      select: { id: true },
    });
  }
}
