import type { PrismaClient } from "@prisma/client";

type CommentStatus = "pending" | "approved" | "spam" | "trash";

export class CommentRepository {
  private prisma: PrismaClient;
  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findMany(options: {
    postId?: number;
    pageId?: number;
    status?: CommentStatus;
    page?: number;
    perPage?: number;
  }) {
    const { postId, pageId, status, page = 1, perPage = 20 } = options;
    const where: Record<string, unknown> = {};
    if (postId) where.postId = postId;
    if (pageId) where.pageId = pageId;
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.comment.findMany({
        where,
        select: {
          id: true,
          content: true,
          authorName: true,
          authorEmail: true,
          memberId: true,
          postId: true,
          pageId: true,
          parentId: true,
          status: true,
          ipAddress: true,
          createdAt: true,
          _count: { select: { replies: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      this.prisma.comment.count({ where }),
    ]);
    return { items, total, page, perPage };
  }

  async findById(id: number) {
    return this.prisma.comment.findUnique({
      where: { id },
      select: {
        id: true,
        content: true,
        authorName: true,
        authorEmail: true,
        memberId: true,
        postId: true,
        pageId: true,
        parentId: true,
        status: true,
        ipAddress: true,
        createdAt: true,
        replies: {
          select: {
            id: true,
            content: true,
            authorName: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });
  }

  async findThreaded(postId: number) {
    return this.prisma.comment.findMany({
      where: { postId, parentId: null, status: "approved" },
      select: {
        id: true,
        content: true,
        authorName: true,
        createdAt: true,
        replies: {
          where: { status: "approved" },
          select: {
            id: true,
            content: true,
            authorName: true,
            createdAt: true,
            replies: {
              where: { status: "approved" },
              select: {
                id: true,
                content: true,
                authorName: true,
                createdAt: true,
              },
              orderBy: { createdAt: "asc" },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(data: {
    content: string;
    authorName?: string;
    authorEmail?: string;
    memberId?: number;
    postId?: number;
    pageId?: number;
    parentId?: number;
    status?: string;
    ipAddress?: string;
  }) {
    return this.prisma.comment.create({
      data,
      select: { id: true, content: true, status: true, createdAt: true },
    });
  }

  async updateStatus(id: number, status: CommentStatus) {
    return this.prisma.comment.update({
      where: { id },
      data: { status },
      select: { id: true, status: true },
    });
  }

  async remove(id: number) {
    return this.prisma.comment.delete({ where: { id } });
  }

  async countByStatus() {
    const results = await this.prisma.comment.groupBy({
      by: ["status"],
      _count: true,
    });
    return Object.fromEntries(results.map((r) => [r.status, r._count]));
  }
}
