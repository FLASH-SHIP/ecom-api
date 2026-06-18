import type { PrismaClient } from "@ecom/prisma";

export class RevisionRepository {
  private prisma: PrismaClient;
  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async create(data: {
    referenceId: number;
    referenceType: string;
    title: string;
    content?: string;
    authorId: number;
    note?: string;
  }) {
    return this.prisma.revision.create({
      data,
      select: {
        id: true,
        referenceId: true,
        referenceType: true,
        title: true,
        note: true,
        authorId: true,
        createdAt: true,
      },
    });
  }

  async findByReference(referenceId: number, referenceType: string) {
    return this.prisma.revision.findMany({
      where: { referenceId, referenceType },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        note: true,
        author: { select: { id: true, name: true } },
        createdAt: true,
      },
      take: 50,
    });
  }

  async findById(id: number) {
    return this.prisma.revision.findUnique({
      where: { id },
      select: {
        id: true,
        referenceId: true,
        referenceType: true,
        title: true,
        content: true,
        note: true,
        author: { select: { id: true, name: true } },
        createdAt: true,
      },
    });
  }

  async deleteOldRevisions(referenceId: number, referenceType: string, keepCount: number) {
    const revisions = await this.prisma.revision.findMany({
      where: { referenceId, referenceType },
      orderBy: { createdAt: "desc" },
      select: { id: true },
      skip: keepCount,
    });

    if (revisions.length === 0) return 0;

    const { count } = await this.prisma.revision.deleteMany({
      where: { id: { in: revisions.map((r) => r.id) } },
    });

    return count;
  }
}
